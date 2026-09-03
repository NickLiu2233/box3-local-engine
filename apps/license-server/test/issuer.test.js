'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const { verifyLicense } = require('@box-local/license')
const { createLicenseIssuer } = require('../issuer')

test('offline issuer creates a device-bound non-commercial license without persistence', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const now = new Date('2026-09-03T00:00:00.000Z')
  const issuer = createLicenseIssuer(privateKey, { now: () => now })
  const deviceId = `dev_${'a'.repeat(64)}`

  const result = issuer.issue({ deviceId, expiresAt: '2026-10-03T00:00:00.000Z' })
  const payload = verifyLicense(result.token, { publicKey, deviceId, now })

  assert.equal(payload.licenseId, result.licenseId)
  assert.equal(payload.holderId, `device_${'a'.repeat(32)}`)
  assert.equal(payload.expiresAt, '2026-10-03T00:00:00.000Z')
  assert.equal(payload.commercialUse, false)
  assert.deepEqual(payload.features, [
    'creator',
    'play',
    'voxa',
    'player-service',
    'player-auth-portal',
  ])
})
