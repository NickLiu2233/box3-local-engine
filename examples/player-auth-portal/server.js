'use strict'

const { readFile } = require('node:fs/promises')
const http = require('node:http')
const { isIP } = require('node:net')
const path = require('node:path')

const publicDirectory = path.join(__dirname, 'public')
const maximumBodyBytes = 32 * 1024

const assets = new Map([
  ['/', { file: 'index.html', type: 'text/html; charset=utf-8' }],
  ['/theme.js', { file: 'theme.js', type: 'text/javascript; charset=utf-8' }],
  ['/app.js', { file: 'app.js', type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: 'styles.css', type: 'text/css; charset=utf-8' }],
])

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
  const apiKey = String(environment.AUTH_DEMO_API_KEY || '').trim()
  if (apiKey.length < 16) {
    throw new Error('AUTH_DEMO_API_KEY must contain at least 16 characters')
  }
  return {
    host: String(environment.AUTH_DEMO_HOST || '127.0.0.1').trim(),
    port: integer(environment.AUTH_DEMO_PORT, 3214, 1, 65535, 'AUTH_DEMO_PORT'),
    playerServiceURL: requiredURL(
      environment.AUTH_DEMO_PLAYER_SERVICE_URL,
      'AUTH_DEMO_PLAYER_SERVICE_URL',
    ),
    publicURL: optionalURL(environment.AUTH_DEMO_PUBLIC_URL, 'AUTH_DEMO_PUBLIC_URL'),
    creatorURL: optionalURL(environment.AUTH_DEMO_CREATOR_URL, 'AUTH_DEMO_CREATOR_URL'),
    playURL: optionalURL(environment.AUTH_DEMO_PLAY_URL, 'AUTH_DEMO_PLAY_URL'),
    apiKey,
    requestTimeoutMs: integer(
      environment.AUTH_DEMO_REQUEST_TIMEOUT_MS,
      10_000,
      1_000,
      60_000,
      'AUTH_DEMO_REQUEST_TIMEOUT_MS',
    ),
    trustProxy: environment.AUTH_DEMO_TRUST_PROXY === 'true',
    registrationEnabled: enabled(environment.AUTH_DEMO_REGISTRATION_ENABLED, true),
  }
}

function sendJSON(response, statusCode, value, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(value))
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders,
  })
  response.end(body)
}

function sendError(response, statusCode, code, message) {
  sendJSON(response, statusCode, { code, message })
}

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
  if (config.publicURL) return config.publicURL.origin
  const host = String(request.headers.host || '').trim()
  return host ? `${requestProtocol(request, config)}://${host}` : ''
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

function trustedReturnURL(source, requested, config) {
  const base = source === 'creator' ? config.creatorURL : source === 'play' ? config.playURL : null
  if (!base) return null
  if (!requested) return base.toString()
  try {
    const candidate = new URL(requested, base)
    return candidate.origin === base.origin ? candidate.toString() : base.toString()
  } catch {
    return base.toString()
  }
}

async function readJSONBody(request) {
  const contentType = String(request.headers['content-type'] || '').toLowerCase()
  if (!contentType.startsWith('application/json')) {
    const error = new Error('Content-Type must be application/json')
    error.statusCode = 415
    error.code = 'UNSUPPORTED_MEDIA_TYPE'
    throw error
  }
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maximumBodyBytes) {
      const error = new Error('Request body is too large')
      error.statusCode = 413
      error.code = 'BODY_TOO_LARGE'
      throw error
    }
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch {
    const error = new Error('Request body must be a JSON object')
    error.statusCode = 400
    error.code = 'INVALID_JSON'
    throw error
  }
}

function responseCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const cookie = headers.get('set-cookie')
  return cookie ? [cookie] : []
}

async function proxyAuthentication(request, response, config, operation) {
  if (operation.method !== request.method) {
    response.setHeader('Allow', operation.method)
    return sendError(response, 405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
  }
  if (operation.name === 'register' && config.registrationEnabled === false) {
    return sendError(response, 403, 'REGISTRATION_DISABLED', '服主已关闭玩家注册')
  }
  if (operation.method !== 'GET' && !isSameOriginRequest(request, config)) {
    return sendError(response, 403, 'ORIGIN_NOT_ALLOWED', '请求来源不受允许')
  }

  let browserBody = {}
  if (operation.method !== 'GET') browserBody = await readJSONBody(request)
  const source = String(browserBody.source || operation.search.get('source') || '')
  const requestedReturnURL = String(
    browserBody.returnUrl || operation.search.get('returnUrl') || '',
  )
  const returnUrl = trustedReturnURL(source, requestedReturnURL, config)
  let upstreamBody
  if (operation.name === 'login') {
    upstreamBody = {
      username: browserBody.username,
      password: browserBody.password,
    }
  } else if (operation.name === 'register') {
    upstreamBody = {
      username: browserBody.username,
      displayName: browserBody.displayName,
      password: browserBody.password,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)
  timeout.unref()
  try {
    const upstreamHeaders = {
      'Accept': 'application/json',
      'X-Box-Player-Auth-Key': config.apiKey,
      'User-Agent': String(request.headers['user-agent'] || '').slice(0, 512),
      'X-Forwarded-Proto': requestProtocol(request, config),
    }
    const cookie = String(request.headers.cookie || '')
    if (cookie) upstreamHeaders.Cookie = cookie
    const address = clientAddress(request, config)
    if (address) {
      upstreamHeaders['X-Forwarded-For'] = address
      upstreamHeaders['X-Real-IP'] = address
    }
    if (upstreamBody) upstreamHeaders['Content-Type'] = 'application/json'

    const upstream = await fetch(
      new URL(`/api/player-auth/${operation.name}`, config.playerServiceURL),
      {
        method: operation.method,
        headers: upstreamHeaders,
        body: upstreamBody ? JSON.stringify(upstreamBody) : undefined,
        redirect: 'manual',
        signal: controller.signal,
      },
    )
    const parsed = await upstream.json().catch(() => null)
    const data =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {
            code: 'INVALID_UPSTREAM_RESPONSE',
            message: '玩家服务返回了无法解析的响应',
          }
    if (operation.name === 'session') {
      data.registrationEnabled =
        config.registrationEnabled !== false && data.registrationEnabled !== false
    }
    if (returnUrl) data.returnUrl = returnUrl
    const headers = {}
    const cookies = responseCookies(upstream.headers)
    if (cookies.length) headers['Set-Cookie'] = cookies
    const retryAfter = upstream.headers.get('retry-after')
    if (retryAfter) headers['Retry-After'] = retryAfter
    return sendJSON(response, upstream.status, data, headers)
  } catch (error) {
    const timeoutError = error && error.name === 'AbortError'
    if (operation.name === 'session') {
      return sendJSON(response, 502, {
        code: timeoutError ? 'PLAYER_SERVICE_TIMEOUT' : 'PLAYER_SERVICE_UNAVAILABLE',
        message: timeoutError ? '玩家服务响应超时' : '暂时无法连接玩家服务',
        registrationEnabled: config.registrationEnabled !== false,
      })
    }
    return sendError(
      response,
      502,
      timeoutError ? 'PLAYER_SERVICE_TIMEOUT' : 'PLAYER_SERVICE_UNAVAILABLE',
      timeoutError ? '玩家服务响应超时' : '暂时无法连接玩家服务',
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function serveAsset(response, asset) {
  const filePath = path.join(publicDirectory, asset.file)
  const stat = await readFile(filePath)
  response.writeHead(200, {
    'Content-Type': asset.type,
    'Content-Length': stat.length,
    'Cache-Control':
      asset.file === 'index.html' ? 'no-store' : 'public, max-age=300, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  })
  response.end(stat)
}

function createAuthPortalServer(config) {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'same-origin')
    try {
      const requestURL = new URL(request.url || '/', 'http://localhost')
      const operation = {
        '/api/auth/login': { name: 'login', method: 'POST' },
        '/api/auth/register': { name: 'register', method: 'POST' },
        '/api/auth/session': { name: 'session', method: 'GET' },
        '/api/auth/logout': { name: 'logout', method: 'POST' },
      }[requestURL.pathname]
      if (request.method === 'GET' && requestURL.pathname === '/api/health-check') {
        return sendJSON(response, 200, {
          status: 'ok',
          service: 'player-auth-portal',
        })
      }
      if (operation) {
        return await proxyAuthentication(request, response, config, {
          ...operation,
          search: requestURL.searchParams,
        })
      }
      if (request.method === 'GET' && assets.has(requestURL.pathname)) {
        return await serveAsset(response, assets.get(requestURL.pathname))
      }
      return sendError(response, 404, 'NOT_FOUND', '页面不存在')
    } catch (error) {
      return sendError(
        response,
        error.statusCode || 500,
        error.code || 'INTERNAL_ERROR',
        error.statusCode ? error.message : '服务暂时不可用',
      )
    }
  })
}

if (require.main === module) {
  try {
    const config = configFromEnvironment()
    const server = createAuthPortalServer(config)
    server.listen(config.port, config.host, () => {
      console.log(`BOX player login example: http://${config.host}:${config.port}`)
    })
  } catch (error) {
    console.error(`Cannot start player login example: ${error.message}`)
    process.exitCode = 1
  }
}

module.exports = {
  configFromEnvironment,
  createAuthPortalServer,
  trustedReturnURL,
}
