'use strict'

const crypto = require('node:crypto')
const { signLicense } = require('@box/license')
const { signTrustedTime } = require('@box/license/trusted-time')

const FEATURES = ['creator', 'play', 'voxa', 'player-service', 'player-auth-portal']

function identifier(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`
}

function createLicenseIssuer(privateKey, options = {}) {
  const now = options.now || (() => new Date())
  const timePrivateKey = options.timePrivateKey

  function issue({ deviceId, expiresAt }) {
    const issuedAt = now()
    const expiration = new Date(expiresAt)
    if (expiration.getTime() <= issuedAt.getTime()) {
      throw new Error('许可证到期时间必须晚于当前时间')
    }
    const payload = {
      formatVersion: 1,
      licenseId: identifier('lic'),
      type: 'personal-learning',
      holderId: `device_${deviceId.slice(4, 36)}`,
      deviceId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiration.toISOString(),
      features: FEATURES,
      commercialUse: false,
      version: 1,
    }
    return {
      licenseId: payload.licenseId,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      token: signLicense(payload, privateKey),
    }
  }

  function issueTrustedTime() {
    if (!timePrivateKey) throw new Error('未配置可信时间签名私钥')
    const issuedAt = now().toISOString()
    return {
      issuedAt,
      token: signTrustedTime({ formatVersion: 1, issuedAt }, timePrivateKey),
    }
  }

  return { issue, issueTrustedTime }
}

module.exports = { createLicenseIssuer }
