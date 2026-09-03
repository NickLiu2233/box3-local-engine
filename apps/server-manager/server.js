'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { createOperations } = require('./operations')

const publicRoot = path.join(__dirname, 'public')
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/logo512.png', ['logo512.png', 'image/png']],
])

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function safeEqual(left, right) {
  const first = Buffer.from(String(left || ''))
  const second = Buffer.from(String(right || ''))
  return first.length === second.length && crypto.timingSafeEqual(first, second)
}

function authorized(request, token) {
  const header = String(request.headers.authorization || '')
  return header.startsWith('Bearer ') && safeEqual(header.slice(7), token)
}

function sameOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

function readJson(request, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('请求内容过大'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('JSON 格式无效'))
      }
    })
    request.on('error', reject)
  })
}

function createServer(options = {}) {
  const token = options.token || process.env.BOX_SERVER_MANAGER_TOKEN || ''
  if (token.length < 32 || token.startsWith('CHANGE_ME_')) {
    throw new Error('BOX_SERVER_MANAGER_TOKEN 至少需要 32 个字符且不能使用默认值')
  }
  const operations = options.operations || createOperations(options)
  let mutation = Promise.resolve()

  function enqueue(task) {
    const next = mutation.catch(() => undefined).then(task)
    mutation = next.catch(() => undefined)
    return next
  }

  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    )
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    const url = new URL(request.url || '/', 'http://localhost')
    if (request.method === 'GET' && url.pathname === '/api/health') {
      json(response, 200, { ok: true })
      return
    }
    const staticFile = staticFiles.get(url.pathname)
    if (request.method === 'GET' && staticFile) {
      const [file, type] = staticFile
      const primary = path.join(publicRoot, file)
      const fallback = path.join(__dirname, '..', 'deployment-manager', 'public', file)
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
      response.end(fs.readFileSync(fs.existsSync(primary) ? primary : fallback))
      return
    }
    if (!url.pathname.startsWith('/api/')) {
      json(response, 404, { message: 'Not found' })
      return
    }
    if (!authorized(request, token)) {
      json(response, 401, { message: '管理令牌无效' })
      return
    }
    if (!sameOrigin(request)) {
      json(response, 403, { message: '拒绝跨站管理请求' })
      return
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/status') {
        json(response, 200, await operations.getStatus())
      } else if (request.method === 'GET' && url.pathname === '/api/license') {
        json(response, 200, operations.getLicenseStatus())
      } else if (request.method === 'PUT' && url.pathname === '/api/license') {
        const body = await readJson(request)
        json(response, 200, operations.installLicense(body.token))
      } else if (request.method === 'GET' && url.pathname === '/api/config') {
        json(response, 200, { fields: operations.getConfiguration() })
      } else if (request.method === 'PUT' && url.pathname === '/api/config') {
        const body = await readJson(request)
        json(response, 200, {
          fields: await enqueue(() => operations.saveConfiguration(body.values)),
        })
      } else if (request.method === 'GET' && url.pathname === '/api/logs') {
        json(response, 200, {
          logs: await operations.getLogs(url.searchParams.get('service') || ''),
        })
      } else if (request.method === 'POST' && url.pathname === '/api/control') {
        const body = await readJson(request)
        json(
          response,
          200,
          await enqueue(() => operations.control(body.action, body.service || 'all')),
        )
      } else {
        json(response, 404, { message: 'Not found' })
      }
    } catch (error) {
      json(response, 400, { message: error instanceof Error ? error.message : String(error) })
    }
  })
}

if (require.main === module) {
  const host = process.env.BOX_SERVER_MANAGER_HOST || '0.0.0.0'
  const port = Number(process.env.BOX_SERVER_MANAGER_PORT || 3130)
  const server = createServer()
  server.listen(port, host, () => {
    console.log(`BOX3 Engine server manager listening on http://${host}:${port}`)
  })
}

module.exports = { authorized, createServer, readJson, sameOrigin, safeEqual }
