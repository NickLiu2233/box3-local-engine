'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const { verifyPackage } = require('./verify-desktop-offline-package')

function sha256(file) {
  const crypto = require('node:crypto')
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function fixturePackage() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box3-desktop-package-'))
  const app = path.join(root, 'BOX3 Engine.app')
  const payload = path.join(app, 'Contents', 'Resources', 'payload')
  const metadata = path.join(payload, 'metadata')
  fs.mkdirSync(metadata, { recursive: true })
  const archive = path.join(payload, 'images.tar.gz')
  fs.writeFileSync(archive, 'fixture image archive')
  fs.writeFileSync(
    path.join(payload, 'BOX-OFFLINE-IMAGE.json'),
    `${JSON.stringify({
      formatVersion: 1,
      archive: 'images.tar.gz',
      sha256: sha256(archive),
      imageTag: 'v0.1.0-linux-arm64',
      platform: 'linux/arm64',
    })}\n`,
  )
  const info = {
    version: '0.1.0',
    sourceRevision: 'test',
    buildCreatedAt: '2026-08-26T00:00:00.000Z',
    source: 'release',
  }
  for (const name of ['BUILD-INFO.json', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.json']) {
    fs.writeFileSync(
      path.join(metadata, name),
      name === 'BUILD-INFO.json' ? JSON.stringify(info) : name,
    )
  }
  const sums = ['BUILD-INFO.json', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.json']
    .map((name) => `${sha256(path.join(metadata, name))}  ${name}`)
    .join('\n')
  fs.writeFileSync(path.join(metadata, 'SHA256SUMS'), `${sums}\n`)
  return root
}

test('macOS unsigned internal package skips outer resource-signature verification', () => {
  if (process.platform !== 'darwin') return
  const root = fixturePackage()
  try {
    assert.doesNotThrow(() => verifyPackage(root))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
