'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')

const TOKEN_PREFIX = 'box3l1'
const LICENSE_TYPE = 'personal-learning'

class LicenseError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'LicenseError'
    this.code = code
  }
}

function assertString(payload, name) {
  if (typeof payload[name] !== 'string' || !payload[name].trim()) {
    throw new LicenseError('invalid-payload', `许可证缺少 ${name}`)
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new LicenseError('invalid-payload', '许可证内容无效')
  }
  for (const name of [
    'licenseId',
    'type',
    'holderId',
    'deviceId',
    'issuedAt',
    'expiresAt',
  ]) {
    assertString(payload, name)
  }
  if (payload.formatVersion !== 1 || payload.type !== LICENSE_TYPE) {
    throw new LicenseError('unsupported-license', '不支持此许可证类型或格式')
  }
  if (payload.commercialUse !== false) {
    throw new LicenseError('invalid-payload', '个人学习许可证不能包含商业使用权')
  }
  if (
    !Array.isArray(payload.features) ||
    payload.features.some((feature) => typeof feature !== 'string' || !feature)
  ) {
    throw new LicenseError('invalid-payload', '许可证功能范围无效')
  }
  const issuedAt = Date.parse(payload.issuedAt)
  const expiresAt = Date.parse(payload.expiresAt)
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw new LicenseError('invalid-payload', '许可证有效期无效')
  }
  return payload
}

function encode(value) {
  return Buffer.from(value).toString('base64url')
}

function decode(value) {
  try {
    return Buffer.from(value, 'base64url')
  } catch {
    throw new LicenseError('invalid-token', '许可证编码无效')
  }
}

function signLicense(payload, privateKey) {
  validatePayload(payload)
  const encodedPayload = encode(JSON.stringify(payload))
  const signature = crypto.sign(null, Buffer.from(encodedPayload), privateKey)
  return `${TOKEN_PREFIX}.${encodedPayload}.${signature.toString('base64url')}`
}

function verifyLicense(token, options = {}) {
  const parts = String(token || '').trim().split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    throw new LicenseError('invalid-token', '许可证格式无效')
  }
  const [, encodedPayload, encodedSignature] = parts
  if (!options.publicKey) {
    throw new LicenseError('missing-public-key', '未配置许可证验证公钥')
  }
  const valid = crypto.verify(
    null,
    Buffer.from(encodedPayload),
    options.publicKey,
    decode(encodedSignature),
  )
  if (!valid) throw new LicenseError('invalid-signature', '许可证签名无效')
  let payload
  try {
    payload = JSON.parse(decode(encodedPayload).toString('utf8'))
  } catch {
    throw new LicenseError('invalid-payload', '许可证内容无法解析')
  }
  validatePayload(payload)
  const now = options.now instanceof Date ? options.now.getTime() : Date.now()
  if (now < Date.parse(payload.issuedAt) - 5 * 60 * 1000) {
    throw new LicenseError('not-active', '许可证尚未生效')
  }
  if (now >= Date.parse(payload.expiresAt)) {
    throw new LicenseError('expired', '许可证已到期，请续期后再使用')
  }
  if (options.deviceId && payload.deviceId !== options.deviceId) {
    throw new LicenseError('device-mismatch', '许可证与当前设备不匹配')
  }
  if (options.feature && !payload.features.includes(options.feature)) {
    throw new LicenseError('feature-denied', `许可证未授权 ${options.feature}`)
  }
  return payload
}

function verifyLicenseFiles({ licensePath, publicKeyPath, deviceIdPath, feature, now }) {
  for (const [label, file] of [
    ['许可证', licensePath],
    ['许可证公钥', publicKeyPath],
    ['设备身份', deviceIdPath],
  ]) {
    if (!file || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) {
      throw new LicenseError('missing-file', `未找到${label}文件`)
    }
  }
  return verifyLicense(fs.readFileSync(licensePath, 'utf8'), {
    publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
    deviceId: fs.readFileSync(deviceIdPath, 'utf8').trim(),
    feature,
    now,
  })
}

module.exports = {
  LICENSE_TYPE,
  LicenseError,
  signLicense,
  validatePayload,
  verifyLicense,
  verifyLicenseFiles,
}
