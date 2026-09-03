'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { createOperations, parseComposeStatus } = require('../operations')
const { createLicenseManager } = require('../license')
const { safeEqual, sameOrigin } = require('../server')
const { signLicense } = require('../../../packages/license')

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-server-manager-'))
  fs.writeFileSync(path.join(root, 'compose.yml'), 'name: box-local-engine\n')
  fs.writeFileSync(
    path.join(root, '.env'),
    'COMPOSE_PROFILES=player-service,auth-portal,creator,play,voxa,server-manager\nBOX_PLAY_PORT=3000\nBOX_DATABASE_URL=postgres://secret\n',
    { mode: 0o600 },
  )
  const calls = []
  const run = async (command, args) => {
    calls.push([command, args])
    if (args.includes('ps')) {
      return {
        status: 0,
        stdout:
          '{"Service":"creator","State":"running","Health":"healthy"}\n{"Service":"voxa","State":"running","Health":"healthy"}\n{"Service":"play","State":"running","Health":"healthy"}\n{"Service":"player-service","State":"running","Health":"healthy"}\n',
        stderr: '',
      }
    }
    return { status: 0, stdout: '', stderr: '' }
  }
  const license = { requireLicense: () => undefined, status: () => ({ valid: true }) }
  return { root, calls, operations: createOperations({ root, run, license }) }
}

test('configuration hides secrets and preserves blank write-only values', () => {
  const { root, operations } = fixture()
  const database = operations.getConfiguration().find((field) => field.key === 'BOX_DATABASE_URL')
  assert.equal(database.value, '')
  assert.equal(database.configured, true)
  operations.saveConfiguration({ BOX_PLAY_PORT: '3100', BOX_DATABASE_URL: '' })
  const source = fs.readFileSync(path.join(root, '.env'), 'utf8')
  assert.match(source, /^BOX_PLAY_PORT=3100$/m)
  assert.match(source, /^BOX_DATABASE_URL=postgres:\/\/secret$/m)
  assert.equal(fs.statSync(path.join(root, '.env')).mode & 0o777, 0o600)
})

test('configuration rejects unknown keys and newline injection', () => {
  const { operations } = fixture()
  assert.throws(() => operations.saveConfiguration({ MALICIOUS_COMMAND: 'true' }), /不允许修改/)
  assert.throws(
    () => operations.saveConfiguration({ BOX_PLAY_PUBLIC_URL: 'http://localhost\nEVIL=true' }),
    /内容无效/,
  )
})

test('control accepts only fixed services and builds Docker arguments internally', async () => {
  const { calls, operations } = fixture()
  await assert.rejects(() => operations.control('start', 'play; rm -rf /'), /服务名称无效/)
  await operations.control('start', 'play')
  const args = calls[0][1]
  assert.deepEqual(args.slice(-5), ['up', '-d', '--no-build', '--remove-orphans', 'play'])
  assert.equal(calls[0][0], 'docker')
})

test('status normalizes JSON-lines output and marks optional portal enabled', async () => {
  const { operations } = fixture()
  const status = await operations.getStatus()
  assert.equal(status.services.find((service) => service.name === 'play').running, true)
  assert.equal(status.services.find((service) => service.name === 'creator').running, true)
  assert.equal(status.services.find((service) => service.name === 'voxa').running, true)
  assert.equal(
    status.services.find((service) => service.name === 'player-auth-portal').enabled,
    true,
  )
  assert.equal(parseComposeStatus('[]').length, 0)
})

test('token and origin checks are constant-shape and same-origin only', () => {
  assert.equal(safeEqual('a'.repeat(32), 'a'.repeat(32)), true)
  assert.equal(safeEqual('a'.repeat(32), 'b'.repeat(32)), false)
  assert.equal(sameOrigin({ headers: { host: '127.0.0.1:3130' } }), true)
  assert.equal(
    sameOrigin({ headers: { host: '127.0.0.1:3130', origin: 'http://evil.example' } }),
    false,
  )
})

test('headless license manager binds signed licenses to one persistent device', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-server-license-'))
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyPath = path.join(root, 'public.pem')
  fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }))
  const manager = createLicenseManager({ root, publicKeyPath, hardwareId: 'test-hardware-a' })
  const deviceId = manager.status().deviceId
  const issuedAt = new Date()
  const token = signLicense(
    {
      formatVersion: 1,
      licenseId: 'lic_headless_test',
      type: 'personal-learning',
      holderId: 'usr_headless_test',
      deviceId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + 60_000).toISOString(),
      features: ['creator', 'play', 'voxa', 'player-service', 'player-auth-portal'],
      commercialUse: false,
    },
    privateKey,
  )

  assert.equal(manager.install(token).valid, true)
  assert.equal(
    createLicenseManager({ root, publicKeyPath, hardwareId: 'test-hardware-a' }).status().deviceId,
    deviceId,
  )
  const moved = createLicenseManager({
    root,
    publicKeyPath,
    hardwareId: 'test-hardware-b',
  }).status()
  assert.notEqual(moved.deviceId, deviceId)
  assert.equal(moved.valid, false)
  assert.match(moved.message, /设备不匹配/)
  assert.equal(fs.statSync(path.join(root, 'license/device-id')).mode & 0o777, 0o600)
  assert.equal(fs.statSync(path.join(root, 'license/install-secret')).mode & 0o777, 0o600)
  assert.equal(fs.statSync(path.join(root, 'license/box3-license.boxlic')).mode & 0o777, 0o600)
})

test('headless service control blocks start and restart without a valid license', async () => {
  const { root } = fixture()
  const calls = []
  const operations = createOperations({
    root,
    run: async (command, args) => {
      calls.push([command, args])
      return { status: 0, stdout: '[]', stderr: '' }
    },
    license: {
      requireLicense: () => {
        throw new Error('尚未安装个人学习许可证')
      },
      status: () => ({ valid: false }),
    },
  })

  await assert.rejects(() => operations.control('start', 'play'), /许可证/)
  await assert.rejects(() => operations.control('restart', 'play'), /许可证/)
  await operations.control('stop', 'play')
  assert.equal(calls.length, 2)
})
