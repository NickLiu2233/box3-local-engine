import assert from 'node:assert/strict'
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  createPlayerAdminAccount,
  createPlayerAdminPermissionGroup,
  updatePlayerAdminAccount,
  loginPlayerAdmin,
  resolvePlayerAdminSession,
  playerAdminStore,
  type PlayerAdminIdentity,
} from '../server/player-admin-identity'
import { checkPlayerDatabaseReady, createManagedPlayer } from '../server/local-player-identity'
import { scriptModerationStore as store, canonicalModerationIP } from '../server/script-moderation-store'
import { scriptModerationService as moderation } from '../server/script-moderation-service'
import internalHandler from '../pages/api/player-internal/script-moderation'
import ownerHandler from '../pages/api/play-admin/script-moderation'

// Deliberately refuse production URLs. Run against a disposable local PostgreSQL database.
const url = new URL(process.env.BOX_DATABASE_URL || 'http://invalid')
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.pathname, '/moderation_test')
assert.equal(process.env.BOX_IDENTITY_DATABASE_SCHEMA, 'moderation_test')
const owner: PlayerAdminIdentity = {
  id: 'server-owner',
  username: 'owner',
  displayName: '服主',
  role: 'owner',
  permissions: [],
  status: 'active',
  credential: 'owner-session',
}
const context = { ip: '192.0.2.1', userAgent: 'isolated regression', deviceHash: '' }
const fingerprint = 'a'.repeat(64)
const mapId = 'moderation-test-map'
const request = {
  headers: { 'user-agent': 'isolated regression' },
  socket: { remoteAddress: '192.0.2.1' },
} as unknown as NextApiRequest
function response() {
  const headers = new Map<string, unknown>()
  const state = { status: 200, body: undefined as unknown }
  const res = {
    setHeader: (name: string, value: unknown) => headers.set(name, value),
    getHeader: (name: string) => headers.get(name),
    status: (status: number) => {
      state.status = status
      return res
    },
    json: (body: unknown) => {
      state.body = body
      return res
    },
    end: () => res,
  }
  return {
    headers,
    state,
    res: res as unknown as NextApiResponse,
  }
}
async function main() {
  assert.equal(canonicalModerationIP('0:0:0:0:0:0:0:1'), '::1')
  assert.equal(canonicalModerationIP('0:0:0:0:0:ffff:192.0.2.8'), '192.0.2.8')
  process.env.BOX_DEPLOYMENT_MODE = 'player-service'
  const unauthenticated = response()
  await internalHandler({ ...request, method: 'POST', body: {} } as NextApiRequest, unauthenticated.res)
  assert.equal(unauthenticated.state.status, 401)
  const invalid = response()
  await internalHandler(
    {
      ...request,
      method: 'POST',
      headers: { ...request.headers, authorization: `Bearer ${process.env.PERMISSION_TOKEN_SECRET}` },
      body: { keyId: 'not-supported' },
    } as NextApiRequest,
    invalid.res,
  )
  assert.equal(invalid.state.status, 400)
  const notOwner = response()
  await ownerHandler({ ...request, method: 'GET', query: {} } as NextApiRequest, notOwner.res)
  assert.equal(notOwner.state.status, 401)
  await checkPlayerDatabaseReady()
  const group = await createPlayerAdminPermissionGroup(
    { name: '测试自动化', permissions: ['players.view', 'players.ban', 'identity-bans.manage'] },
    owner,
  )
  const admin = await createPlayerAdminAccount(
    {
      username: 'test_admin',
      displayName: '测试管理员',
      password: 'TestOnly_7W9q4s!Bp',
      permissionGroupId: group.id,
      consoleLoginEnabled: false,
    },
    owner,
  )
  const player = await createManagedPlayer(
    { username: 'test_player', displayName: '测试玩家', password: 'TestOnly_7W9q4s!Bp' },
    context,
  )
  const player2 = await createManagedPlayer(
    { username: 'test_player_two', displayName: '测试玩家二', password: 'TestOnly_7W9q4s!Bp' },
    context,
  )
  const key = await store.create(
    { adminId: admin.id, name: '本图授权', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    owner.id,
  )
  await store.bind({ mapId, keyId: key.id, scriptFingerprint: fingerprint }, owner.id)
  const input = {
    mapId,
    scriptFingerprint: fingerprint,
    userId: player.userId,
    action: 'banPlayer',
    durationSeconds: 120,
    reason: '测试处罚',
    requestId: 'account-1',
  }
  await assert.rejects(
    loginPlayerAdmin(request, response().res, { username: 'test_admin', password: 'TestOnly_7W9q4s!Bp' }),
    /禁止登录后台/,
  )
  const ban = await moderation.execute(input, context)
  assert.deepEqual(await moderation.execute(input, context), { ...ban, replayed: true })
  assert.equal((await moderation.admission(mapId, player.userId, '192.0.2.2')).allowed, false)
  assert.equal((await moderation.admission('other-map', player.userId, '192.0.2.2')).allowed, true)
  assert.equal((await moderation.admission(mapId, player2.userId, '192.0.2.2')).allowed, true)
  await assert.rejects(moderation.execute({ ...input, reason: '篡改重复请求' }, context), /requestId/)
  await assert.rejects(moderation.execute({ ...input, mapId: 'copied-map' }, context), /未授权/)
  await assert.rejects(moderation.execute({ ...input, scriptFingerprint: 'b'.repeat(64) }, context), /脚本已改变/)
  await assert.rejects(moderation.execute({ ...input, scope: 'server', requestId: 'global-denied' }, context), /全服/)
  await assert.rejects(moderation.execute({ ...input, durationSeconds: 3601, requestId: 'too-long' }, context), /上限/)
  const { pool, table } = await playerAdminStore()
  await pool.query(`UPDATE ${table('admin_permission_groups')} SET permissions=ARRAY['players.view'] WHERE id=$1`, [
    group.id,
  ])
  await assert.rejects(moderation.execute(input, context), /权限组/) // replay must not bypass revoked permissions
  await pool.query(
    `UPDATE ${table('admin_permission_groups')} SET permissions=ARRAY['players.view','players.ban','identity-bans.manage'] WHERE id=$1`,
    [group.id],
  )
  await moderation.execute(
    {
      mapId,
      scriptFingerprint: fingerprint,
      action: 'revokeBan',
      banId: ban.id,
      reason: '解除测试',
      requestId: 'unban-1',
    },
    context,
  )
  assert.equal((await moderation.admission(mapId, player.userId, '192.0.2.2')).allowed, true)
  const ipBan = await moderation.execute(
    { ...input, action: 'banCurrentIP', ipAddress: '192.0.2.2', requestId: 'ip-1' },
    context,
  )
  const oldSecret = process.env.PERMISSION_TOKEN_SECRET
  process.env.PERMISSION_TOKEN_SECRET = 'rotated-test-only-transport-secret'
  assert.equal((await moderation.admission(mapId, player2.userId, '192.0.2.2')).allowed, false)
  process.env.PERMISSION_TOKEN_SECRET = oldSecret
  assert.equal((await moderation.admission(mapId, player2.userId, '192.0.2.2')).allowed, false)
  assert.deepEqual(
    await moderation.deniedPlayers(mapId, [
      { userId: player2.userId, ipAddress: '192.0.2.2' },
      { userId: player2.userId, ipAddress: '192.0.2.3' },
    ]),
    [0],
  )
  await store.revokeMapBan(ipBan.id, owner.id)
  assert.equal((await moderation.admission(mapId, player2.userId, '192.0.2.2')).allowed, true)
  await updatePlayerAdminAccount(admin.id, { consoleLoginEnabled: true }, owner)
  const login = response()
  await loginPlayerAdmin(request, login.res, { username: 'test_admin', password: 'TestOnly_7W9q4s!Bp' })
  await assert.rejects(
    moderation.execute(
      { ...input, action: 'banCurrentIP', ipAddress: '192.0.2.1', requestId: 'protected-management-ip' },
      context,
    ),
    /管理会话/,
  )
  const cookies = (login.headers.get('Set-Cookie') as string[]).map((c) => c.split(';')[0]).join('; ')
  assert.ok(
    await resolvePlayerAdminSession({ ...request, headers: { ...request.headers, cookie: cookies } } as NextApiRequest),
  )
  const accountOnly = response()
  await ownerHandler(
    { ...request, method: 'GET', query: {}, headers: { ...request.headers, cookie: cookies } } as NextApiRequest,
    accountOnly.res,
  )
  assert.equal(accountOnly.state.status, 403)
  await updatePlayerAdminAccount(admin.id, { consoleLoginEnabled: false }, owner)
  await assert.rejects(
    resolvePlayerAdminSession({ ...request, headers: { ...request.headers, cookie: cookies } } as NextApiRequest),
    /请登录/,
  )
  // Console access is independent of the automation grant.
  assert.ok(
    await moderation.execute(
      { mapId, scriptFingerprint: fingerprint, action: 'getPlayerStatus', userId: player.userId },
      context,
    ),
  )
  const serverKey = await store.create(
    { adminId: admin.id, name: '全服授权', scope: 'server', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    owner.id,
  )
  const serverMap = 'moderation-server-map'
  await store.bind({ mapId: serverMap, keyId: serverKey.id, scriptFingerprint: fingerprint }, owner.id)
  // Audit failure must roll back both the underlying global ban and its request receipt.
  await pool.query(`CREATE FUNCTION moderation_test.fail_script_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='script.banPlayer' THEN RAISE EXCEPTION 'test audit unavailable'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_script_audit BEFORE INSERT ON ${table('admin_audit_events')} FOR EACH ROW EXECUTE FUNCTION moderation_test.fail_script_audit()`)
  await assert.rejects(
    moderation.execute(
      { ...input, mapId: serverMap, userId: player2.userId, scope: 'server', requestId: 'rollback-test' },
      context,
    ),
    /audit unavailable/,
  )
  assert.equal(
    (await pool.query(`SELECT status FROM ${table('users')} WHERE id=$1`, [player2.userId])).rows[0].status,
    'active',
  )
  assert.equal(
    (
      await pool.query(
        `SELECT COUNT(*) AS count FROM ${table('script_moderation_requests')} WHERE request_id='rollback-test'`,
      )
    ).rows[0].count,
    '0',
  )
  await pool.query(
    `DROP TRIGGER fail_script_audit ON ${table('admin_audit_events')}; DROP FUNCTION moderation_test.fail_script_audit()`,
  )
  const globalBan = await moderation.execute(
    { ...input, mapId: serverMap, scope: 'server', requestId: 'global-account' },
    context,
  )
  assert.equal(
    (await pool.query(`SELECT status FROM ${table('users')} WHERE id=$1`, [player.userId])).rows[0].status,
    'banned',
  )
  await moderation.execute(
    {
      mapId: serverMap,
      scriptFingerprint: fingerprint,
      action: 'revokeBan',
      banId: globalBan.id,
      reason: '解除全服测试',
      requestId: 'global-unban',
    },
    context,
  )
  assert.equal(
    (await pool.query(`SELECT status FROM ${table('users')} WHERE id=$1`, [player.userId])).rows[0].status,
    'active',
  )
  const globalIP = await moderation.execute(
    {
      ...input,
      mapId: serverMap,
      action: 'banCurrentIP',
      scope: 'server',
      ipAddress: '192.0.2.5',
      requestId: 'global-ip',
    },
    context,
  )
  await moderation.execute(
    {
      mapId: serverMap,
      scriptFingerprint: fingerprint,
      action: 'revokeBan',
      banId: globalIP.id,
      reason: '解除 IP 测试',
      requestId: 'global-ip-unban',
    },
    context,
  )
  // Manual administrator edits must never be overwritten by an old script grant.
  const changedBan = await moderation.execute(
    { ...input, mapId: serverMap, scope: 'server', requestId: 'global-manual' },
    context,
  )
  await pool.query(`UPDATE ${table('users')} SET updated_at=NOW(),ban_reason='管理员人工复核' WHERE id=$1`, [
    player.userId,
  ])
  await assert.rejects(
    moderation.execute(
      {
        mapId: serverMap,
        scriptFingerprint: fingerprint,
        action: 'revokeBan',
        banId: changedBan.id,
        reason: '旧脚本解除',
        requestId: 'manual-denied',
      },
      context,
    ),
    /人工复核/,
  )
  await updatePlayerAdminAccount(admin.id, { status: 'disabled' }, owner)
  await assert.rejects(moderation.execute(input, context), /失效/)
  await updatePlayerAdminAccount(admin.id, { status: 'active' }, owner)
  await pool.query(`UPDATE ${table('script_admin_keys')} SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1`, [
    serverKey.id,
  ])
  await assert.rejects(moderation.execute({ ...input, mapId: serverMap }, context), /失效/)
  const rateMap = 'rate-test-map'
  await store.bind({ mapId: rateMap, keyId: key.id, scriptFingerprint: fingerprint }, owner.id)
  for (let i = 0; i < 20; i++)
    await moderation.execute(
      { mapId: rateMap, scriptFingerprint: fingerprint, action: 'getPlayerStatus', userId: player.userId },
      context,
    )
  await assert.rejects(
    moderation.execute(
      { mapId: rateMap, scriptFingerprint: fingerprint, action: 'getPlayerStatus', userId: player.userId },
      context,
    ),
    /过于频繁/,
  )
  await store.revoke(key.id, owner.id)
  await assert.rejects(moderation.execute(input, context), /失效/)
  await assert.rejects(store.bind({ mapId, keyId: key.id, scriptFingerprint: fingerprint }, owner.id), /无效/)
  const audits = await pool.query(`SELECT action FROM ${table('admin_audit_events')} WHERE action LIKE 'script.%'`)
  assert.ok(audits.rows.length >= 8)
  console.log(
    'Script moderation PostgreSQL regression passed: scope, live permissions, replay, account/IP bans, owner recovery, console session invalidation and audit',
  )
}
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
