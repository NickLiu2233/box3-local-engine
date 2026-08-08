'use strict'

const assert = require('assert')
const http = require('http')
const { startEditLibrary } = require('../src/edit-library')

function listen(server, port) {
  return new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
}

function close(server) {
  return new Promise((resolve) => server.close(resolve))
}

async function get(port, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks).toString()))
    }).on('error', reject)
  })
}

async function post(port, path) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'POST',
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve({
        statusCode: response.statusCode,
        body: Buffer.concat(chunks).toString(),
      }))
    })
    request.on('error', reject)
    request.end()
  })
}

async function main() {
  async function verifyMode(mode, proxyPortStart, runtimePortStart) {
    const children = new Map()
    const library = startEditLibrary({
    mode,
    host: '127.0.0.1',
    port: proxyPortStart,
    runtimePortStart,
    resolveProject: (id) => ({ id }),
    waitForRuntime: async () => undefined,
    startRuntime: async (project, port) => {
      const server = http.createServer((req, res) => res.end(`${project.id}:${req.url}`))
      await listen(server, port)
      const runtime = {
        port,
        exited: false,
        async stop() {
          runtime.exited = true
          await close(server)
        },
      }
      children.set(project.id, runtime)
      return runtime
    },
  })
    await library.ready
    const address = library.server.address()
    assert(address && typeof address !== 'string')

    try {
      assert.equal(
        JSON.parse(await get(address.port, '/project-status/__local_runtime/status')).phase,
        'idle',
      )
      const startResponse = await post(address.port, '/project-status/__local_runtime/start')
      assert.equal(startResponse.statusCode, 202)
      await new Promise((resolve) => setImmediate(resolve))
      assert.equal(
        JSON.parse(await get(address.port, '/project-status/__local_runtime/status')).phase,
        'ready',
      )
      assert.equal(
        await get(address.port, '/project-idle/internal/save-local-project'),
        '',
      )
      assert.equal(children.has('project-idle'), false)
      assert.equal(await get(address.port, '/project-one/api/health-check'), 'project-one:/api/health-check')
      assert.equal(await get(address.port, '/project-two/api/health-check'), 'project-two:/api/health-check')
      assert.equal(
        await get(address.port, '/project-one/internal/save-local-project'),
        'project-one:/internal/save-local-project',
      )
      assert.equal(children.size, 3)
      assert.equal(children.get('project-status').exited, false)
      assert.equal(children.get('project-one').exited, false)
      assert.equal(children.get('project-two').exited, false)
      console.log(`PASS: two ${mode} projects keep independent runtimes alive`)
    } finally {
      await library.stop()
    }
  }

  await verifyMode('edit', 0, 19120)
  await verifyMode('play', 0, 19140)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
