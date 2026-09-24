'use strict'

const crypto = require('node:crypto')
const test = require('node:test')
const assert = require('node:assert/strict')
const { createServer, safeEqual } = require('../server')
const { verifyTrustedTime } = require('@box/license/trusted-time')

test('admin tokens use constant-time equality', () => {
  assert.equal(safeEqual('a'.repeat(32), 'a'.repeat(32)), true)
  assert.equal(safeEqual('a'.repeat(32), 'b'.repeat(32)), false)
  assert.equal(safeEqual('short', 'different-length'), false)
})

test('offline issuer exposes no public application endpoint', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  const { privateKey: timePrivateKey, publicKey: timePublicKey } =
    crypto.generateKeyPairSync('ed25519')
  const app = createServer({
    adminToken: 'a'.repeat(32),
    privateKey,
    timePrivateKey,
  })
  const health = await app.inject({ method: 'GET', url: '/v1/health' })
  assert.deepEqual(health.json(), { ok: true, mode: 'offline-issuer' })
  const application = await app.inject({ method: 'POST', url: '/v1/licenses/apply', payload: {} })
  assert.equal(application.statusCode, 404)
  const time = await app.inject({ method: 'GET', url: '/v1/time' })
  assert.equal(time.statusCode, 200)
  assert.match(time.json().token, /^box3t1\./)
  assert.equal(
    typeof verifyTrustedTime(time.json().token, { publicKey: timePublicKey }).issuedAtMs,
    'number',
  )
  await app.close()
})

test('admin API rejects missing and invalid bearer tokens', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  const app = createServer({
    adminToken: 'a'.repeat(32),
    privateKey,
  })

  const missing = await app.inject({ method: 'GET', url: '/v1/admin/session' })
  assert.equal(missing.statusCode, 401)
  const invalid = await app.inject({
    method: 'GET',
    url: '/v1/admin/session',
    headers: { authorization: `Bearer ${'b'.repeat(32)}` },
  })
  assert.equal(invalid.statusCode, 401)
  await app.close()
})

test('authenticated admin can issue a license for a selected expiration time', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  const calls = []
  const app = createServer({
    adminToken: 'a'.repeat(32),
    privateKey,
    issuer: {
      issue(input) {
        calls.push(input)
        return { licenseId: 'lic_test', token: 'box3l1.test.signature' }
      },
    },
  })
  const headers = { authorization: `Bearer ${'a'.repeat(32)}` }
  const invalid = await app.inject({
    method: 'POST',
    url: '/v1/admin/licenses/issue',
    headers,
    payload: { deviceId: 'invalid', expiresAt: '2026-10-03T00:00:00.000Z' },
  })
  assert.equal(invalid.statusCode, 400)
  const valid = await app.inject({
    method: 'POST',
    url: '/v1/admin/licenses/issue',
    headers,
    payload: {
      deviceId: `dev_${'a'.repeat(64)}`,
      expiresAt: '2026-10-03T00:00:00.000Z',
    },
  })
  assert.equal(valid.statusCode, 200)
  assert.deepEqual(valid.json(), { licenseId: 'lic_test', token: 'box3l1.test.signature' })
  assert.deepEqual(calls, [
    { deviceId: `dev_${'a'.repeat(64)}`, expiresAt: '2026-10-03T00:00:00.000Z' },
  ])
  await app.close()
})

test('admin console serves only its fixed assets', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  const app = createServer({
    adminToken: 'a'.repeat(32),
    privateKey,
  })

  const page = await app.inject({ method: 'GET', url: '/admin' })
  assert.equal(page.statusCode, 200)
  assert.match(page.headers['content-type'], /^text\/html/)
  assert.match(page.body, /<button id="logout" hidden>退出<\/button>/)
  assert.match(page.body, /<form id="issue-form"/)
  assert.match(page.body, /name="expiresAt" type="datetime-local"/)
  assert.doesNotMatch(page.body, /待审核申请|许可证列表|刷新/)
  const traversal = await app.inject({ method: 'GET', url: '/admin/..%2Fserver.js' })
  assert.equal(traversal.statusCode, 404)
  await app.close()
})
