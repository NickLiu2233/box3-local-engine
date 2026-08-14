'use strict'

const fs = require('fs')
const http = require('http')
const net = require('net')
const path = require('path')
const { createRuntimeLifecycle } = require('./runtime-lifecycle')

const worldIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/

function readWorld(libraryRoot, id) {
  if (!worldIdPattern.test(id || '')) return null
  const root = path.join(libraryRoot, id)
  const manifestPath = path.join(root, 'manifest.json')
  const dataRoot = path.join(root, 'data')
  const statePath = path.join(dataRoot, 'project-state.json')
  const blobsRoot = path.join(dataRoot, 'blobs')
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
    if (
      manifest.id !== id ||
      typeof manifest.version !== 'string' ||
      !manifest.permissionHash ||
      state.permissionHash !== manifest.permissionHash ||
      !fs.statSync(blobsRoot).isDirectory()
    ) {
      return null
    }
    const stat = fs.statSync(manifestPath)
    return {
      id,
      root,
      dataRoot,
      statePath,
      manifest,
      signature: [
        stat.mtimeMs,
        stat.size,
        manifest.version,
        manifest.permissionHash,
        state.extraProjectHash || '',
      ].join(':'),
    }
  } catch {
    return null
  }
}

function listWorlds(libraryRoot) {
  try {
    return fs
      .readdirSync(libraryRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readWorld(libraryRoot, entry.name))
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id))
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

function resolveWorld(libraryRoot, reference) {
  const direct = readWorld(libraryRoot, reference)
  if (direct) return direct
  return listWorlds(libraryRoot).find((world) => {
    const publicId = worldIdPattern.test(String(world.manifest.publicId || ''))
      ? String(world.manifest.publicId)
      : world.id
    return publicId === reference
  }) || null
}

function requestPathWithoutWorld(requestUrl, id) {
  const parsed = new URL(requestUrl || '/', 'http://127.0.0.1')
  const prefix = `/${encodeURIComponent(id)}`
  const pathname = parsed.pathname === prefix
    ? '/'
    : parsed.pathname.slice(prefix.length) || '/'
  return `${pathname}${parsed.search}`
}

function extractWorldId(requestUrl) {
  try {
    const pathname = new URL(requestUrl || '/', 'http://127.0.0.1').pathname
    const segment = pathname.split('/').filter(Boolean)[0] || ''
    return decodeURIComponent(segment)
  } catch {
    return ''
  }
}

function startPlayLibrary({
  libraryRoot,
  host,
  port,
  runtimePortStart = 10000,
  startRuntime,
  waitForRuntime,
  maxRuntimes = 4,
  idleTimeoutMs = 15 * 60_000,
}) {
  fs.mkdirSync(libraryRoot, { recursive: true })
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

  const lifecycle = createRuntimeLifecycle({
    runtimes,
    starts,
    stopRuntime,
    setStatus,
    maxRuntimes,
    idleTimeoutMs,
  })

  async function ensureRuntime(reference) {
    const world = resolveWorld(libraryRoot, reference)
    if (!world) throw Object.assign(new Error('地图不存在或数据不完整'), { statusCode: 404 })
    const id = world.id
    const current = runtimes.get(id)
    if (current?.signature === world.signature && !current.exited) {
      lifecycle.touch(current)
      setStatus(id, { phase: 'ready', percent: 100, message: '游戏运行时已就绪' })
      return current
    }
    if (current) await stopRuntime(id)
    if (starts.has(id)) return starts.get(id)
    const promise = (async () => {
      await lifecycle.ensureCapacity(id)
      setStatus(id, { phase: 'starting', percent: 18, message: '正在创建独立游戏运行时' })
      const runtimePort = nextPort++
      const runtime = await startRuntime(world, runtimePort)
      lifecycle.touch(runtime)
      runtime.signature = world.signature
      runtimes.set(id, runtime)
      try {
        setStatus(id, { phase: 'loading', percent: 42, message: '正在加载地图与预烘焙资源' })
        await waitForRuntime(`http://127.0.0.1:${runtimePort}/api/health-check`, 120)
      } catch (error) {
        runtimes.delete(id)
        setStatus(id, { phase: 'error', percent: 0, message: error.message || '游戏运行时启动失败' })
        await runtime.stop()
        throw error
      }
      setStatus(id, { phase: 'ready', percent: 100, message: '游戏运行时已就绪' })
      console.log(`  Map ready: /p/${id}`)
      return runtime
    })().finally(() => starts.delete(id))
    starts.set(id, promise)
    return promise
  }

  const server = http.createServer(async (req, res) => {
    const reference = extractWorldId(req.url)
    const resolvedWorld = resolveWorld(libraryRoot, reference)
    const id = resolvedWorld?.id || reference
    try {
      const forwardedPath = requestPathWithoutWorld(req.url, reference)
      if (forwardedPath === '/__local_runtime/status') {
        const runtime = runtimes.get(id)
        if (runtime?.exited && statuses.get(id)?.phase === 'ready') {
          setStatus(id, { phase: 'error', percent: 0, message: '游戏运行时异常退出' })
        }
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(runtimeStatus(
          id,
          runtime,
          { phase: 'idle', percent: 0, message: '等待启动', updatedAt: '' },
        )))
        return
      }
      if (forwardedPath === '/__local_runtime/start' && req.method === 'POST') {
        if (!resolvedWorld) {
          res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ message: '地图不存在或数据不完整' }))
          return
        }
        void ensureRuntime(reference).catch(() => undefined)
        res.writeHead(202, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(statuses.get(id) || setStatus(id, { phase: 'starting', percent: 10, message: '正在启动' })))
        return
      }
      const runtime = await ensureRuntime(reference)
      const releaseConnection = lifecycle.acquire(runtime)
      res.once('close', releaseConnection)
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
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ message: error.message }))
      })
      req.pipe(proxy)
    } catch (error) {
      res.writeHead(error.statusCode || 500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ message: error.message }))
    }
  })

  server.on('upgrade', async (req, socket, head) => {
    const reference = extractWorldId(req.url)
    try {
      const runtime = await ensureRuntime(reference)
      const releaseConnection = lifecycle.acquire(runtime)
      socket.once('close', releaseConnection)
      const upstream = net.connect(runtime.port, '127.0.0.1')
      upstream.on('connect', () => {
        const headers = { ...req.headers, host: `127.0.0.1:${runtime.port}` }
        const lines = [
          `${req.method} ${requestPathWithoutWorld(req.url, reference)} HTTP/${req.httpVersion}`,
          ...Object.entries(headers).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`),
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

  const scanTimer = setInterval(() => {
    const worlds = new Map(listWorlds(libraryRoot).map((world) => [world.id, world]))
    for (const [id, runtime] of runtimes) {
      const world = worlds.get(id)
      if (!world || world.signature !== runtime.signature) {
        stopRuntime(id).catch((error) => console.error(`Unable to stop map ${id}:`, error))
      }
    }
    lifecycle.collectIdle().catch((error) =>
      console.error('Unable to recycle idle map runtimes:', error))
  }, 3000)
  scanTimer.unref()

  const ready = new Promise((resolve) => server.listen(port, host, resolve))

  return {
    server,
    ready,
    listWorlds: () => listWorlds(libraryRoot),
    async stop() {
      if (closed) return
      closed = true
      clearInterval(scanTimer)
      await new Promise((resolve) => server.close(resolve))
      await Promise.all([...runtimes.keys()].map(stopRuntime))
    },
  }
}

module.exports = { listWorlds, readWorld, resolveWorld, startPlayLibrary }
