'use strict'

// 仅可信代理模式读取转发头，避免伪造 IP 绕过限流/封禁。
const { isIP } = require('node:net')

function requestProtocol(request, config) {
  if (config.trustProxy) {
    const forwarded = String(request.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim()
    if (forwarded === 'https' || forwarded === 'http') return forwarded
  }
  return request.socket.encrypted ? 'https' : 'http'
}

function requestOrigin(request, config) {
  // `publicURL` is the canonical address used for redirects and deployment
  // documentation. It must not be used for same-origin validation: a portal
  // configured as 127.0.0.1 is still legitimately reachable through a LAN IP
  // or a reverse-proxy hostname. Validate against the address the browser
  // actually used instead.
  const forwardedHost = config.trustProxy
    ? String(request.headers['x-forwarded-host'] || '')
        .split(',')[0]
        .trim()
    : ''
  const host = forwardedHost || String(request.headers.host || '').trim()
  if (host) return `${requestProtocol(request, config)}://${host}`
  return config.publicURL ? config.publicURL.origin : ''
}

function isSameOriginRequest(request, config) {
  const origin = String(request.headers.origin || '').trim()
  if (!origin) return true
  try {
    return new URL(origin).origin === requestOrigin(request, config)
  } catch {
    return false
  }
}

function normalizedAddress(value) {
  const address = String(value || '')
    .trim()
    .replace(/^::ffff:/, '')
  return isIP(address) ? address : ''
}

function clientAddress(request, config) {
  if (config.trustProxy) {
    const forwarded = String(request.headers['x-forwarded-for'] || '')
      .split(',')
      .map(normalizedAddress)
      .find(Boolean)
    if (forwarded) return forwarded
    const realAddress = normalizedAddress(request.headers['x-real-ip'])
    if (realAddress) return realAddress
  }
  return normalizedAddress(request.socket.remoteAddress)
}

module.exports = { requestProtocol, isSameOriginRequest, clientAddress }
