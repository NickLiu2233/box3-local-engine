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
    adminId: z.string().uuid(),
    name: z.string().trim().min(1).max(64),
    scope: z.enum(['map', 'server']).default('map'),
    maximumBanSeconds: z.number().int().min(60).max(604800).default(3600),
    expiresAt: z.string().datetime(),
  })
  .strict()
export const bindingSchema = z
  .object({
    mapId: mapIdSchema,
    keyId: z.string().uuid(),
    scriptFingerprint: scriptFingerprintSchema,
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
    const keys = await pool.query(`SELECT k.id, k.admin_id AS "adminId", a.display_name AS "adminName", k.name,
      k.scope, k.maximum_ban_seconds AS "maximumBanSeconds", k.expires_at AS "expiresAt", k.revoked_at AS "revokedAt"
      FROM ${table('script_admin_keys')} k JOIN ${table('admin_accounts')} a ON a.id=k.admin_id ORDER BY k.created_at DESC LIMIT 200`)
    const bindings = await pool.query(
      `SELECT map_id AS "mapId", key_id AS "keyId", script_fingerprint AS "scriptFingerprint" FROM ${table('script_admin_bindings')} ORDER BY updated_at DESC LIMIT 200`,
    )
    const bans =
      await pool.query(`SELECT id,map_id AS "mapId",subject_id AS "subjectId",kind,reason,expires_at AS "expiresAt"
      FROM ${table('script_moderation_bans')} WHERE scope='map' AND revoked_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC LIMIT 200`)
    return { keys: keys.rows, bindings: bindings.rows, bans: bans.rows }
  }
  async create(raw: unknown, actor: string) {
    const input = keyCreateSchema.parse(raw)
    const expiry = new Date(input.expiresAt)
    if (expiry.getTime() <= Date.now() || expiry.getTime() > Date.now() + 30 * 86400000)
      throw new PlayerAdminRequestError('Key 有效期须在未来 30 天内')
    return this.mutate(async (client, table) => {
      const id = randomUUID()
      const created = await client.query(
        `INSERT INTO ${table('script_admin_keys')}
      (id,admin_id,name,scope,maximum_ban_seconds,expires_at,created_by)
      SELECT $1,a.id,$3,$4,$5,$6,$7 FROM ${table('admin_accounts')} a
      JOIN ${table('admin_permission_groups')} g ON g.id=a.permission_group_id
      WHERE a.id=$2 AND a.status='active' RETURNING id`,
        [id, input.adminId, input.name, input.scope, input.maximumBanSeconds, expiry, actor],
      )
      if (!created.rowCount) throw new PlayerAdminRequestError('请选择已启用且分配权限组的管理员')
      await this.audit(client, table, 'script.key.create', id, actor, input)
      return { id }
    })
  }
  async bind(raw: unknown, actor: string) {
    const input = bindingSchema.parse(raw)
    return this.mutate(async (client, table) => {
      const result = await client.query(
        `INSERT INTO ${table('script_admin_bindings')}(map_id,key_id,script_fingerprint,updated_by)
      SELECT $1,k.id,$3,$4 FROM ${table('script_admin_keys')} k JOIN ${table('admin_accounts')} a ON a.id=k.admin_id
      JOIN ${table('admin_permission_groups')} g ON g.id=a.permission_group_id
      WHERE k.id=$2 AND k.revoked_at IS NULL AND k.expires_at>NOW() AND a.status='active'
      ON CONFLICT(map_id) DO UPDATE SET key_id=EXCLUDED.key_id,script_fingerprint=EXCLUDED.script_fingerprint,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING map_id`,
        [input.mapId, input.keyId, input.scriptFingerprint, actor],
      )
      if (!result.rowCount) throw new PlayerAdminRequestError('Key 无效、已撤销或过期')
      await this.audit(client, table, 'script.binding.save', input.mapId, actor, input)
      return { saved: true }
    })
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
