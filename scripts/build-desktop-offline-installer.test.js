'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const zlib = require('node:zlib')

const { archiveEntry, imageDetailsFromArchive } = require('./build-desktop-offline-installer.js')

function writeOctal(header, offset, length, value) {
  header.write(`${value.toString(8).padStart(length - 1, '0')}\0`, offset, length, 'ascii')
}

function tarEntry(name, content) {
  const header = Buffer.alloc(512)
  header.write(name, 0, 100, 'utf8')
  writeOctal(header, 100, 8, 0o644)
  writeOctal(header, 108, 8, 0)
  writeOctal(header, 116, 8, 0)
  writeOctal(header, 124, 12, content.length)
  writeOctal(header, 136, 12, Math.floor(Date.now() / 1000))
  header.fill(0x20, 148, 156)
  header.write('0', 156, 1, 'ascii')
  header.write('ustar\0', 257, 6, 'ascii')
  header.write('00', 263, 2, 'ascii')
  let checksum = 0
  for (const byte of header) checksum += byte
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')
  const padding = Buffer.alloc((512 - (content.length % 512)) % 512)
  return Buffer.concat([header, content, padding])
}

function writeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-image-archive-'))
  const archive = path.join(root, 'images.tar.gz')
  const configPath = 'image-config.json'
  const config = Buffer.from(
    JSON.stringify({
      created: '2026-08-26T00:00:00.000Z',
      os: 'linux',
      architecture: 'amd64',
      config: { Labels: { 'org.opencontainers.image.revision': 'revision' } },
    }),
  )
  const manifest = Buffer.from(
    JSON.stringify([
      {
        Config: configPath,
        RepoTags: ['box-local-engine-play:v0.1.0-linux-amd64'],
        Layers: [],
      },
    ]),
  )
  fs.writeFileSync(
    archive,
    zlib.gzipSync(
      Buffer.concat([
        tarEntry('manifest.json', manifest),
        tarEntry(configPath, config),
        Buffer.alloc(1024),
      ]),
    ),
  )
  return { archive, root }
}

test('archive reader explicitly requests gzip extraction for Windows-compatible tar', () => {
  let invocation
  const result = archiveEntry('images.tar.gz', 'manifest.json', (command, args) => {
    invocation = { command, args }
    return { status: 0, stdout: '{}' }
  })

  assert.equal(result, '{}')
  assert.deepEqual(invocation, {
    command: 'tar',
    args: ['-xzf', 'images.tar.gz', '-O', 'manifest.json'],
  })
})

test('image details are read from a gzip Docker archive', () => {
  const { archive, root } = writeFixture()
  try {
    assert.deepEqual(imageDetailsFromArchive(archive), [
      {
        image: 'box-local-engine-play',
        tag: 'v0.1.0-linux-amd64',
        imageId: 'sha256:image-config.json',
        createdAt: '2026-08-26T00:00:00.000Z',
        platform: 'linux/amd64',
        sourceRevision: 'revision',
        buildSource: 'unknown',
      },
    ])
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
