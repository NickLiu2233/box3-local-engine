'use strict'

const fs = require('fs')
const http = require('http')
const net = require('net')
const path = require('path')

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
}) {
  fs.mkdirSync(libraryRoot, { recursive: true })
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
    const world = readWorld(libraryRoot, id)
    if (!world) throw Object.assign(new Error('地图不存在或数据不完整'), { statusCode: 404 })
    const current = runtimes.get(id)
    if (current?.signature === world.signature && !current.exited) return current
    if (current) await stopRuntime(id)
    if (starts.has(id)) return starts.get(id)

    const promise = (async () => {
      const runtimePort = nextPort++
      const runtime = await startRuntime(world, runtimePort)
      runtime.signature = world.signature
      runtimes.set(id, runtime)
      try {
        await waitForRuntime(`http://127.0.0.1:${runtimePort}/api/health-check`, 120)
      } catch (error) {
        runtimes.delete(id)
        await runtime.stop()
        throw error
      }
      console.log(`  Map ready: /p/${id}`)
      return runtime
    })().finally(() => starts.delete(id))
    starts.set(id, promise)
    return promise
  }

  const server = http.createServer(async (req, res) => {
    const id = extractWorldId(req.url)
    try {
      const runtime = await ensureRuntime(id)
      const proxy = http.request({
        hostname: '127.0.0.1',
        port: runtime.port,
        method: req.method,
        path: requestPathWithoutWorld(req.url, id),
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
    const id = extractWorldId(req.url)
    try {
      const runtime = await ensureRuntime(id)
      const upstream = net.connect(runtime.port, '127.0.0.1')
      upstream.on('connect', () => {
        const headers = { ...req.headers, host: `127.0.0.1:${runtime.port}` }
        const lines = [
          `${req.method} ${requestPathWithoutWorld(req.url, id)} HTTP/${req.httpVersion}`,
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

module.exports = { listWorlds, readWorld, startPlayLibrary }
