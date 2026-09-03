'use strict'

const crypto = require('node:crypto')
const test = require('node:test')
const assert = require('node:assert/strict')
const { signLicense, verifyLicense } = require('..')
const {
  createTrustedClock,
  parseQqChecktime,
  signTrustedTime,
  verifyTrustedTime,
} = require('../trusted-time')

function fixture(overrides = {}) {
  return {
    formatVersion: 1,
    licenseId: 'lic_test',
    type: 'personal-learning',
    holderId: 'usr_test',
    deviceId: 'dev_test',
    issuedAt: '2026-09-01T00:00:00.000Z',
    expiresAt: '2026-10-01T00:00:00.000Z',
    features: ['creator', 'play', 'voxa', 'player-service', 'player-auth-portal'],
    commercialUse: false,
    ...overrides,
  }
}

test('signed license is accepted only by its device and feature', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const token = signLicense(fixture(), privateKey)
  const payload = verifyLicense(token, {
    publicKey,
    deviceId: 'dev_test',
    feature: 'play',
    now: new Date('2026-09-15T00:00:00Z'),
  })
  assert.equal(payload.licenseId, 'lic_test')
  assert.throws(
    () =>
      verifyLicense(token, {
        publicKey,
        deviceId: 'another-device',
        now: new Date('2026-09-15T00:00:00Z'),
      }),
    { code: 'device-mismatch' },
  )
})

test('tampering and expired licenses are rejected', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const token = signLicense(fixture(), privateKey)
  const parts = token.split('.')
  parts[1] = Buffer.from(
    JSON.stringify(fixture({ expiresAt: '2099-01-01T00:00:00Z' })),
  ).toString('base64url')
  assert.throws(() => verifyLicense(parts.join('.'), { publicKey }), {
    code: 'invalid-signature',
  })
  assert.throws(
    () => verifyLicense(token, { publicKey, now: new Date('2026-10-01T00:00:00Z') }),
    { code: 'expired' },
  )
})

test('signed time establishes a rollback-resistant local clock floor', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const token = signTrustedTime(
    { formatVersion: 1, issuedAt: '2026-09-15T12:00:00.000Z' },
    privateKey,
  )
  assert.equal(verifyTrustedTime(token, { publicKey }).issuedAtMs, Date.parse('2026-09-15T12:00:00Z'))

  const files = new Map()
  const filesystem = {
    readFileSync(file) {
      const value = files.get(file)
      if (value === undefined) {
        const error = new Error('missing')
        error.code = 'ENOENT'
        throw error
      }
      return value
    },
    mkdirSync() {},
    writeFileSync(file, value) {
      files.set(file, value)
    },
    renameSync(from, to) {
      files.set(to, files.get(from))
      files.delete(from)
    },
    chmodSync() {},
  }
  let current = Date.parse('2026-09-15T12:01:00Z')
  files.set(
    '/state/clock.json',
    JSON.stringify({ maxObservedAt: current, trustedAt: Date.parse('2026-09-15T12:00:00Z'), token }),
  )
  const resumed = createTrustedClock({
    filesystem,
    publicKey,
    statePath: '/state/clock.json',
    now: () => current,
  })
  assert.equal(resumed.currentTime().toISOString(), '2026-09-15T12:01:00.000Z')
  current = Date.parse('2026-09-15T11:50:00Z')
  assert.throws(() => resumed.currentTime(), { code: 'clock-rollback' })
})

test('QQ checktime is an online-only clock source', async () => {
  const now = Date.parse('2026-09-15T12:00:00Z')
  assert.equal(
    parseQqChecktime('QZOutputJson={"s":"o","t":1789473600,"ip":"127.0.0.1"};'),
    1789473600000,
  )
  assert.throws(() => parseQqChecktime('{"t":1789473600}'), { code: 'invalid-network-time' })
  const clock = createTrustedClock({
    now: () => now,
    timeUrl: 'https://vv.video.qq.com/checktime?otype=json',
    timeMode: 'qq-checktime',
    fetch: async () => ({
      ok: true,
      text: async () => 'QZOutputJson={"s":"o","t":1789473600};',
    }),
  })
  await clock.refresh()
  assert.doesNotThrow(() => clock.requireFreshNetworkTime())
})
