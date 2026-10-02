'use strict'

// 所有部署配置只在服务端读取，绝不将密钥序列化到页面。
function requiredURL(value, name) {
  let parsed
  try {
    parsed = new URL(String(value || '').trim())
  } catch {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL`)
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS`)
  }
  parsed.pathname = parsed.pathname.replace(/\/$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed
}

function optionalURL(value, name) {
  return String(value || '').trim() ? requiredURL(value, name) : null
}

function integer(value, fallback, minimum, maximum, name) {
  const parsed = value == null || value === '' ? fallback : Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return parsed
}

function enabled(value, fallback = true) {
  if (value == null || value === '') return fallback
  return String(value).trim().toLowerCase() !== 'false'
}

function configFromEnvironment(environment = process.env) {
  // 启动器注入 BOX_*；保留旧 AUTH_DEMO_* 以兼容既有部署。
  // 新名称优先，后端绝不能用默认的演示密钥启动生产服务。
  const value = (standard, legacy) => environment[standard] ?? environment[legacy]
  const apiKey = String(value('BOX_PLAYER_AUTH_API_KEY', 'AUTH_DEMO_API_KEY') || '').trim()
  if (apiKey.length < 16) {
    throw new Error('AUTH_DEMO_API_KEY must contain at least 16 characters')
  }
  return {
    host: String(value('HOST', 'AUTH_DEMO_HOST') || '127.0.0.1').trim(),
    port: integer(value('PORT', 'AUTH_DEMO_PORT'), 3214, 1, 65535, 'PORT'),
    playerServiceURL: requiredURL(
      value('BOX_PLAYER_SERVICE_INTERNAL_URL', 'AUTH_DEMO_PLAYER_SERVICE_URL'),
      'AUTH_DEMO_PLAYER_SERVICE_URL',
    ),
    publicURL: optionalURL(value('BOX_AUTH_PORTAL_PUBLIC_URL', 'AUTH_DEMO_PUBLIC_URL'), 'BOX_AUTH_PORTAL_PUBLIC_URL'),
    creatorURL: optionalURL(value('BOX_CREATOR_PUBLIC_URL', 'AUTH_DEMO_CREATOR_URL'), 'BOX_CREATOR_PUBLIC_URL'),
    playURL: optionalURL(value('BOX_PLAY_PUBLIC_URL', 'AUTH_DEMO_PLAY_URL'), 'BOX_PLAY_PUBLIC_URL'),
    apiKey,
    requestTimeoutMs: integer(
      value('BOX_AUTH_PORTAL_REQUEST_TIMEOUT_MS', 'AUTH_DEMO_REQUEST_TIMEOUT_MS'),
      10_000,
      1_000,
      60_000,
      'AUTH_DEMO_REQUEST_TIMEOUT_MS',
    ),
    trustProxy: value('BOX_TRUST_PROXY', 'AUTH_DEMO_TRUST_PROXY') === 'true',
    registrationEnabled: enabled(value('BOX_PLAYER_REGISTRATION_ENABLED', 'AUTH_DEMO_REGISTRATION_ENABLED'), true),
  }
}

module.exports = { configFromEnvironment }
