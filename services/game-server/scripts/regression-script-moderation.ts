import assert from 'node:assert/strict'
import { ModerationHost } from '../src/moderation/moderation-host'
import { ModerationScript } from '../src/moderation/moderation-script'
import { scriptFingerprint } from '../src/moderation/moderation-client'

async function main() {
  process.env.BOX_PLAYER_SERVICE_INTERNAL_URL = 'http://test-player-service'
  process.env.PERMISSION_TOKEN_SECRET = 'test-only-host-secret'
  process.env.BOX_WORLD_PERMANENT_MAP_ID = 'test-permanent-map'
  process.env.MODE = 'play'
  assert.equal(scriptFingerprint({ b: 'two', a: 'one' }), scriptFingerprint({ a: 'one', b: 'two' }))
  assert.notEqual(scriptFingerprint({ a: 'one' }), scriptFingerprint({ a: 'changed' }))
  assert.notEqual(scriptFingerprint({ a: 'one' }, 'a'), scriptFingerprint({ a: 'one' }, 'different-entry'))
  let hostHandler: any
  let requestCount = 0
  let lastBody: any
  global.fetch = async (input) => {
    const request = input instanceof Request ? input : new Request(input)
    assert.equal(request.headers.get('Authorization'), 'Bearer test-only-host-secret')
    lastBody = await request.json()
    requestCount++
    return new Response(JSON.stringify({ id: 'test-ban', scope: 'map', expiresAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const replies: any[] = []
  const kicked: number[] = []
  new ModerationHost(
    {
      protocol: () => ({
        configure: (handlers: any) => {
          hostHandler = handlers.message.request
        },
      }),
    } as never,
    (session) => session === 'active-script',
    () => scriptFingerprint({ main: 'source' }),
    (id) => (id === 7 ? { userId: '42', ipAddress: '192.0.2.8' } : undefined),
    (id) => kicked.push(id),
  )
  const client = { sessionId: 'active-script', message: { reply: (reply: any) => replies.push(reply) } }
  const command = { action: 'banCurrentIP', reason: 'test', durationSeconds: 60, requestId: 'test-ip' }
  await hostHandler(client, { handle: 1, playerId: 7, payload: JSON.stringify(command) })
  assert.equal(requestCount, 1)
  assert.equal(lastBody.userId, '42')
  assert.equal(lastBody.ipAddress, '192.0.2.8')
  assert.equal(lastBody.mapId, 'test-permanent-map')
  assert.equal(lastBody.scriptFingerprint, scriptFingerprint({ main: 'source' }))
  assert.deepEqual(kicked, [7])
  for (const field of ['mapId', 'scriptFingerprint', 'userId', 'ipAddress', 'keyId', 'adminId']) {
    await hostHandler(client, { handle: 2, playerId: 7, payload: JSON.stringify({ ...command, [field]: 'forged' }) })
    assert.equal(replies.at(-1).success, false)
  }
  await hostHandler(client, { handle: 3, playerId: 99, payload: JSON.stringify(command) })
  assert.equal(replies.at(-1).success, false)
  assert.equal(requestCount, 1)
  await hostHandler(
    { ...client, sessionId: 'obsolete-script' },
    { handle: 4, playerId: 7, payload: JSON.stringify(command) },
  )
  assert.equal(requestCount, 1)

  let scriptHandler: any
  const sent: any[] = []
  const timers = new Map<number, () => void>()
  let timerId = 0
  const script = new ModerationScript(
    {
      protocol: () => ({
        configure: (handlers: any) => {
          scriptHandler = handlers.message.reply
        },
        server: { message: { request: (msg: any) => sent.push(msg) } },
      }),
    } as never,
    (event) => event(),
    () => 7,
    () => ({ mapId: 'test-permanent-map', scriptFingerprint: 'public-fingerprint' }),
    {
      setTimeout: (fn) => {
        timers.set(++timerId, fn)
        return timerId
      },
      clearTimeout: (id) => {
        timers.delete(id)
      },
    },
  )
  const player = {} as never
  const promise = script.banPlayer(player, { reason: 'test', durationSeconds: 60, requestId: 'test-account' })
  assert.equal(sent[0].playerId, 7)
  assert.ok(!sent[0].payload.includes('secret'))
  scriptHandler({
    handle: sent[0].handle,
    success: true,
    payload: JSON.stringify({ id: 'ban', scope: 'map', expiresAt: 'expiry' }),
  })
  assert.equal((await promise).id, 'ban')
  assert.equal(timers.size, 0)
  const pending = Array.from({ length: 8 }, () => script.getPlayerStatus(player))
  const outcomes = Promise.allSettled(pending)
  await assert.rejects(script.getPlayerStatus(player), /请求过多/)
  for (const fn of timers.values()) fn()
  assert.ok((await outcomes).every((result) => result.status === 'rejected'))
  console.log(
    'Script moderation bridge passed: trusted target/map/IP, stale peer rejection, tamper rejection, bounded requests, promise completion and timeout',
  )
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
