'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { LicenseError } = require('./index')

const TIME_TOKEN_PREFIX = 'box3t1'
const DEFAULT_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const TIME_MODES = new Set(['signed', 'qq-checktime'])

function encode(value) {
  return Buffer.from(value).toString('base64url')
}

function decode(value) {
  try {
    return Buffer.from(value, 'base64url')
  } catch {
    throw new LicenseError('invalid-time-token', '可信时间编码无效')
  }
}

function signTrustedTime(payload, privateKey) {
  if (!payload || payload.formatVersion !== 1 || typeof payload.issuedAt !== 'string') {
    throw new LicenseError('invalid-time-token', '可信时间内容无效')
  }
  if (!Number.isFinite(Date.parse(payload.issuedAt))) {
    throw new LicenseError('invalid-time-token', '可信时间格式无效')
  }
  const encodedPayload = encode(JSON.stringify(payload))
  const signature = crypto.sign(null, Buffer.from(encodedPayload), privateKey)
  return `${TIME_TOKEN_PREFIX}.${encodedPayload}.${signature.toString('base64url')}`
}

function verifyTrustedTime(token, options = {}) {
  const parts = String(token || '').trim().split('.')
  if (parts.length !== 3 || parts[0] !== TIME_TOKEN_PREFIX) {
    throw new LicenseError('invalid-time-token', '可信时间格式无效')
  }
  if (!options.publicKey) {
    throw new LicenseError('missing-public-key', '未配置可信时间验证公钥')
  }
  const [, encodedPayload, encodedSignature] = parts
  if (!crypto.verify(null, Buffer.from(encodedPayload), options.publicKey, decode(encodedSignature))) {
    throw new LicenseError('invalid-time-signature', '可信时间签名无效')
  }
  let payload
  try {
    payload = JSON.parse(decode(encodedPayload).toString('utf8'))
  } catch {
    throw new LicenseError('invalid-time-token', '可信时间内容无法解析')
  }
  if (!payload || payload.formatVersion !== 1 || typeof payload.issuedAt !== 'string') {
    throw new LicenseError('invalid-time-token', '可信时间内容无效')
  }
  const issuedAt = Date.parse(payload.issuedAt)
  if (!Number.isFinite(issuedAt)) {
    throw new LicenseError('invalid-time-token', '可信时间格式无效')
  }
  return { ...payload, issuedAtMs: issuedAt }
}

function readState(filesystem, statePath, publicKey) {
  if (!statePath) return { maxObservedAt: 0, trustedAt: 0, token: '' }
  try {
    const state = JSON.parse(filesystem.readFileSync(statePath, 'utf8'))
    const maxObservedAt = Number(state.maxObservedAt) || 0
    const token = typeof state.token === 'string' ? state.token : ''
    const trusted = token ? verifyTrustedTime(token, { publicKey }) : null
    const trustedAt = trusted?.issuedAtMs || 0
    if (trustedAt && Number(state.trustedAt) !== trustedAt) {
      throw new LicenseError('invalid-time-state', '可信时间缓存无效')
    }
    return { maxObservedAt: Math.max(maxObservedAt, trustedAt), trustedAt, token }
  } catch (error) {
    if (error?.code === 'ENOENT') return { maxObservedAt: 0, trustedAt: 0, token: '' }
    if (error instanceof LicenseError) throw error
    throw new LicenseError('invalid-time-state', '可信时间缓存无法读取')
  }
}

function writeState(filesystem, statePath, state) {
  if (!statePath) return
  filesystem.mkdirSync(path.dirname(statePath), { recursive: true, mode: 0o700 })
  const temporary = `${statePath}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  filesystem.writeFileSync(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 })
  filesystem.renameSync(temporary, statePath)
  filesystem.chmodSync?.(statePath, 0o600)
}

function parseQqChecktime(body) {
  const match = String(body || '')
    .trim()
    .match(/^QZOutputJson\s*=\s*(\{[\s\S]*\})\s*;?\s*$/)
  if (!match) {
    throw new LicenseError('invalid-network-time', '网络时间服务返回格式无效')
  }
  let value
  try {
    value = JSON.parse(match[1])
  } catch {
    throw new LicenseError('invalid-network-time', '网络时间服务返回内容无效')
  }
  const seconds = Number(value?.t)
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new LicenseError('invalid-network-time', '网络时间服务未返回有效时间')
  }
  return seconds * 1000
}

function createTrustedClock(options = {}) {
  const filesystem = options.filesystem || fs
  const now = options.now || (() => Date.now())
  const publicKey = options.publicKey
  const statePath = options.statePath || ''
  const rollbackToleranceMs = options.rollbackToleranceMs ?? DEFAULT_ROLLBACK_TOLERANCE_MS
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  const timeUrl = options.timeUrl || ''
  const timeMode = options.timeMode || 'signed'
  const request = options.fetch || globalThis.fetch
  if (!TIME_MODES.has(timeMode)) {
    throw new LicenseError('invalid-time-mode', '可信时间模式无效')
  }
  let state = readState(filesystem, statePath, publicKey)
  let networkAt = timeMode === 'signed' ? state.trustedAt : 0

  function persist() {
    writeState(filesystem, statePath, state)
  }

  function currentTime() {
    const observedAt = Number(now())
    if (!Number.isFinite(observedAt)) {
      throw new LicenseError('invalid-system-time', '系统时间无效')
    }
    if (state.maxObservedAt && observedAt + rollbackToleranceMs < state.maxObservedAt) {
      throw new LicenseError('clock-rollback', '检测到系统时间回拨，请恢复正确时间后重试')
    }
    const effectiveAt = Math.max(observedAt, state.maxObservedAt)
    if (effectiveAt > state.maxObservedAt) {
      state = { ...state, maxObservedAt: effectiveAt }
      persist()
    }
    return new Date(effectiveAt)
  }

  function requireFreshNetworkTime() {
    if (!timeUrl) return
    const current = currentTime().getTime()
    if (!networkAt || current - networkAt > maxAgeMs) {
      throw new LicenseError('trusted-time-stale', '可信网络时间不可用或已过期')
    }
  }

  async function refresh() {
    if (!timeUrl) return false
    let parsedUrl
    try {
      parsedUrl = new URL(timeUrl)
    } catch {
      throw new LicenseError('invalid-time-url', '可信时间地址无效')
    }
    if (parsedUrl.protocol !== 'https:') {
      throw new LicenseError('invalid-time-url', '可信时间地址必须使用 HTTPS')
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    timeout.unref?.()
    try {
      if (typeof request !== 'function') {
        throw new LicenseError('trusted-time-unavailable', '网络时间请求不可用')
      }
      const response = await request(parsedUrl, {
        headers: { Accept: timeMode === 'signed' ? 'application/json' : 'text/plain' },
        signal: controller.signal,
      })
      if (!response.ok) throw new LicenseError('trusted-time-unavailable', '可信时间服务暂时不可用')
      const body = await response.text()
      const signedBody = timeMode === 'signed' ? JSON.parse(body) : null
      const trusted =
        timeMode === 'signed'
          ? verifyTrustedTime(signedBody?.token, { publicKey })
          : { issuedAtMs: parseQqChecktime(body), token: '' }
      const observedAt = Number(now())
      if (!Number.isFinite(observedAt)) {
        throw new LicenseError('invalid-system-time', '系统时间无效')
      }
      if (state.maxObservedAt && observedAt + rollbackToleranceMs < state.maxObservedAt) {
        throw new LicenseError('clock-rollback', '检测到系统时间回拨，请恢复正确时间后重试')
      }
      if (trusted.issuedAtMs + rollbackToleranceMs < networkAt) {
        throw new LicenseError('trusted-time-rollback', '可信时间服务返回了过早的时间')
      }
      state = {
        maxObservedAt: Math.max(state.maxObservedAt, observedAt, trusted.issuedAtMs),
        trustedAt: timeMode === 'signed' ? Math.max(state.trustedAt, trusted.issuedAtMs) : state.trustedAt,
        token:
          timeMode === 'signed' && trusted.issuedAtMs >= state.trustedAt
            ? signedBody.token
            : state.token,
      }
      networkAt = Math.max(networkAt, trusted.issuedAtMs)
      persist()
      return true
    } catch (error) {
      if (error instanceof LicenseError) throw error
      throw new LicenseError('trusted-time-unavailable', '可信时间服务暂时不可用')
    } finally {
      clearTimeout(timeout)
    }
  }

  return { currentTime, refresh, requireFreshNetworkTime }
}

module.exports = {
  TIME_TOKEN_PREFIX,
  TIME_MODES,
  createTrustedClock,
  parseQqChecktime,
  signTrustedTime,
  verifyTrustedTime,
}
