import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { afterEach, describe, expect, test } from '@jest/globals'

import {
  createPlayerLauncherDownloadTicket,
  getPlayerLauncherBlobPath,
  getPlayerLauncherPackageDescriptor,
  verifyPlayerLauncherDownloadTicket,
} from './player-launcher-map-packages'

const roots: string[] = []
const previousLibraryPath = process.env.BOX_PLAY_LIBRARY_PATH
const previousPermissionSecret = process.env.PERMISSION_TOKEN_SECRET

function writeBlob(root: string, contents: string) {
  const bytes = Buffer.from(contents)
  const hash = crypto.createHash('sha256').update(bytes).digest('base64url')
  fs.writeFileSync(path.join(root, hash), bytes)
  return { hash, bytes }
}

function createPublishedWorld() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-launcher-pack-'))
  roots.push(root)
  const data = path.join(root, 'launch-map', 'data')
  const blobs = path.join(data, 'blobs')
  fs.mkdirSync(blobs, { recursive: true })
  const publicAsset = writeBlob(blobs, 'public terrain fixture')
  const privateAsset = writeBlob(blobs, 'private script fixture')
  const permissionHash = 'permission-fixture'
  fs.writeFileSync(path.join(root, 'launch-map', 'manifest.json'), JSON.stringify({
    id: 'launch-map',
    permanentMapId: 'permanent-map-001',
    publicId: 'public-map',
    projectName: '测试地图',
    version: 'v4',
    permissionHash,
  }))
  fs.writeFileSync(path.join(data, 'project-state.json'), JSON.stringify({ permissionHash }))
  fs.writeFileSync(path.join(data, 'runtime-blobs.json'), JSON.stringify({ hashes: [publicAsset.hash, privateAsset.hash] }))
  fs.writeFileSync(path.join(data, 'private-blobs.json'), JSON.stringify({ hashes: [privateAsset.hash] }))
  process.env.BOX_PLAY_LIBRARY_PATH = root
  return { root, publicAsset, privateAsset }
}

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop()!, { recursive: true, force: true })
  if (previousLibraryPath === undefined) delete process.env.BOX_PLAY_LIBRARY_PATH
  else process.env.BOX_PLAY_LIBRARY_PATH = previousLibraryPath
  if (previousPermissionSecret === undefined) delete process.env.PERMISSION_TOKEN_SECRET
  else process.env.PERMISSION_TOKEN_SECRET = previousPermissionSecret
})

describe('player launcher map package descriptors', () => {
  test('signs a stable public-asset allowlist and rejects private hashes', () => {
    const fixture = createPublishedWorld()
    const descriptor = getPlayerLauncherPackageDescriptor('public-map')
    const unsigned = {
      formatVersion: descriptor.formatVersion,
      permanentMapId: descriptor.permanentMapId,
      accessId: descriptor.accessId,
      releaseVersion: descriptor.releaseVersion,
      required: descriptor.required,
      optional: descriptor.optional,
    }
    const digest = crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('base64url')
    const signed = { ...unsigned, manifestDigest: descriptor.manifestDigest }
    const keyId = crypto.createHash('sha256').update(JSON.stringify(descriptor.signature.publicKey)).digest('base64url')

    expect(descriptor.manifestDigest).toBe(digest)
    expect(descriptor.permanentMapId).toBe('permanent-map-001')
    expect(descriptor.releaseVersion).toBe('v4')
    expect(descriptor.required).toEqual([expect.objectContaining({ hash: fixture.publicAsset.hash, size: fixture.publicAsset.bytes.length })])
    expect(descriptor.required.map(({ hash }) => hash)).not.toContain(fixture.privateAsset.hash)
    expect(descriptor.signature.keyId).toBe(keyId)
    expect(crypto.verify(
      'SHA256',
      Buffer.from(JSON.stringify(signed)),
      { key: crypto.createPublicKey({ key: descriptor.signature.publicKey, format: 'jwk' }), dsaEncoding: 'ieee-p1363' },
      Buffer.from(descriptor.signature.value, 'base64url'),
    )).toBe(true)
    expect(getPlayerLauncherBlobPath('launch-map', fixture.publicAsset.hash).asset.size).toBe(fixture.publicAsset.bytes.length)
    expect(() => getPlayerLauncherBlobPath('launch-map', fixture.privateAsset.hash)).toThrow('该资源不属于此地图的公开资源清单')
  })

  test('refuses unsafe and oversized package indexes', () => {
    const fixture = createPublishedWorld()
    const data = path.join(fixture.root, 'launch-map', 'data')
    fs.writeFileSync(path.join(data, 'runtime-blobs.json'), JSON.stringify({ hashes: ['../secret'] }))
    expect(() => getPlayerLauncherPackageDescriptor('launch-map')).toThrow('发布资源索引格式无效')
  })

  test('download tickets bind the current player, map digest, and short expiry', () => {
    process.env.PERMISSION_TOKEN_SECRET = 'player-launcher-test-secret-long-enough'
    const claims = {
      subjectId: 'player-1',
      permanentMapId: 'permanent-map-001',
      manifestDigest: 'manifest-1',
    }
    const { ticket, expiresAt } = createPlayerLauncherDownloadTicket(claims, 1_000)
    expect(expiresAt).toBe(1_300)
    expect(verifyPlayerLauncherDownloadTicket(ticket, claims, 1_001)).toBe(true)
    expect(verifyPlayerLauncherDownloadTicket(ticket, { ...claims, subjectId: 'player-2' }, 1_001)).toBe(false)
    expect(verifyPlayerLauncherDownloadTicket(ticket, { ...claims, manifestDigest: 'manifest-2' }, 1_001)).toBe(false)
    expect(verifyPlayerLauncherDownloadTicket(ticket, claims, 1_300)).toBe(false)
  })
})
