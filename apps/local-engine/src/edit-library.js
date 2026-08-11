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
  const statuses = new Map()
  let nextPort = runtimePortStart
  let closed = false

  const setStatus = (id, status) => {
    const next = { ...status, updatedAt: new Date().toISOString() }
    statuses.set(id, next)
    return next
  }

  const runtimeStatus = (id, runtime, fallback) => ({
    ...(statuses.get(id) || fallback),
    ...(runtime && !runtime.exited
      ? {
          port: runtime.port,
          pid: runtime.pid,
          startedAt: runtime.startedAt,
        }
      : {}),
  })

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
    if (current && !current.exited) {
      setStatus(id, { phase: 'ready', percent: 100, message: '运行时已就绪' })
      return current
    }
    if (starts.has(id)) return starts.get(id)

    const promise = (async () => {
      setStatus(id, { phase: 'starting', percent: 18, message: '正在创建独立运行时' })
      const runtimePort = nextPort++
      const runtime = await startRuntime(project, runtimePort)
      runtimes.set(id, runtime)
      try {
        setStatus(id, { phase: 'loading', percent: 42, message: '正在加载工程与预烘焙资源' })
        await waitForRuntime(
          `http://127.0.0.1:${runtimePort}/api/health-check`,
          120,
        )
      } catch (error) {
        runtimes.delete(id)
        setStatus(id, { phase: 'error', percent: 0, message: error.message || '运行时启动失败' })
        await runtime.stop()
        throw error
      }
      setStatus(id, { phase: 'ready', percent: 100, message: '运行时已就绪' })
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
      const forwardedPath = requestPathWithoutProject(req.url, id)
      if (forwardedPath === '/__local_runtime/status') {
        const runtime = runtimes.get(id)
        if (runtime?.exited && statuses.get(id)?.phase === 'ready') {
          setStatus(id, { phase: 'error', percent: 0, message: '运行时异常退出' })
        }
        const status = runtimeStatus(
          id,
          runtime,
          runtime && !runtime.exited
            ? { phase: 'ready', percent: 100, message: '运行时已就绪' }
            : { phase: 'idle', percent: 0, message: '等待启动', updatedAt: '' },
        )
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(status))
        return
      }
      if (forwardedPath === '/__local_runtime/start' && req.method === 'POST') {
        if (!projectIdPattern.test(id || '') || !resolveProject(id)) {
          res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ message: '工程不存在' }))
          return
        }
        void ensureRuntime(id).catch(() => undefined)
        res.writeHead(202, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(statuses.get(id) || setStatus(id, { phase: 'starting', percent: 10, message: '正在启动' })))
        return
      }
      const existingRuntime = runtimes.get(id)
      // Publishing asks an already-open editor to flush its state. A project
      // that is not open is already authoritative on disk and must not start a
      // heavyweight edit runtime merely to acknowledge this request.
      if (forwardedPath === '/internal/save-local-project' && !existingRuntime) {
        res.writeHead(204)
        res.end()
        return
      }
      const runtime = existingRuntime && !existingRuntime.exited
        ? existingRuntime
        : await ensureRuntime(id)
      const proxy = http.request({
        hostname: '127.0.0.1',
        port: runtime.port,
        method: req.method,
        path: forwardedPath,
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
