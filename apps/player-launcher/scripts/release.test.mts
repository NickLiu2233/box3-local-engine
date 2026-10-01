import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { artifactName, fileDigest, releaseInfo, targetConfiguration, targets, validateManifest, verifyArtifact, verifyExecutableHeader } from './release-contract.mts'
import { cachedInstaller } from './release-cache.mts'
import { isMissingObject, ossConfiguration } from './oss-client.mts'

const info = releaseInfo('player-v0.1.0', 'a'.repeat(40), '0.1.0')

test('player tags are independently versioned and validate semantic versions', () => {
  assert.equal(info.version, '0.1.0')
  for (const tag of ['v0.1.0', 'player-v01.1.0', 'player-v0.1.0/unsafe', 'player-v0.1.0-beta.01'])
    assert.throws(() => releaseInfo(tag, info.commit, '0.1.0'))
  assert.throws(() => releaseInfo('player-v0.2.0', info.commit, '0.1.0'), /does not match/)
  assert.equal(releaseInfo('player-v0.2.0-beta.1', info.commit, '0.2.0-beta.1').prerelease, true)
  assert.deepEqual(targets.map((target) => artifactName(info, target)), [
    'BOX3-Player-Launcher-0.1.0-windows-amd64.exe',
    'BOX3-Player-Launcher-0.1.0-windows-arm64.exe',
    'BOX3-Player-Launcher-0.1.0-macos-arm64.dmg',
    'BOX3-Player-Launcher-0.1.0-linux-amd64.AppImage',
    'BOX3-Player-Launcher-0.1.0-linux-arm64.AppImage',
  ])
})

test('OSS cache reuses complete installers but rejects moved tags and mismatched sizes', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'player-release-test-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  const manifest = { formatVersion: 1, ...info, target: 'macos-arm64', file: artifactName(info, 'macos-arm64'), size: 10, sha256: 'b'.repeat(64) }
  let exists = false
  let metadataExists = false
  let size = 10
  const oss = {
    directory,
    head: async (key: string) => key.endsWith('.build.json')
      ? (metadataExists ? { ContentLength: 100 } : null)
      : (exists ? { ContentLength: size } : null),
    download: async (_key: string, file: string) => { await writeFile(file, JSON.stringify(manifest)) },
  }
  assert.equal(await cachedInstaller(oss, info, 'macos-arm64'), false)
  exists = true
  assert.equal(await cachedInstaller(oss, info, 'macos-arm64'), false)
  metadataExists = true
  assert.equal(await cachedInstaller(oss, info, 'macos-arm64'), true)
  size = 11
  await assert.rejects(cachedInstaller(oss, info, 'macos-arm64'), /size differs/)
  size = 10
  manifest.commit = 'c'.repeat(40)
  await assert.rejects(cachedInstaller(oss, info, 'macos-arm64'), /do not move/)
  await assert.rejects(cachedInstaller({ ...oss, head: async () => { throw new Error('AccessDenied') } }, info, 'macos-arm64'), /AccessDenied/)
})

test('installer checksums prevent publishing corrupted downloads', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'player-digest-test-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'installer')
  await writeFile(file, 'fixture installer')
  const manifest = validateManifest({ formatVersion: 1, ...info, target: 'windows-amd64', file: artifactName(info, 'windows-amd64'), ...await fileDigest(file) }, info, 'windows-amd64')
  await verifyArtifact(file, manifest)
  await writeFile(file, 'corrupt installer')
  await assert.rejects(verifyArtifact(file, manifest), /SHA256 mismatch/)
})

test('checks native executable architectures before publishing', () => {
  const pe = Buffer.alloc(512)
  pe.write('MZ'); pe.writeUInt32LE(128, 0x3c); pe.write('PE\0\0', 128); pe.writeUInt16LE(0x8664, 132)
  verifyExecutableHeader(pe, 'windows-amd64')
  assert.throws(() => verifyExecutableHeader(pe, 'windows-arm64'))
  pe.writeUInt16LE(0xaa64, 132)
  verifyExecutableHeader(pe, 'windows-arm64')
  const macho = Buffer.alloc(8)
  macho.writeUInt32LE(0xfeedfacf); macho.writeUInt32LE(0x0100000c, 4)
  verifyExecutableHeader(macho, 'macos-arm64')
  assert.throws(() => verifyExecutableHeader(Buffer.alloc(1), 'macos-arm64'))
  const elf = Buffer.alloc(64)
  Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1]).copy(elf)
  elf.writeUInt16LE(0x3e, 18)
  verifyExecutableHeader(elf, 'linux-amd64')
  assert.throws(() => verifyExecutableHeader(elf, 'linux-arm64'))
  elf.writeUInt16LE(0xb7, 18)
  verifyExecutableHeader(elf, 'linux-arm64')
  assert.throws(() => verifyExecutableHeader(elf, 'linux-amd64'))
  elf[4] = 1
  assert.throws(() => verifyExecutableHeader(elf, 'linux-arm64'), /not linux-arm64/)
})

test('Linux targets select native CPU, builder flag and unpacked directory', () => {
  assert.deepEqual(targetConfiguration('linux-amd64'), { architecture: 'x64', platform: 'linux', builderFlag: '--linux', directory: 'linux-unpacked' })
  assert.deepEqual(targetConfiguration('linux-arm64'), { architecture: 'arm64', platform: 'linux', builderFlag: '--linux', directory: 'linux-arm64-unpacked' })
  assert.equal(targetConfiguration('macos-arm64').platform, 'darwin')
  assert.equal(targetConfiguration('windows-amd64').architecture, 'x64')
})

test('only missing OSS objects are cache misses; authentication/network failures must fail', () => {
  assert.equal(isMissingObject('An error occurred (404) when calling HeadObject'), true)
  assert.equal(isMissingObject('An error occurred (AccessDenied) when calling HeadObject'), false)
  assert.equal(isMissingObject('Could not connect to the endpoint'), false)
  assert.throws(() => ossConfiguration({}), /Missing required/)
  assert.throws(() => ossConfiguration({ OSS_BUCKET: 'oss://bucket', OSS_ENDPOINT: 'host', OSS_ACCESS_KEY_ID: 'fixture', OSS_ACCESS_KEY_SECRET: 'fixture' }), /bucket name/)
})

test('player release workflow is tag-only, checks OSS before installing and leaves engine Latest untouched', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const release = await readFile(path.join(root, '.github/workflows/player-launcher-release.yml'), 'utf8')
  const ci = await readFile(path.join(root, '.github/workflows/player-launcher.yml'), 'utf8')
  assert.match(release, /tags:\s*\n\s*- 'player-v\*'/)
  assert.doesNotMatch(release, /workflow_dispatch|branches:|package-images|package-desktop|docker/)
  assert.ok(release.indexOf('release.mts probe') < release.indexOf('install --to @box/player-launcher'))
  assert.match(release, /if: steps\.cache\.outputs\.cache-hit != 'true'/)
  assert.match(release, /make_latest: false/)
  assert.doesNotMatch(release + ci, /cargo|src-tauri|Rust|Tauri/)
  assert.doesNotMatch(release, /actions\/(upload|download)-artifact/)
  for (const target of targets) assert.match(release, new RegExp(`target: ${target}`))
  assert.match(release, /player-release-files\/\*\.AppImage/)
  assert.match(release, /xvfb-run -a node --experimental-strip-types.*release\.mts build/)
})
