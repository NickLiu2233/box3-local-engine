const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const { startPlayLibrary } = require('../apps/local-engine/src/play-library')
const { startEditLibrary } = require('../apps/local-engine/src/edit-library')

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
}

function close(server) {
  return new Promise((resolve) => server.close(resolve))
}

function request(port, pathname, { method = 'GET', body, token } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body)
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: pathname,
      method,
      headers: {
        ...(payload
          ? {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(payload),
            }
          : {}),
        ...(token ? { 'x-box-teleport-token': token } : {}),
      },
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({
          status: res.statusCode,
          body: text ? JSON.parse(text) : undefined,
        })
      })
    })
    req.on('error', reject)
    req.end(payload)
  })
}

async function mockRuntime(project, instance, starts) {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({
      projectId: project.id,
      serverId: instance.serverId,
      privateRoom: instance.privateRoom,
      path: req.url,
    }))
  })
  await listen(server)
  const address = server.address()
  const runtime = {
    port: address.port,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    exited: false,
    async stop() {
      if (runtime.exited) return
      runtime.exited = true
      await close(server)
    },
  }
  starts.push({ projectId: project.id, ...instance, runtime })
  return runtime
}

function writeWorld(root, id, publicId, mapUuid, mapGroupUuid) {
  const worldRoot = path.join(root, id)
  fs.mkdirSync(path.join(worldRoot, 'data', 'blobs'), { recursive: true })
  fs.writeFileSync(path.join(worldRoot, 'manifest.json'), JSON.stringify({
    id,
    publicId,
    version: '1.0.0',
    permissionHash: `permission-${id}`,
    mapUuid,
    mapGroupUuid,
    mapGroupId: 'main-map',
    mainProjectId: 'main-map',
  }))
  fs.writeFileSync(path.join(worldRoot, 'data', 'project-state.json'), JSON.stringify({
    permissionHash: `permission-${id}`,
  }))
}

test('play library keeps public and teleported rooms in isolated runtimes', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-teleport-play-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  writeWorld(
    root,
    'main-map',
    'town',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  )
  writeWorld(
    root,
    'sub-map',
    'dungeon',
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  )
  const starts = []
  const library = startPlayLibrary({
    libraryRoot: root,
    host: '127.0.0.1',
    port: 0,
    teleportInternalToken: 'integration-token',
    startRuntime: (project, _port, instance) =>
      mockRuntime(project, instance, starts),
    waitForRuntime: async () => undefined,
  })
  await library.ready
  t.after(() => library.stop())
  const port = library.server.address().port

  const publicResponse = await request(port, '/sub-map/probe')
  assert.equal(publicResponse.status, 200)
  assert.equal(publicResponse.body.serverId, 'public')

  const allocation = await request(port, '/__local_teleport/allocate', {
    method: 'POST',
    token: 'integration-token',
    body: {
      sourceMapId: '11111111-1111-4111-8111-111111111111',
      targetMapId: '22222222-2222-4222-8222-222222222222',
      subjectIds: ['player-a'],
    },
  })
  assert.equal(allocation.status, 200)
  assert.match(allocation.body.serverId, /^[A-Za-z0-9_-]{16,128}$/)
  assert.equal(starts.length, 2)
  assert.equal(starts[0].privateRoom, false)
  assert.equal(starts[1].privateRoom, true)
  assert.notEqual(starts[0].runtime, starts[1].runtime)

  const roomResponse = await request(
    port,
    `/sub-map/__room/${allocation.body.serverId}/probe`,
  )
  assert.equal(roomResponse.status, 200)
  assert.equal(roomResponse.body.serverId, allocation.body.serverId)

  const denied = await request(port, '/__local_teleport/authorize', {
    method: 'POST',
    token: 'integration-token',
    body: {
      targetMapId: '22222222-2222-4222-8222-222222222222',
      serverId: allocation.body.serverId,
      subjectId: 'player-b',
    },
  })
  assert.equal(denied.status, 403)
  assert.equal(denied.body.code, 'ROOM_ACCESS_DENIED')

  const mutableId = await request(port, '/__local_teleport/allocate', {
    method: 'POST',
    token: 'integration-token',
    body: {
      sourceMapId: '11111111-1111-4111-8111-111111111111',
      targetMapId: 'dungeon',
      subjectIds: ['player-a'],
    },
  })
  assert.equal(mutableId.status, 400)
  assert.equal(mutableId.body.code, 'MAP_UUID_REQUIRED')
})

test('creator edit switches maps without allocating a room runtime', async (t) => {
  const projects = [
    { id: 'main-map', publicId: 'town', mapUuid: '11111111-1111-4111-8111-111111111111', mapGroupUuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { id: 'sub-map', publicId: 'dungeon', mapUuid: '22222222-2222-4222-8222-222222222222', mapGroupUuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  ]
  const starts = []
  const library = startEditLibrary({
    host: '127.0.0.1',
    port: 0,
    mode: 'edit',
    resolveProject: (reference) => projects.find(
      (project) =>
        project.id === reference ||
        project.publicId === reference ||
        project.mapUuid === reference,
    ) || null,
    teleportInternalToken: 'integration-token',
    startRuntime: (project, _port, instance) =>
      mockRuntime(project, instance, starts),
    waitForRuntime: async () => undefined,
  })
  await library.ready
  t.after(() => library.stop())
  const port = library.server.address().port

  const allocation = await request(port, '/__local_teleport/allocate', {
    method: 'POST',
    token: 'integration-token',
    body: {
      sourceMapId: '11111111-1111-4111-8111-111111111111',
      targetMapId: '22222222-2222-4222-8222-222222222222',
      subjectIds: ['player-a'],
      mode: 'edit',
    },
  })
  assert.deepEqual(allocation, {
    status: 200,
    body: { playHash: 'sub-map', serverId: 'sub-map' },
  })
  assert.equal(starts.length, 0)
})
