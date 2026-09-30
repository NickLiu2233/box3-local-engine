import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createMapPackageStore } from './map-package-store'
import { createSignedPackageFixture } from '../testing/signed-package-fixture'

test('plans install, commits verified blobs, associates a second server and preserves shared data', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-map-store-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const store = createMapPackageStore(path.join(root, 'map-packages'))
  const content = Buffer.from('verified map resource')
  const signed = createSignedPackageFixture(content, { mapId: 'map-one', releaseVersion: 'v1.2.3' })

  const initial = await store.plan('server-one', signed.descriptor, signed.trustedKey)
  assert.deepEqual(initial.missingHashes, [signed.descriptor.required[0].hash])
  await assert.rejects(store.commit('server-one', signed.descriptor, signed.trustedKey), /尚未完整校验/)

  fs.mkdirSync(store.blobRoot, { recursive: true })
  fs.writeFileSync(path.join(store.blobRoot, signed.descriptor.required[0].hash), content)
  const installed = await store.commit('server-one', signed.descriptor, signed.trustedKey)
  assert.equal(installed.releaseVersion, 'v1.2.3')
  assert.equal((await store.verifyInstalled('server-one', signed.descriptor, signed.trustedKey)).requiredCount, 1)

  assert.equal(await store.associateWithServer('server-two', ['town'], signed.trustedKey), 1)
  assert.equal((await store.verifyInstalled('server-two', signed.descriptor, signed.trustedKey)).manifestDigest, signed.descriptor.manifestDigest)

  await store.removeServer('server-one')
  assert.equal(fs.existsSync(path.join(store.blobRoot, signed.descriptor.required[0].hash)), true)
  assert.equal((await store.verifyInstalled('server-two', signed.descriptor, signed.trustedKey)).releaseVersion, 'v1.2.3')
  await store.removeServer('server-two')
  assert.equal(fs.existsSync(path.join(store.blobRoot, signed.descriptor.required[0].hash)), false)
})

test('rejects altered local blob contents before marking a package ready', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-map-corrupt-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const store = createMapPackageStore(path.join(root, 'map-packages'))
  const signed = createSignedPackageFixture(Buffer.from('expected'), { mapId: 'map-one', releaseVersion: 'v1.2.3' })
  fs.mkdirSync(store.blobRoot, { recursive: true })
  fs.writeFileSync(path.join(store.blobRoot, signed.descriptor.required[0].hash), 'tampered')
  await assert.rejects(store.commit('server-one', signed.descriptor, signed.trustedKey), /尚未完整校验/)
  await assert.rejects(store.verifyInstalled('server-one', signed.descriptor, signed.trustedKey), /尚未准备完成/)
})

test('stops server cleanup when a package ownership index is corrupt', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-map-index-corrupt-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const store = createMapPackageStore(path.join(root, 'map-packages'))
  const indexDir = path.join(store.root, 'packages', 'map-one', 'digest-one')
  fs.mkdirSync(indexDir, { recursive: true })
  fs.writeFileSync(path.join(indexDir, 'verified.json'), '{invalid')
  fs.mkdirSync(store.blobRoot, { recursive: true })
  fs.writeFileSync(path.join(store.blobRoot, 'A'.repeat(43)), 'keep')

  await assert.rejects(store.removeServer('server-one'), /引用索引损坏/)
  assert.equal(fs.existsSync(path.join(store.blobRoot, 'A'.repeat(43))), true)
})
