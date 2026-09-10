'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function sha256(file) {
  const hash = crypto.createHash('sha256')
  const descriptor = fs.openSync(file, 'r')
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  try {
    let bytes
    do {
      bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null)
      if (bytes) hash.update(buffer.subarray(0, bytes))
    } while (bytes)
  } finally {
    fs.closeSync(descriptor)
  }
  return hash.digest('hex')
}

function main() {
  const packageRoot = path.resolve(process.argv[2] || '')
  assert.ok(fs.statSync(packageRoot, { throwIfNoEntry: false })?.isDirectory(), 'package directory missing')

  const manifestPath = path.join(packageRoot, 'BOX3-OFFLINE-IMAGE.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  assert.equal(manifest.formatVersion, 1)
  assert.match(manifest.version, /^\d+\.\d+\.\d+/)
  assert.match(manifest.platform, /^linux\/(amd64|arm64)$/)
  assert.equal(manifest.imageTag, `v${manifest.version}-${manifest.platform.replace('/', '-')}`)
  assert.equal(manifest.images.length, 6)

  const archive = path.join(packageRoot, manifest.archive)
  assert.ok(fs.statSync(archive, { throwIfNoEntry: false })?.isFile(), 'image archive missing')
  assert.equal(sha256(archive), manifest.archiveSha256, 'image archive checksum mismatch')

  const result = spawnSync('tar', ['-xOzf', archive, 'manifest.json'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || 'cannot read Docker archive manifest')
  const dockerManifest = JSON.parse(result.stdout)
  const tags = new Set(dockerManifest.flatMap((entry) => entry.RepoTags || []))
  for (const image of manifest.images) assert.ok(tags.has(image), `Docker archive missing ${image}`)

  for (const file of [
    'compose.yml',
    '.env.example',
    'install.sh',
    'status.sh',
    'logs.sh',
    'stop.sh',
    'verify.sh',
    'README.md',
    'SHA256SUMS',
  ]) {
    assert.ok(fs.existsSync(path.join(packageRoot, file)), `package file missing: ${file}`)
  }

  const compose = fs.readFileSync(path.join(packageRoot, 'compose.yml'), 'utf8')
  for (const service of [
    'managed-postgres',
    'managed-redis',
    'server-manager',
    'creator',
    'voxa',
    'play',
    'player-service',
    'player-auth-portal',
  ]) {
    assert.match(compose, new RegExp(`^  ${service}:`, 'm'), `compose service missing: ${service}`)
  }

  console.log(`Verified headless server package: ${packageRoot}`)
}

if (require.main === module) main()
