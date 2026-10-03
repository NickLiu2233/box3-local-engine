import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { checkPlayerDatabaseReady, createManagedPlayer } from '../server/local-player-identity'
import {
  playerAdminStore,
  createPlayerAdminAccount,
  createPlayerAdminPermissionGroup,
  updatePlayerAdminAccount,
  type PlayerAdminIdentity,
} from '../server/player-admin-identity'
import { scriptModerationStore as store } from '../server/script-moderation-store'
import { scriptModerationService as moderation } from '../server/script-moderation-service'

// This suite creates test accounts and fault-injection triggers. Never run against a real deployment.
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
const fingerprint = 'a'.repeat(64),
  mapId = 'moderation-test-map'
async function report(map = mapId, fp = fingerprint, mode: 'edit' | 'play' = 'play') {
  return store.observeRuntime({ mapId: map, mode, name: '测试地图', scriptFingerprint: fp })
}
async function main() {
  await checkPlayerDatabaseReady()
  await report()
  const key = await store.create(
    { mapId, expectedFingerprint: fingerprint, permissions: ['players.view', 'players.ban', 'identity-bans.manage'] },
    owner.id,
  )
  const { pool, table } = await playerAdminStore()
  const row = (await pool.query(`SELECT admin_id,permissions FROM ${table('script_admin_keys')} WHERE id=$1`, [key.id]))
    .rows[0]
  assert.equal(row.admin_id, null)
  assert.ok(row.permissions.includes('players.ban'))
  const player = await createManagedPlayer(
    { username: 'test_player', displayName: '测试玩家', password: 'TestOnly_7W9q4s!Bp' },
    context,
  )
  const player2 = await createManagedPlayer(
    { username: 'test_player_two', displayName: '测试玩家二', password: 'TestOnly_7W9q4s!Bp' },
    context,
  )
  const input = {
    mapId,
    scriptFingerprint: fingerprint,
    userId: player.userId,
    action: 'banPlayer',
    reason: '测试',
    durationSeconds: 120,
    requestId: 'ban-one',
  }
  const ban = await moderation.execute(input, context)
  assert.deepEqual(await moderation.execute(input, context), { ...ban, replayed: true })
  assert.equal((await moderation.admission(mapId, player.userId, '192.0.2.2')).allowed, false)
  assert.equal((await moderation.admission('other-map', player.userId, '192.0.2.2')).allowed, true)
  await assert.rejects(moderation.execute({ ...input, requestId: 'duplicate' }, context), /对应处罚/)
  await assert.rejects(moderation.execute({ ...input, reason: '改变重复请求' }, context), /requestId/)
  await assert.rejects(moderation.execute({ ...input, mapId: 'copied-map' }, context), /未授权/)
  await assert.rejects(moderation.execute({ ...input, scope: 'server', requestId: 'global-denied' }, context), /全服/)
  await pool.query(`UPDATE ${table('script_admin_keys')} SET permissions=ARRAY['players.view'] WHERE id=$1`, [key.id])
  await assert.rejects(moderation.execute(input, context), /Key 不允许/)
  await pool.query(
    `UPDATE ${table('script_admin_keys')} SET permissions=ARRAY['players.view','players.ban','identity-bans.manage'] WHERE id=$1`,
    [key.id],
  )
  await moderation.execute(
    {
      mapId,
      scriptFingerprint: fingerprint,
      action: 'revokeBan',
      banId: ban.id,
      reason: '解除',
      requestId: 'revoke-one',
    },
    context,
  )
  const ipBan = await moderation.execute(
    { ...input, action: 'banCurrentIP', ipAddress: '192.0.2.2', requestId: 'ip-ban' },
    context,
  )
  assert.equal((await moderation.admission(mapId, player2.userId, '192.0.2.2')).allowed, false)
  assert.deepEqual(
    await moderation.deniedPlayers(mapId, [
      { userId: player2.userId, ipAddress: '192.0.2.2' },
      { userId: player2.userId, ipAddress: '192.0.2.3' },
    ]),
    [0],
  )
  await store.revokeMapBan(ipBan.id, owner.id)
  const next = 'b'.repeat(64)
  await report(mapId, next)
  await assert.rejects(
    moderation.execute({ ...input, scriptFingerprint: next, requestId: 'new-version' }, context),
    /脚本已改变/,
  )
  await assert.rejects(
    store.updateAuthorization({ mapId, keyId: key.id, expectedFingerprint: fingerprint }, owner.id),
    /版本已变化/,
  )
  await store.updateAuthorization({ mapId, keyId: key.id, expectedFingerprint: next }, owner.id)
  assert.ok(await moderation.execute({ ...input, scriptFingerprint: next, action: 'getPlayerStatus' }, context))
  await report(mapId, 'c'.repeat(64), 'edit')
  assert.equal((await store.list()).maps.find((m) => m.mapId === mapId).scriptFingerprint, next)
  await pool.query(`UPDATE ${table('script_admin_keys')} SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1`, [
    key.id,
  ])
  await assert.rejects(
    moderation.execute({ ...input, scriptFingerprint: next, action: 'getPlayerStatus' }, context),
    /失效/,
  )
  await store.updateAuthorization({ mapId, keyId: key.id, expectedFingerprint: next }, owner.id)
  assert.ok(await moderation.execute({ ...input, scriptFingerprint: next, action: 'getPlayerStatus' }, context))
  const group = await createPlayerAdminPermissionGroup(
    { name: '旧授权组', permissions: ['players.view', 'players.ban'] },
    owner,
  )
  const admin = await createPlayerAdminAccount(
    { username: 'test_admin', displayName: '管理员', password: 'TestOnly_7W9q4s!Bp', permissionGroupId: group.id },
    owner,
  )
  await updatePlayerAdminAccount(admin.id, { status: 'disabled' }, owner)
  assert.ok(await moderation.execute({ ...input, scriptFingerprint: next, action: 'getPlayerStatus' }, context))
  const legacyId = randomUUID()
  await pool.query(
    `INSERT INTO ${table('script_admin_keys')}(id,admin_id,name,scope,maximum_ban_seconds,expires_at,created_by) VALUES($1,$2,'legacy','map',3600,NOW()+INTERVAL '1 day','server-owner')`,
    [legacyId, admin.id],
  )
  await pool.query(
    `INSERT INTO ${table('script_admin_bindings')}(map_id,key_id,script_fingerprint,updated_by) VALUES('legacy-map',$1,$2,'server-owner')`,
    [legacyId, fingerprint],
  )
  await assert.rejects(
    moderation.execute({ ...input, mapId: 'legacy-map', action: 'getPlayerStatus' }, context),
    /旧版账号授权/,
  )
  const columns = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='moderation_test' AND table_name='admin_accounts' AND column_name='console_login_enabled'`,
  )
  assert.equal(columns.rowCount, 0)
  await report('server-map')
  const globalKey = await store.create(
    {
      mapId: 'server-map',
      expectedFingerprint: fingerprint,
      scope: 'server',
      permissions: ['players.view', 'players.ban'],
    },
    owner.id,
  )
  const globalInput = { ...input, mapId: 'server-map', scope: 'server', requestId: 'global-ban' }
  const globalBan = await moderation.execute(globalInput, context)
  assert.equal(
    (await pool.query(`SELECT status FROM ${table('users')} WHERE id=$1`, [player.userId])).rows[0].status,
    'banned',
  )
  await moderation.execute(
    {
      mapId: 'server-map',
      scriptFingerprint: fingerprint,
      action: 'revokeBan',
      banId: globalBan.id,
      reason: '复核',
      requestId: 'global-unban',
    },
    context,
  )
  await pool.query(
    `CREATE FUNCTION moderation_test.fail_script_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='script.banPlayer' THEN RAISE EXCEPTION 'test audit unavailable'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_script_audit BEFORE INSERT ON ${table('admin_audit_events')} FOR EACH ROW EXECUTE FUNCTION moderation_test.fail_script_audit()`,
  )
  await assert.rejects(
    moderation.execute({ ...globalInput, userId: player2.userId, requestId: 'rollback' }, context),
    /audit unavailable/,
  )
  assert.equal(
    (await pool.query(`SELECT status FROM ${table('users')} WHERE id=$1`, [player2.userId])).rows[0].status,
    'active',
  )
  await pool.query(
    `DROP TRIGGER fail_script_audit ON ${table('admin_audit_events')}; DROP FUNCTION moderation_test.fail_script_audit()`,
  )
  await store.revoke(globalKey.id, owner.id)
  await assert.rejects(
    store.updateAuthorization({ mapId: 'server-map', keyId: globalKey.id, expectedFingerprint: fingerprint }, owner.id),
    /已撤销/,
  )
  await store.revoke(key.id, owner.id)
  await assert.rejects(
    moderation.execute({ ...input, scriptFingerprint: next, action: 'getPlayerStatus' }, context),
    /失效/,
  )
  console.log(
    'Independent moderation keys passed: automatic versions, explicit updates, renewal, permissions, legacy isolation, removed login flag, map/global/IP bans and transaction audit',
  )
}
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
