'use strict'

const http = require('http')
const net = require('net')

const projectIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/

function extractProjectId(requestUrl) {
  try {
    const pathname = new URL(requestUrl || '/', 'http://127.0.0.1').pathname
    const segment = pathname.split('/').filter(Boolean)[0] || ''
    return decodeURIComponent(segment)
  } catch {
    return ''
  }
}

function requestPathWithoutProject(requestUrl, id) {
  const parsed = new URL(requestUrl || '/', 'http://127.0.0.1')
  const prefix = `/${encodeURIComponent(id)}`
  const pathname = parsed.pathname === prefix
    ? '/'
    : parsed.pathname.slice(prefix.length) || '/'
  return `${pathname}${parsed.search}`
}

/**
 * boxes allocates one edit container per map and returns that container's
 * address to the browser. This is the local equivalent: one stable proxy port
 * allocates an isolated child runtime per project and routes by project id.
 */
function startEditLibrary({
  host,
  port,
  mode = 'edit',
  runtimePortStart = 11000,
  resolveProject,
  startRuntime,
  waitForRuntime,
}) {
  const runtimes = new Map()
  const starts = new Map()
  let nextPort = runtimePortStart
  let closed = false

  async function stopRuntime(id) {
    const runtime = runtimes.get(id)
    if (!runtime) return
    runtimes.delete(id)
    await runtime.stop()
  }

  async function ensureRuntime(id) {
    if (!projectIdPattern.test(id || '')) {
      throw Object.assign(new Error('工程 ID 无效'), { statusCode: 400 })
    }
    const project = resolveProject(id)
    if (!project) {
      throw Object.assign(new Error('工程不存在'), { statusCode: 404 })
    }
    const current = runtimes.get(id)
    if (current && !current.exited) return current
    if (starts.has(id)) return starts.get(id)

    const promise = (async () => {
      const runtimePort = nextPort++
      const runtime = await startRuntime(project, runtimePort)
      runtimes.set(id, runtime)
      try {
        await waitForRuntime(
          `http://127.0.0.1:${runtimePort}/api/health-check`,
          120,
        )
      } catch (error) {
        runtimes.delete(id)
        await runtime.stop()
        throw error
      }
      console.log(
        mode === 'play'
          ? `  Play project ready: /p/${id}`
          : `  Edit project ready: /e/${id}`
      )
      return runtime
    })().finally(() => starts.delete(id))
    starts.set(id, promise)
    return promise
  }

  const server = http.createServer(async (req, res) => {
    const id = extractProjectId(req.url)
    try {
      const runtime = await ensureRuntime(id)
      const proxy = http.request({
        hostname: '127.0.0.1',
        port: runtime.port,
        method: req.method,
        path: requestPathWithoutProject(req.url, id),
        headers: { ...req.headers, host: `127.0.0.1:${runtime.port}` },
      }, (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers)
        upstream.pipe(res)
      })
      proxy.on('error', (error) => {
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
        }
        res.end(JSON.stringify({ message: error.message }))
      })
      req.pipe(proxy)
    } catch (error) {
      res.writeHead(error.statusCode || 500, {
        'content-type': 'application/json; charset=utf-8',
      })
      res.end(JSON.stringify({ message: error.message }))
    }
  })

  server.on('upgrade', async (req, socket, head) => {
    const id = extractProjectId(req.url)
    try {
      const runtime = await ensureRuntime(id)
      const upstream = net.connect(runtime.port, '127.0.0.1')
      upstream.on('connect', () => {
        const headers = { ...req.headers, host: `127.0.0.1:${runtime.port}` }
        const lines = [
          `${req.method} ${requestPathWithoutProject(req.url, id)} HTTP/${req.httpVersion}`,
          ...Object.entries(headers).map(([key, value]) =>
            `${key}: ${Array.isArray(value) ? value.join(', ') : value}`,
          ),
          '',
          '',
        ]
        upstream.write(lines.join('\r\n'))
        if (head.length) upstream.write(head)
        socket.pipe(upstream).pipe(socket)
      })
      upstream.on('error', () => socket.destroy())
      socket.on('error', () => upstream.destroy())
    } catch {
      socket.destroy()
    }
  })

  const ready = new Promise((resolve) => server.listen(port, host, resolve))

  return {
    server,
    ready,
    ensureRuntime,
    async stop() {
      if (closed) return
      closed = true
      await new Promise((resolve) => server.close(resolve))
      await Promise.all([...runtimes.keys()].map(stopRuntime))
    },
  }
}

module.exports = { startEditLibrary }
