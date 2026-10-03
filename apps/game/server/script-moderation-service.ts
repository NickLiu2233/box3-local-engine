import { createHash, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { z } from 'zod'
import type { PoolClient } from 'pg'
import {
  scriptModerationStore,
  mapIdSchema,
  scriptFingerprintSchema,
  canonicalModerationIP,
} from './script-moderation-store'
import { normalizePlayerAdminCapabilities } from '../shared/player-admin-policy'
import { PlayerAdminRequestError } from './player-admin-errors'
import {
  checkPlayerDatabaseReady,
  consumePersistentAuthRateLimit,
  createIdentityBan,
  revokeIdentityBan,
  updateManagedPlayer,
  type AdminActionContext,
} from './local-player-identity'

export const moderationCommandSchema = z
  .object({
    mapId: mapIdSchema,
    scriptFingerprint: scriptFingerprintSchema,
    action: z.enum(['banPlayer', 'banCurrentIP', 'revokeBan', 'getPlayerStatus']),
    userId: z.string().max(128).optional(),
    ipAddress: z.string().max(64).optional(),
    scope: z.enum(['map', 'server']).default('map'),
    durationSeconds: z.number().int().min(1).max(604800).optional(),
    reason: z.string().trim().min(1).max(500).optional(),
    banId: z.string().uuid().optional(),
    requestId: z
      .string()
      .regex(/^[A-Za-z0-9._-]{1,80}$/)
      .optional(),
  })
  .strict()
type Command = z.infer<typeof moderationCommandSchema>
type Grant = {
  id: string
  admin_id: string | null
  actor_id: string
  created_by: string
  name: string
  scope: string
  maximum_ban_seconds: number
  permissions: string[]
  display_name: string
}
type Ban = {
  id: string
  key_id: string
  map_id: string
  subject_id: string
  kind: string
  scope: string
  reference_id: string | null
  effect_marker: string | null
}

/** 业务事务复用后台处罚函数；脚本不接触 Key，独立授权权限每次调用都重新读取。 */
export class ScriptModerationService {
  private hashIP(value: string): string {
    return scriptModerationStore.hashIP(value)
  }
  private async grant(
    client: PoolClient,
    table: (name: string) => string,
    input: Command,
    lock: boolean,
  ): Promise<Grant> {
    const result = await client.query<Grant>(
      `SELECT k.*,k.name AS display_name,k.created_by AS actor_id FROM ${table('script_admin_bindings')} b
      JOIN ${table('script_admin_keys')} k ON k.id=b.key_id
      WHERE b.map_id=$1 AND b.script_fingerprint=$2 AND k.revoked_at IS NULL AND k.expires_at>NOW()
      ${lock ? 'FOR SHARE OF b,k' : ''}`,
      [input.mapId, input.scriptFingerprint],
    )
    const grant = result.rows[0]
    if (!grant) throw new PlayerAdminRequestError('地图未授权、脚本已改变或 Key 已失效', 403)
    if (grant.admin_id) {
      const legacy = await client.query(
        `SELECT a.display_name,g.permissions FROM ${table('admin_accounts')} a
        JOIN ${table('admin_permission_groups')} g ON g.id=a.permission_group_id WHERE a.id=$1 AND a.status='active'
        ${lock ? 'FOR SHARE OF a,g' : ''}`,
        [grant.admin_id],
      )
      if (!legacy.rows[0]) throw new PlayerAdminRequestError('旧版账号授权已失效，请由服主重新创建 Key', 403)
      grant.permissions = legacy.rows[0].permissions
      grant.display_name = legacy.rows[0].display_name
      grant.actor_id = grant.admin_id
    }
    return grant
  }
  private permission(grant: Grant, action: string, kind?: string): void {
    const required =
      action === 'getPlayerStatus'
        ? 'players.view'
        : action === 'banCurrentIP' || kind === 'ip'
          ? 'identity-bans.manage'
          : 'players.ban'
    if (!normalizePlayerAdminCapabilities(grant.permissions).includes(required))
      throw new PlayerAdminRequestError('Key 不允许此操作', 403)
  }
  private async limit(mapId: string, keyId?: string): Promise<void> {
    const limits: Array<[string, string, number]> = keyId
      ? [['script-moderation-key', keyId, 60]]
      : [['script-moderation-map', mapId, 20]]
    for (const [scope, key, max] of limits) {
      const result = await consumePersistentAuthRateLimit(scope, key, max, 60000)
      if (!result) throw new PlayerAdminRequestError('限流服务不可用', 503)
      if (!result.allowed)
        throw new PlayerAdminRequestError('脚本管理操作过于频繁', 429, 'SCRIPT_RATE_LIMITED', result.retryAfterSeconds)
    }
  }
  async execute(raw: unknown, hostContext: AdminActionContext) {
    const input = moderationCommandSchema.parse(raw)
    await checkPlayerDatabaseReady()
    const { pool, table } = await scriptModerationStore.ready()
    const client = await pool.connect()
    try {
      await this.limit(input.mapId)
      const preliminary = await this.grant(client, table, input, false)
      await this.limit(input.mapId, preliminary.id)
      await client.query('BEGIN')
      await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='8s'")
      const grant = await this.grant(client, table, input, true)
      // Re-check live permissions even for an idempotent replay.
      if (input.action === 'revokeBan') {
        const previous = await client.query<Ban>(
          `SELECT * FROM ${table('script_moderation_bans')} WHERE id=$1 AND key_id=$2 AND map_id=$3`,
          [input.banId || null, grant.id, input.mapId],
        )
        if (!previous.rows[0]) throw new PlayerAdminRequestError('处罚记录无权访问', 403)
        this.permission(grant, input.action, previous.rows[0].kind)
        if (previous.rows[0].scope === 'server' && grant.scope !== 'server')
          throw new PlayerAdminRequestError('Key 未授权全服处罚', 403)
      } else this.permission(grant, input.action)
      if (input.scope === 'server' && grant.scope !== 'server')
        throw new PlayerAdminRequestError('Key 未授权全服处罚', 403)
      const context: AdminActionContext = {
        ...hostContext,
        actor: `script-key:${grant.id}`,
        actorDisplayName: `${grant.display_name} / 地图 ${input.mapId}`,
        actorRole: 'moderator',
        actorPermissions: normalizePlayerAdminCapabilities(grant.permissions),
      }
      const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
      if (input.action !== 'getPlayerStatus') {
        if (!input.requestId || !input.reason)
          throw new PlayerAdminRequestError('写操作须提供 requestId 和处罚/解除原因')
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
          `${grant.id}:${input.mapId}:${input.requestId}`,
        ])
        const replay = await client.query(
          `SELECT body_hash,result FROM ${table('script_moderation_requests')} WHERE key_id=$1 AND map_id=$2 AND request_id=$3`,
          [grant.id, input.mapId, input.requestId],
        )
        if (replay.rows[0]) {
          if (replay.rows[0].body_hash !== hash) throw new PlayerAdminRequestError('requestId 已用于不同操作', 409)
          await client.query('COMMIT')
          return { ...replay.rows[0].result, replayed: true }
        }
      }
      const result =
        input.action === 'revokeBan'
          ? await this.revoke(client, table, input, grant, context)
          : await this.apply(client, table, input, grant, context)
      if (input.action !== 'getPlayerStatus') {
        await client.query(
          `INSERT INTO ${table('script_moderation_requests')}(key_id,map_id,request_id,body_hash,result) VALUES($1,$2,$3,$4,$5::jsonb)`,
          [grant.id, input.mapId, input.requestId, hash, JSON.stringify(result)],
        )
        await client.query(
          `INSERT INTO ${table('admin_audit_events')}(actor_id,action,target_id,details,ip_address)
          VALUES($1,$2,$3,$4::jsonb,$5)`,
          [
            grant.actor_id,
            `script.${input.action}`,
            input.mapId,
            JSON.stringify({
              keyId: grant.id,
              scriptFingerprint: input.scriptFingerprint,
              requestId: input.requestId,
              reason: input.reason,
              result,
            }),
            hostContext.ip,
          ],
        )
      }
      await client.query('COMMIT')
      return { ...result, replayed: false }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  private async target(client: PoolClient, table: (name: string) => string, userId?: string) {
    if (!userId) throw new PlayerAdminRequestError('目标玩家无效')
    const result = await client.query<{ principal_id: string; role: string; status: string; effect_marker: string }>(
      `SELECT principal_id,role,status,updated_at::text AS effect_marker FROM ${table('users')} WHERE id::text=$1 FOR UPDATE`,
      [userId],
    )
    if (!result.rows[0]) throw new PlayerAdminRequestError('玩家不存在', 404)
    if (result.rows[0].role !== 'player') throw new PlayerAdminRequestError('脚本不能操作受保护的管理身份', 403)
    return result.rows[0]
  }
  private async apply(
    client: PoolClient,
    table: (name: string) => string,
    input: Command,
    grant: Grant,
    context: AdminActionContext,
  ) {
    this.permission(grant, input.action)
    const target = await this.target(client, table, input.userId)
    if (input.action === 'getPlayerStatus') {
      const bans = await client.query(
        `SELECT id,kind,scope,reason,expires_at AS "expiresAt" FROM ${table('script_moderation_bans')} WHERE subject_id=$1 AND map_id=$2 AND revoked_at IS NULL AND expires_at>NOW() ORDER BY created_at DESC LIMIT 50`,
        [target.principal_id, input.mapId],
      )
      return { status: target.status, bans: bans.rows }
    }
    if (input.scope === 'server' && grant.scope !== 'server')
      throw new PlayerAdminRequestError('Key 未授权全服处罚', 403)
    if (!input.durationSeconds || input.durationSeconds > grant.maximum_ban_seconds)
      throw new PlayerAdminRequestError('处罚期限超过授权上限')
    const expiry = new Date(Date.now() + input.durationSeconds * 1000)
    const kind = input.action === 'banCurrentIP' ? 'ip' : 'account'
    const ip = canonicalModerationIP(String(input.ipAddress || ''))
    if (kind === 'ip' && (!isIP(ip) || ip.startsWith('127.') || ['::1', '0.0.0.0', '::'].includes(ip)))
      throw new PlayerAdminRequestError('不能封禁无效地址或本机管理地址')
    if (kind === 'ip') {
      const protectedSession = await client.query(
        `SELECT 1 FROM ${table('admin_sessions')} WHERE expires_at>NOW() AND absolute_expires_at>NOW() AND (created_ip=$1 OR last_seen_ip=$1) LIMIT 1`,
        [ip],
      )
      if (protectedSession.rowCount) throw new PlayerAdminRequestError('该 IP 正用于管理会话，需由管理员人工复核', 403)
    }
    let reference: string | null = null
    let marker: string | null = null
    const ipHash = kind === 'ip' ? this.hashIP(ip) : null
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      `${input.mapId}:${input.scope}:${kind}:${ipHash || target.principal_id}`,
    ])
    const duplicate = await client.query(
      `SELECT 1 FROM ${table('script_moderation_bans')} WHERE map_id=$1 AND scope=$2 AND kind=$3 AND revoked_at IS NULL AND expires_at>NOW() AND (($3='account' AND subject_id=$4) OR ($3='ip' AND ip_hash=$5)) LIMIT 1`,
      [input.mapId, input.scope, kind, target.principal_id, ipHash],
    )
    if (duplicate.rowCount) throw new PlayerAdminRequestError('已存在对应处罚，请复核或使用原 requestId 重试', 409)
    if (input.scope === 'server') {
      if (kind === 'account') {
        if (target.status !== 'active') throw new PlayerAdminRequestError('已有账号处罚，须管理员人工复核', 409)
        await updateManagedPlayer(
          target.principal_id,
          { status: 'banned', banReason: input.reason, bannedUntil: expiry.toISOString() },
          context,
          client,
        )
        marker = (
          await client.query(`SELECT updated_at::text AS value FROM ${table('users')} WHERE principal_id=$1`, [
            target.principal_id,
          ])
        ).rows[0].value
      } else {
        reference = (
          await createIdentityBan(
            target.principal_id,
            { kind: 'ip', value: ip, reason: input.reason, bannedUntil: expiry.toISOString() },
            context,
            client,
          )
        ).id
      }
    }
    const id = randomUUID()
    await client.query(
      `INSERT INTO ${table('script_moderation_bans')}(id,key_id,map_id,subject_id,kind,scope,ip_hash,reference_id,effect_marker,reason,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        grant.id,
        input.mapId,
        target.principal_id,
        kind,
        input.scope,
        ipHash,
        reference,
        marker,
        input.reason,
        expiry,
      ],
    )
    return { id, scope: input.scope, expiresAt: expiry.toISOString() }
  }
  private async revoke(
    client: PoolClient,
    table: (name: string) => string,
    input: Command,
    grant: Grant,
    context: AdminActionContext,
  ) {
    if (!input.banId) throw new PlayerAdminRequestError('封禁记录无效')
    const result = await client.query<Ban>(
      `SELECT * FROM ${table('script_moderation_bans')} WHERE id=$1 AND key_id=$2 AND map_id=$3 AND revoked_at IS NULL FOR UPDATE`,
      [input.banId, grant.id, input.mapId],
    )
    const ban = result.rows[0]
    if (!ban) throw new PlayerAdminRequestError('只能解除当前 Key 在本图创建的处罚', 403)
    this.permission(grant, input.action, ban.kind)
    if (ban.scope === 'server') {
      if (ban.kind === 'account') {
        const state = await client.query(
          `SELECT updated_at::text AS marker,status FROM ${table('users')} WHERE principal_id=$1 FOR UPDATE`,
          [ban.subject_id],
        )
        if (state.rows[0]?.marker !== ban.effect_marker || state.rows[0]?.status !== 'banned')
          throw new PlayerAdminRequestError('处罚已被管理员调整，请人工复核', 409)
        await updateManagedPlayer(
          ban.subject_id,
          { status: 'active', banReason: '', bannedUntil: null },
          context,
          client,
        )
      } else await revokeIdentityBan(ban.subject_id, ban.reference_id, context, client)
    }
    await client.query(`UPDATE ${table('script_moderation_bans')} SET revoked_at=NOW() WHERE id=$1`, [ban.id])
    return { revoked: true, id: ban.id }
  }
  async admission(mapId: string, userId: string, ip: string) {
    const denied = await this.deniedPlayers(mapId, [{ userId, ipAddress: ip }])
    return { allowed: denied.length === 0 }
  }
  async deniedPlayers(mapId: string, players: Array<{ userId: string; ipAddress: string }>) {
    const map = mapIdSchema.parse(mapId)
    await checkPlayerDatabaseReady()
    const { pool, table } = await scriptModerationStore.ready()
    const result = await pool.query<{ index: number }>(
      `SELECT DISTINCT p.index FROM jsonb_to_recordset($2::jsonb) AS p(index integer, "userId" text, "ipHash" text)
      JOIN ${table('script_moderation_bans')} b ON TRUE LEFT JOIN ${table('users')} u ON u.principal_id=b.subject_id
      WHERE b.map_id=$1 AND b.scope='map' AND b.revoked_at IS NULL AND b.expires_at>NOW()
      AND ((b.kind='account' AND u.id::text=p."userId") OR (b.kind='ip' AND b.ip_hash=p."ipHash"))`,
      [map, JSON.stringify(players.map((p, index) => ({ index, userId: p.userId, ipHash: this.hashIP(p.ipAddress) })))],
    )
    return result.rows.map((row) => row.index)
  }
}
export const scriptModerationService = new ScriptModerationService()
