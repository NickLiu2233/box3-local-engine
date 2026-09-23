'use strict'

const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(command, args, cwd = root, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function node(script, args = [], cwd = root) {
  run(process.execPath, [path.resolve(root, script), ...args], cwd)
}

function npmScript(directory, script, args = []) {
  run(npm, ['run', script, ...(args.length ? ['--', ...args] : [])], path.join(root, directory))
}

function format(write) {
  npmScript('tools/repo-tooling', write ? 'format' : 'format:check')
}

function lint() {
  npmScript('tools/repo-tooling', 'lint:root')
  npmScript('apps/game', 'lint')
  npmScript('apps/voxa', 'lint')
  npmScript('apps/migrator', 'lint')
}

function typecheck() {
  npmScript('apps/migrator', 'typecheck')
}

function check() {
  node('apps/local-engine/src/build-metadata.test.js')
  node('apps/local-engine/scripts/regression-project-storage-identity.js')
  node('scripts/regression-empty-mesh-asset.js')
  node('scripts/check-standalone.js')
  node('scripts/check-play-version-refresh.js')
  npmScript('apps/game', 'test:local-runtime-session')
  for (const script of [
    'check:model-library-scope',
    'check:model-project-bundle',
    'check:local-cors',
    'check:model-management-permission',
  ]) {
    npmScript('apps/voxa', script)
  }
  npmScript('services/game-server', 'check:disabled-storage')
  node('scripts/platform-api-removal.test.js')
  node('scripts/check-engine-wire-protocols.js')
  npmScript('packages/license', 'test')
  npmScript('apps/license-server', 'test')
  node('scripts/check-license-boundaries.js')
  node('scripts/check-windows-offline-installer.js')
  run(process.execPath, [
    '--test',
    'scripts/export-current-images.test.js',
    'scripts/package-release.test.js',
    'scripts/build-desktop-offline-installer.test.js',
    'scripts/verify-desktop-offline-package.test.js',
    'scripts/linux-bootstrap-installer.test.js',
  ])
  node('scripts/check-desktop-deployment-manager.js')
  node('scripts/check-headless-rust-manager.js')
  run(process.execPath, ['--test', 'scripts/deployment-manager-transport.test.js'])
  node('scripts/check-release-workflow.js')
  node('scripts/check-documentation.js')
  run(
    process.execPath,
    ['-r', '@swc-node/register', 'scripts/regression-map-group-state-lock.ts'],
    path.join(root, 'services/game-server'),
  )
  npmScript('examples/player-auth-portal', 'check')
  run('cargo', ['test', '--manifest-path', 'apps/manager-core/Cargo.toml'])
  run('cargo', ['test', '--manifest-path', 'apps/server-manager-rust/Cargo.toml'])
  npmScript('apps/migrator', 'test')
  run(process.execPath, [
    '--test',
    'scripts/teleport-room-manager.test.js',
    'scripts/teleport-library-integration.test.js',
  ])
}

function test() {
  npmScript('apps/local-engine', 'test')
  npmScript('services/game-server', 'test')
  check()
}

const task = process.argv[2]
if (task === 'format') format(true)
else if (task === 'format-check') format(false)
else if (task === 'lint') lint()
else if (task === 'typecheck') typecheck()
else if (task === 'check') check()
else if (task === 'test') test()
else if (task === 'verify') {
  format(false)
  lint()
  typecheck()
  test()
} else {
  throw new Error(`Unknown repository task: ${task || '(missing)'}`)
}
