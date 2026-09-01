'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { startPlayLibrary } = require('../src/play-library')

async function main() {
  const libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-play-library-'))
  const worldRoot = path.join(libraryRoot, 'slow-world')
  fs.mkdirSync(path.join(worldRoot, 'data', 'blobs'), { recursive: true })
  fs.writeFileSync(
    path.join(worldRoot, 'manifest.json'),
    JSON.stringify({
      id: 'slow-world',
      version: '1',
      permissionHash: 'permission-hash',
      permanentMapId: '29c244e93afa4c9c886d',
    }),
  )
  fs.writeFileSync(
    path.join(worldRoot, 'data', 'project-state.json'),
    JSON.stringify({ permissionHash: 'permission-hash' }),
  )

  let releaseHealthCheck
  const healthCheckReady = new Promise((resolve) => {
    releaseHealthCheck = resolve
  })
  let startCalls = 0
  const runtime = {
    port: 19160,
    exited: false,
    async stop() {
      runtime.exited = true
    },
  }
  const library = startPlayLibrary({
    libraryRoot,
    host: '127.0.0.1',
    port: 0,
    runtimePortStart: runtime.port,
    startRuntime: async () => {
      startCalls += 1
      return runtime
    },
    waitForRuntime: async () => healthCheckReady,
  })
  await library.ready

  try {
    const firstStartup = library.ensureRuntime('slow-world')
    await new Promise((resolve) => setImmediate(resolve))
    let secondResolved = false
    const secondStartup = library.ensureRuntime('slow-world').then((value) => {
      secondResolved = true
      return value
    })
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(
      secondResolved,
      false,
      'a second caller must not receive a play runtime before its health check passes',
    )
    assert.equal(startCalls, 1)
    releaseHealthCheck()
    const [first, second] = await Promise.all([firstStartup, secondStartup])
    assert.equal(first, second)
    assert.equal(first.exited, false)
    console.log('play runtime startup sharing regression passed')
  } finally {
    await library.stop()
    fs.rmSync(libraryRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
