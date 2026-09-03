'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const Fastify = require('fastify')
const rateLimit = require('@fastify/rate-limit')
const { z } = require('zod')
const { createLicenseIssuer } = require('./issuer')

const issueSchema = z.object({
  deviceId: z.string().regex(/^dev_[a-f0-9]{64}$/),
  expiresAt: z.iso.datetime({ offset: true }),
})

function safeEqual(left, right) {
  const first = Buffer.from(String(left || ''))
  const second = Buffer.from(String(right || ''))
  return first.length === second.length && crypto.timingSafeEqual(first, second)
}

function createServer(options = {}) {
  const adminToken = options.adminToken || process.env.BOX_LICENSE_ADMIN_TOKEN || ''
  if (adminToken.length < 32) throw new Error('BOX_LICENSE_ADMIN_TOKEN 至少需要 32 个字符')
  const privateKeyPath = process.env.BOX_LICENSE_PRIVATE_KEY_PATH || ''
  if (!options.privateKey && !privateKeyPath) {
    throw new Error('必须设置 BOX_LICENSE_PRIVATE_KEY_PATH')
  }
  const privateKey = options.privateKey || fs.readFileSync(privateKeyPath, 'utf8')
  const timePrivateKeyPath = process.env.BOX_LICENSE_TIME_PRIVATE_KEY_PATH || ''
  const timePrivateKey =
    options.timePrivateKey ||
    (timePrivateKeyPath ? fs.readFileSync(timePrivateKeyPath, 'utf8') : '')
  const issuer = options.issuer || createLicenseIssuer(privateKey, { timePrivateKey })
  const app = Fastify({
    logger: { redact: ['req.headers.authorization', 'res.body.token'] },
    bodyLimit: 16 * 1024,
    trustProxy: false,
  })

  app.register(rateLimit, { max: 60, timeWindow: '1 minute' })
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    )
  })
  app.setErrorHandler((error, _request, reply) => {
    const status = error.name === 'ZodError' ? 400 : Number(error.statusCode) || 500
    reply.code(status).send({
      error: status >= 500 ? 'internal-error' : 'request-rejected',
      message: status >= 500 ? '签发器无法完成请求' : error.message,
    })
  })

  app.get('/v1/health', async () => ({ ok: true, mode: 'offline-issuer' }))
  // This endpoint is intended for a separately deployed issuer under HTTPS.
  // The token is signed, so clients never trust an unsigned HTTP Date header.
  if (typeof issuer.issueTrustedTime === 'function') {
    app.get('/v1/time', async () => issuer.issueTrustedTime())
  }
  const adminAssets = new Map([
    ['/admin', ['index.html', 'text/html; charset=utf-8']],
    ['/admin/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/admin/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ])
  app.get('/admin*', async (request, reply) => {
    const asset = adminAssets.get(request.url.split('?')[0])
    if (!asset) return reply.code(404).send({ error: 'not-found' })
    const [file, type] = asset
    return reply.type(type).send(fs.readFileSync(path.join(__dirname, 'public', file)))
  })

  app.register(
    async function adminRoutes(admin) {
      admin.addHook('onRequest', async (request, reply) => {
        const authorization = String(request.headers.authorization || '')
        if (
          !authorization.startsWith('Bearer ') ||
          !safeEqual(authorization.slice(7), adminToken)
        ) {
          return reply.code(401).send({ error: 'unauthorized', message: '管理令牌无效' })
        }
      })
      admin.get('/session', async () => ({ authenticated: true }))
      admin.post('/licenses/issue', async (request) =>
        issuer.issue(issueSchema.parse(request.body)),
      )
    },
    { prefix: '/v1/admin' },
  )

  return app
}

if (require.main === module) {
  const host = process.env.BOX_LICENSE_HOST || '127.0.0.1'
  const port = Number(process.env.BOX_LICENSE_PORT || 3220)
  createServer()
    .listen({ host, port })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}

module.exports = { createServer, safeEqual }
