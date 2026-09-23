'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const zlib = require('node:zlib')

const {
  archiveEntry,
  imageDetailsFromArchive,
  tauriBuildCommand,
  tauriBuildEnvironment,
  tauriBuildFailure,
  macApplicationHasResourceSeal,
  ensureMacApplicationSignature,
} = require('./build-desktop-offline-installer.js')

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

test('archive reader forces a Windows drive-letter archive path to stay local', () => {
  let invocation
  const result = archiveEntry(
    'D:\\a\\box-local-engine\\images.tar.gz',
    'manifest.json',
    (command, args) => {
      invocation = { command, args }
      return { status: 0, stdout: '{}' }
    },
    'win32',
  )

  assert.equal(result, '{}')
  assert.deepEqual(invocation, {
    command: 'tar',
    args: [
      '--force-local',
      '-xzf',
      'D:\\a\\box-local-engine\\images.tar.gz',
      '-O',
      'manifest.json',
    ],
  })
})

test('Windows starts the Rush-installed Tauri command shim and reports spawn failures', () => {
  assert.deepEqual(tauriBuildCommand('win32'), {
    command: path.join(__dirname, '../apps/deployment-manager/node_modules/.bin/tauri.cmd'),
    shell: true,
  })
  assert.match(
    tauriBuildFailure({
      status: null,
      error: { code: 'ENOENT', message: 'spawnSync tauri ENOENT' },
    }),
    /无法启动 Tauri 构建命令：ENOENT: spawnSync tauri ENOENT/,
  )
})

test('Tauri release builds remap repository and home paths without dropping existing flags', () => {
  const encoded = tauriBuildEnvironment(
    { CARGO_ENCODED_RUSTFLAGS: '-C\x1ftarget-cpu=native' },
    { repository: '/private/source/local-engine', home: '/Users/builder' },
  )
  assert.equal(
    encoded.CARGO_ENCODED_RUSTFLAGS,
    [
      '-C\x1ftarget-cpu=native',
      '--remap-path-prefix=/private/source/local-engine=/workspace',
      '--remap-path-prefix=/Users/builder=/build-home',
    ].join('\x1f'),
  )

  const plain = tauriBuildEnvironment(
    { RUSTFLAGS: '-C debuginfo=0' },
    { repository: 'D:\\a\\local-engine', home: 'C:\\Users\\runner' },
  )
  assert.match(plain.RUSTFLAGS, /-C debuginfo=0/)
  assert.match(plain.RUSTFLAGS, /--remap-path-prefix=D:\\a\\local-engine=\/workspace/)
  assert.match(plain.RUSTFLAGS, /--remap-path-prefix=C:\\Users\\runner=\/build-home/)
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

test(
  'macOS offline app receives an outer ad-hoc resource signature',
  { skip: process.platform !== 'darwin' },
  () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-macos-app-'))
    const app = path.join(root, 'BOX3 Engine.app')
    try {
      fs.mkdirSync(path.join(app, 'Contents', 'MacOS'), { recursive: true })
      fs.mkdirSync(path.join(app, 'Contents', 'Resources'), { recursive: true })
      fs.copyFileSync('/bin/echo', path.join(app, 'Contents', 'MacOS', 'box-local-engine-manager'))
      fs.writeFileSync(
        path.join(app, 'Contents', 'Info.plist'),
        '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>box-local-engine-manager</string></dict></plist>',
      )
      fs.writeFileSync(path.join(app, 'Contents', 'Resources', 'payload.txt'), 'offline payload')

      assert.equal(macApplicationHasResourceSeal(app), false)
      ensureMacApplicationSignature(app)
      assert.equal(macApplicationHasResourceSeal(app), true)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  },
)
