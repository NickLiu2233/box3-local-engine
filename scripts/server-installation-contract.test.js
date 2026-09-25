'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const template = fs.readFileSync(path.join(root, 'distribution/server/.env.example'), 'utf8')
const installer = fs.readFileSync(path.join(root, 'distribution/server/install.sh'), 'utf8')

function executable(file, source) {
  fs.writeFileSync(file, source, { mode: 0o755 })
}

function readValue(source, key) {
  return source.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1] || ''
}

function runInstaller(existingEnvironment) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-server-install-'))
  const bin = path.join(temporaryRoot, 'bin')
  try {
    fs.mkdirSync(bin)
    fs.writeFileSync(path.join(temporaryRoot, '.env.example'), template)
    fs.writeFileSync(
      path.join(temporaryRoot, 'install.sh'),
      installer
        .replace('if [ ! -s /etc/machine-id ]; then', 'if false; then')
        .replaceAll('__IMAGE_ARCHIVE__', 'images.tar.gz'),
      { mode: 0o755 },
    )
    executable(path.join(temporaryRoot, 'verify.sh'), '#!/bin/sh\nexit 0\n')
    fs.writeFileSync(path.join(temporaryRoot, 'images.tar.gz'), 'fixture')
    if (existingEnvironment) fs.writeFileSync(path.join(temporaryRoot, '.env'), existingEnvironment)
    executable(
      path.join(bin, 'docker'),
      `#!/bin/sh
case "$*" in
  *'image inspect'*) printf 'amd64\\n' ;;
esac
exit 0
`,
    )
    executable(path.join(bin, 'uname'), '#!/bin/sh\nprintf "x86_64\\n"\n')
    const result = spawnSync('sh', ['./install.sh'], {
      cwd: temporaryRoot,
      env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    return fs.readFileSync(path.join(temporaryRoot, '.env'), 'utf8')
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

for (const [name, existingEnvironment] of [
  ['a new installation', undefined],
  [
    'an upgrade from an environment created before the runtime manager token existed',
    [
      'BOX_IMAGE_TAG=v0.2.0-linux-amd64',
      'BOX_PLAY_PLATFORM=linux/amd64',
      `BOX_SERVER_MANAGER_TOKEN=${'a'.repeat(64)}`,
      'PRESERVED_OPERATOR_SETTING=yes',
      '',
    ].join('\n'),
  ],
]) {
  test(`server installer provisions BOX_RUNTIME_MANAGER_TOKEN for ${name}`, () => {
    const environment = runInstaller(existingEnvironment)
    assert.match(
      readValue(environment, 'BOX_RUNTIME_MANAGER_TOKEN'),
      /^[a-f0-9]{64}$/,
      'the runtime manager token must be a 32-byte secret accepted by server-manager',
    )
    assert.match(readValue(environment, 'BOX_SERVER_MANAGER_TOKEN'), /^[a-f0-9]{64}$/)
    if (existingEnvironment) assert.match(environment, /^PRESERVED_OPERATOR_SETTING=yes$/m)
  })
}
