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
      assert.equal(await get(address.port, '/project-one/api/health-check'), 'project-one:/api/health-check')
      assert.equal(await get(address.port, '/project-two/api/health-check'), 'project-two:/api/health-check')
      assert.equal(
        await get(address.port, '/project-one/internal/save-local-project'),
        'project-one:/internal/save-local-project',
      )
      assert.equal(children.size, 2)
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
