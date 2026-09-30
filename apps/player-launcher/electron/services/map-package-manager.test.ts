import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createMapPackageManager } from './map-package-manager'
import { createSignedPackageFixture } from '../testing/signed-package-fixture'

test('installs only a signed required blob from its bound server URL and commits it', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-manager-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const serverStore = { load: () => ({ servers: [{ id: 'server-one', endpoint: 'https://play.example.com', name: 'Play' }], selectedServerId: 'server-one' }) }
  const content = Buffer.from('local blob')
  const signed = createSignedPackageFixture(content, { mapId: 'manager-map', releaseVersion: 'v1' })
  let capturedRequest
  const apiTransport = {
    async downloadAsset(options) {
      capturedRequest = options.request
      await fs.promises.mkdir(path.dirname(options.filename), { recursive: true })
      await fs.promises.writeFile(options.filename, content)
      options.onProgress({ hash: options.hash, currentBytes: content.length, totalBytes: content.length })
      return { status: 200, body: '', downloadedBytes: content.length }
    },
  }
  const manager = createMapPackageManager({ root: path.join(root, 'map-packages'), serverStore, apiTransport })
  const hash = signed.descriptor.required[0].hash
  const request = {
    endpoint: 'https://play.example.com',
    url: `https://play.example.com/api/player-launcher/maps/town/blobs/${hash}?digest=${signed.descriptor.manifestDigest}&ticket=short.ticket`,
    method: 'GET',
    headers: [],
    body: null,
  }
  const installed = await manager.install({ payload: {
    serverId: 'server-one', request, descriptor: JSON.stringify(signed.descriptor),
    trustedSigningKey: JSON.stringify(signed.trustedKey), hash,
  } })
  assert.deepEqual(installed, { hash, alreadyPresent: false, bytesWritten: content.length })
  assert.equal(capturedRequest.url, request.url)
  assert.equal((await manager.prepare('server-one', signed.descriptor, signed.trustedKey)).missingHashes.length, 0)
  assert.equal((await manager.commit('server-one', signed.descriptor, signed.trustedKey)).permanentMapId, 'manager-map')
  assert.equal((await manager.verifyInstalled('server-one', signed.descriptor, signed.trustedKey)).requiredCount, 1)
})

test('rejects a blob URL from another server or a hash outside the required manifest', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-manager-reject-'))
  try {
    const serverStore = { load: () => ({ servers: [{ id: 'server-one', endpoint: 'https://play.example.com', name: 'Play' }], selectedServerId: 'server-one' }) }
    const signed = createSignedPackageFixture(Buffer.from('blob'), { mapId: 'manager-map', releaseVersion: 'v1' })
    const manager = createMapPackageManager({
      root: path.join(root, 'map-packages'),
      serverStore,
      apiTransport: { async downloadAsset() { throw new Error('must not download untrusted resource') } },
    })
    const payload = {
      serverId: 'server-one',
      descriptor: JSON.stringify(signed.descriptor),
      trustedSigningKey: JSON.stringify(signed.trustedKey),
      hash: signed.descriptor.required[0].hash,
      request: { endpoint: 'https://play.example.com', url: 'https://elsewhere.example/api/player-launcher/maps/town/blobs/hash', method: 'GET', headers: [], body: null },
    }
    await assert.rejects(manager.install({ payload }), /签名描述符不匹配/)
    payload.request.url = `https://play.example.com/api/player-launcher/maps/town/blobs/${'A'.repeat(43)}?digest=${signed.descriptor.manifestDigest}&ticket=x.y`
    payload.hash = 'A'.repeat(43)
    await assert.rejects(manager.install({ payload }), /签名描述符的必需资源清单/)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
