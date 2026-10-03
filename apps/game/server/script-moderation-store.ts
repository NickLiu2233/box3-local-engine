import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { z } from 'zod'
import type { PoolClient } from 'pg'
import { playerAdminStore } from './player-admin-identity'
import { PlayerAdminRequestError } from './player-admin-errors'

// Match the launcher's immutable map identity, not its editable access URL.
export const mapIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/)
export const scriptFingerprintSchema = z.string().regex(/^[a-f0-9]{64}$/)
export function canonicalModerationIP(value: string): string {
  const address = value.trim().toLowerCase()
  if (isIP(address) === 4) return address
  if (isIP(address) !== 6) return ''
  try {
    const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1)
    const mapped = canonical.match(/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/)
    if (!mapped) return canonical
    const high = parseInt(mapped[1], 16),
      low = parseInt(mapped[2], 16)
    return [high >> 8, high & 255, low >> 8, low & 255].join('.')
  } catch {
    return ''
  }
}
export const keyCreateSchema = z
  .object({
    mapId: mapIdSchema,
    expectedFingerprint: scriptFingerprintSchema,
    name: z.string().trim().min(1).max(64).optional(),
    permissions: z
      .array(z.enum(['players.view', 'players.ban', 'identity-bans.manage']))
      .min(1)
      .max(3)
      .default(['players.view', 'players.ban']),
    scope: z.enum(['map', 'server']).default('map'),
    maximumBanSeconds: z.number().int().min(60).max(604800).default(3600),
    expiresAt: z.string().datetime().optional(),
  })
  .strict()
export const bindingSchema = z
  .object({
    mapId: mapIdSchema,
    keyId: z.string().uuid(),
    expectedFingerprint: scriptFingerprintSchema,
  })
  .strict()

/** 授权记录只存在于身份服务，不写入地图工程、运行清单或脚本资源。 */
export class ScriptModerationStore {
  private initialized?: Promise<void>
  private ipHashSalt = ''
  hashIP(value: string): string {
    if (!this.ipHashSalt) throw new PlayerAdminRequestError('地图封禁存储未就绪', 503)
    return createHmac('sha256', this.ipHashSalt).update(canonicalModerationIP(value)).digest('hex')
  }
  async ready() {
    const storage = await playerAdminStore()
    if (!this.initialized)
      this.initialized = this.initialize(storage).catch((error) => {
        this.initialized = undefined
        throw error
      })
    await this.initialized
    return storage
  }
  private async initialize({ pool, table }: Awaited<ReturnType<typeof playerAdminStore>>) {
    // Persist the salt so rotating internal transport credentials cannot silently clear IP bans.
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${table('script_moderation_secrets')} (name TEXT PRIMARY KEY, secret TEXT NOT NULL)`,
    )
    await pool.query(
      `INSERT INTO ${table('script_moderation_secrets')}(name,secret) VALUES('ip-hash-salt',$1) ON CONFLICT(name) DO NOTHING`,
      [randomBytes(32).toString('hex')],
    )
    this.ipHashSalt = (
      await pool.query(`SELECT secret FROM ${table('script_moderation_secrets')} WHERE name='ip-hash-salt'`)
    ).rows[0].secret
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table('script_admin_keys')} (
      id UUID PRIMARY KEY, admin_id UUID NOT NULL REFERENCES ${table('admin_accounts')}(id) ON DELETE CASCADE,
      name TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('map','server')),
      maximum_ban_seconds INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by TEXT NOT NULL
    )`)
    // Keep legacy account-bound grants restricted until owners explicitly replace them.
    await pool.query(`ALTER TABLE ${table('script_admin_keys')} ALTER COLUMN admin_id DROP NOT NULL`)
    await pool.query(`ALTER TABLE ${table('script_admin_keys')} ADD COLUMN IF NOT EXISTS permissions TEXT[]`)
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table('script_runtime_metadata')} (
      map_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('edit','play')), name TEXT NOT NULL,
      fingerprint TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(map_id,mode)
    )`)
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table('script_admin_bindings')} (
      map_id TEXT PRIMARY KEY, key_id UUID NOT NULL REFERENCES ${table('script_admin_keys')}(id) ON DELETE CASCADE,
      script_fingerprint TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by TEXT NOT NULL
    )`)
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table('script_moderation_bans')} (
      id UUID PRIMARY KEY, key_id UUID REFERENCES ${table('script_admin_keys')}(id) ON DELETE SET NULL,
      map_id TEXT NOT NULL, subject_id UUID NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('account','ip')),
      scope TEXT NOT NULL, ip_hash TEXT, reference_id TEXT, effect_marker TEXT,
      reason TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS script_bans_map_active ON ${table('script_moderation_bans')}(map_id, expires_at) WHERE revoked_at IS NULL`,
    )
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table('script_moderation_requests')} (
      key_id UUID NOT NULL REFERENCES ${table('script_admin_keys')}(id) ON DELETE CASCADE,
      map_id TEXT NOT NULL, request_id TEXT NOT NULL, body_hash TEXT NOT NULL,
      result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(key_id,map_id,request_id)
    )`)
  }
  async list() {
    const { pool, table } = await this.ready()
    const keys =
      await pool.query(`SELECT k.id, k.admin_id AS "adminId", a.display_name AS "adminName", k.name,k.permissions,
      k.scope, k.maximum_ban_seconds AS "maximumBanSeconds", k.expires_at AS "expiresAt", k.revoked_at AS "revokedAt"
      FROM ${table('script_admin_keys')} k LEFT JOIN ${table('admin_accounts')} a ON a.id=k.admin_id ORDER BY k.created_at DESC LIMIT 200`)
    const maps =
      await pool.query(`SELECT DISTINCT ON(map_id) map_id AS "mapId",name,fingerprint AS "scriptFingerprint",mode,observed_at AS "observedAt"
      FROM ${table('script_runtime_metadata')} WHERE observed_at>NOW()-INTERVAL '10 minutes'
      ORDER BY map_id,(mode='play') DESC,observed_at DESC LIMIT 200`)
    const bindings = await pool.query(
      `SELECT map_id AS "mapId", key_id AS "keyId", script_fingerprint AS "scriptFingerprint" FROM ${table('script_admin_bindings')} ORDER BY updated_at DESC LIMIT 200`,
    )
    const bans =
      await pool.query(`SELECT id,map_id AS "mapId",subject_id AS "subjectId",kind,reason,expires_at AS "expiresAt"
      FROM ${table('script_moderation_bans')} WHERE scope='map' AND revoked_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC LIMIT 200`)
    return { keys: keys.rows, bindings: bindings.rows, bans: bans.rows, maps: maps.rows }
  }
  async create(raw: unknown, actor: string) {
    const input = keyCreateSchema.parse(raw)
    const expiry = new Date(input.expiresAt || Date.now() + 7 * 86400000)
    if (expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 30 * 86400000)
      throw new PlayerAdminRequestError('Key 有效期须在未来 30 天内')
    return this.mutate(async (client, table) => {
      const id = randomUUID()
      const metadata = await this.latestMetadata(client, table, input.mapId, input.expectedFingerprint)
      await client.query(
        `INSERT INTO ${table('script_admin_keys')}
      (id,admin_id,name,scope,maximum_ban_seconds,expires_at,created_by,permissions)
      VALUES($1,NULL,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          input.name || metadata.name,
          input.scope,
          input.maximumBanSeconds,
          expiry,
          actor,
          [...new Set(input.permissions)],
        ],
      )
      await this.saveBinding(client, table, input.mapId, id, metadata.fingerprint, actor)
      await this.audit(client, table, 'script.key.create', id, actor, input)
      return { id }
    })
  }
  async bind(raw: unknown, actor: string) {
    const input = bindingSchema.parse(raw)
    return this.mutate(async (client, table) => {
      const metadata = await this.latestMetadata(client, table, input.mapId, input.expectedFingerprint)
      await this.saveBinding(client, table, input.mapId, input.keyId, metadata.fingerprint, actor)
      await this.audit(client, table, 'script.binding.save', input.mapId, actor, input)
      return { saved: true }
    })
  }
  private async latestMetadata(client: PoolClient, table: (name: string) => string, mapId: string, expected: string) {
    const result = await client.query<{ name: string; fingerprint: string }>(
      `SELECT name,fingerprint FROM ${table('script_runtime_metadata')}
      WHERE map_id=$1 AND observed_at>NOW()-INTERVAL '10 minutes' ORDER BY (mode='play') DESC,observed_at DESC LIMIT 1 FOR SHARE`,
      [mapId],
    )
    if (!result.rows[0]) throw new PlayerAdminRequestError('暂未读取到地图版本，请先启动地图再刷新', 409)
    if (result.rows[0].fingerprint !== expected)
      throw new PlayerAdminRequestError('地图版本已变化，请刷新并确认最新版本', 409)
    return result.rows[0]
  }
  private async saveBinding(
    client: PoolClient,
    table: (name: string) => string,
    mapId: string,
    keyId: string,
    fingerprint: string,
    actor: string,
  ) {
    const result = await client.query(
      `INSERT INTO ${table('script_admin_bindings')}(map_id,key_id,script_fingerprint,updated_by)
      SELECT $1,k.id,$3,$4 FROM ${table('script_admin_keys')} k WHERE k.id=$2 AND k.admin_id IS NULL AND k.revoked_at IS NULL AND k.expires_at>NOW()
      ON CONFLICT(map_id) DO UPDATE SET key_id=EXCLUDED.key_id,script_fingerprint=EXCLUDED.script_fingerprint,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING map_id`,
      [mapId, keyId, fingerprint, actor],
    )
    if (!result.rowCount) throw new PlayerAdminRequestError('Key 已失效或为旧版账号授权，请重新创建', 409)
  }
  async observeRuntime(raw: unknown) {
    const input = z
      .object({
        mapId: mapIdSchema,
        mode: z.enum(['edit', 'play']),
        name: z.string().trim().min(1).max(64),
        scriptFingerprint: scriptFingerprintSchema,
      })
      .strict()
      .parse(raw)
    const { pool, table } = await this.ready()
    await pool.query(
      `INSERT INTO ${table('script_runtime_metadata')}(map_id,mode,name,fingerprint) VALUES($1,$2,$3,$4)
      ON CONFLICT(map_id,mode) DO UPDATE SET name=EXCLUDED.name,fingerprint=EXCLUDED.fingerprint,observed_at=NOW()`,
      [input.mapId, input.mode, input.name, input.scriptFingerprint],
    )
    return { observed: true }
  }
  async revoke(keyId: string, actor: string) {
    z.string().uuid().parse(keyId)
    return this.mutate(async (client, table) => {
      const result = await client.query(
        `UPDATE ${table('script_admin_keys')} SET revoked_at=NOW() WHERE id=$1 AND revoked_at IS NULL`,
        [keyId],
      )
      if (result.rowCount) await this.audit(client, table, 'script.key.revoke', keyId, actor, {})
      return { revoked: true }
    })
  }
  async updateAuthorization(raw: unknown, actor: string) {
    const input = bindingSchema
      .extend({ days: z.number().int().min(1).max(30).default(7) })
      .strict()
      .parse(raw)
    return this.mutate(async (client, table) => {
      const metadata = await this.latestMetadata(client, table, input.mapId, input.expectedFingerprint)
      const renewed = await client.query(
        `UPDATE ${table('script_admin_keys')} SET expires_at=NOW()+($2*INTERVAL '1 day')
        WHERE id=$1 AND admin_id IS NULL AND revoked_at IS NULL RETURNING id`,
        [input.keyId, input.days],
      )
      if (!renewed.rowCount) throw new PlayerAdminRequestError('Key 已撤销或属于旧版账号授权，请重新创建', 409)
      await this.saveBinding(client, table, input.mapId, input.keyId, metadata.fingerprint, actor)
      await this.audit(client, table, 'script.authorization.update', input.mapId, actor, input)
      return { updated: true }
    })
  }
  async unbind(mapId: string, actor: string) {
    const id = mapIdSchema.parse(mapId)
    return this.mutate(async (client, table) => {
      const result = await client.query(`DELETE FROM ${table('script_admin_bindings')} WHERE map_id=$1`, [id])
      if (result.rowCount) await this.audit(client, table, 'script.binding.delete', id, actor, {})
      return { removed: true }
    })
  }
  async revokeMapBan(banId: string, actor: string) {
    z.string().uuid().parse(banId)
    return this.mutate(async (client, table) => {
      const result = await client.query(
        `UPDATE ${table('script_moderation_bans')} SET revoked_at=NOW() WHERE id=$1 AND scope='map' AND revoked_at IS NULL RETURNING id`,
        [banId],
      )
      if (!result.rowCount) throw new PlayerAdminRequestError('地图封禁不存在或已解除', 404)
      await this.audit(client, table, 'script.map-ban.revoke', banId, actor, {})
      return { revoked: true }
    })
  }
  private async mutate<T>(operation: (client: PoolClient, table: (name: string) => string) => Promise<T>): Promise<T> {
    const { pool, table } = await this.ready()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='8s'")
      const result = await operation(client, table)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  private async audit(
    client: PoolClient,
    table: (name: string) => string,
    action: string,
    target: string,
    actor: string,
    details: unknown,
  ) {
    await client.query(
      `INSERT INTO ${table('admin_audit_events')}(actor_id,action,target_id,details)
      VALUES($1,$2,$3,$4::jsonb)`,
      [actor, action, target, JSON.stringify(details)],
    )
  }
}
export const scriptModerationStore = new ScriptModerationStore()
