'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('all official business images start directly, without runtime license hooks', () => {
  const engine = read('apps/local-engine/Dockerfile')
  const portal = read('apps/player-auth-portal/Dockerfile')
  for (const source of [engine, portal, read('apps/server-manager/Dockerfile')]) {
    assert.doesNotMatch(source, /runtime-gate|process-guard|BOX_LICENSE_|license-public-key|packages\/license/)
  }
  for (const target of ['creator', 'play', 'player-service', 'voxa']) {
    const stage = engine.split(`FROM runtime-base AS ${target}\n`)[1]?.split('\nFROM ')[0]
    assert.ok(stage, `missing ${target} stage`)
    assert.match(stage, /ENTRYPOINT \["tini", "--"\]/)
    assert.match(stage, /CMD \["node", /)
  }
  assert.match(portal, /CMD \["node", "build\/server.cjs"\]/)
  assert.match(portal, /USER node/)
})

test('Compose and isolated map runtimes retain security without license mounts', () => {
  const compose = read('docker-compose.yml')
  const runtime = read('apps/server-manager-rust/src/runtime/runtime.rs')
  const launcher = read('apps/local-engine/src/launcher.js')
  for (const source of [compose, runtime, launcher]) {
    assert.doesNotMatch(source, /BOX_LICENSE_|box3-license|box3-device-id|runtime-gate|process-guard/)
  }
  assert.match(compose, /no-new-privileges:true/)
  assert.match(compose, /BOX_RUNTIME_MANAGER_TOKEN/)
  assert.match(runtime, /--bounding-set=-all/)
  assert.match(runtime, /--cap-drop/)
})

test('desktop and Web managers no longer provide activation commands or startup gates', () => {
  const desktop = read('apps/deployment-manager/src-tauri/src/commands.rs')
  const web = read('apps/server-manager-rust/src/http/commands.rs')
  const core = read('apps/manager-core/src/services.rs')
  const manager = read('apps/server-manager-rust/src/main.rs')
  const desktopConfig = read('apps/deployment-manager/src-tauri/src/config.rs')
  for (const source of [manager, desktopConfig, read('apps/server-manager-rust/src/platform/security_data.rs')]) {
    assert.doesNotMatch(source, /trusted_now|trusted-time|license-time|keychain_install_secret|hardware_identity|BOX_LICENSE_/)
  }
  assert.doesNotMatch(manager, /#\[cfg\(test\)\]\s*#\[derive\(Serialize\)\]\s*struct Error/)
  for (const source of [desktop, web, core]) {
    assert.doesNotMatch(source, /get_license_status|install_license|license::|require_license/)
  }
  assert.match(web, /auth\(&headers, &app\)/)
  assert.match(core, /mutation_guard|操作名称或服务名称无效/)
  assert.ok(!JSON.parse(read('rush.json')).projects.some(project => /@box\/license/.test(project.packageName)))
})

test('server installation no longer depends on a licensing machine identity', () => {
  for (const file of ['distribution/server/install.sh', 'distribution/server/bootstrap.sh', 'distribution/server/.env.example']) {
    assert.doesNotMatch(read(file), /BOX_LICENSE_|MACHINE_ID_FILE|\/etc\/machine-id|licensing/)
  }
  assert.match(read('distribution/server/install.sh'), /BOX_RUNTIME_MANAGER_TOKEN/)
  assert.ok(fs.existsSync(path.join(root, 'distribution/LICENSE.txt')))
  // Deleting the issuer source must not expose a previous installation's keys.
  assert.match(read('.gitignore'), /^\/apps\/license-server\/$/m)
  assert.match(read('.dockerignore'), /^apps\/license-server\/$/m)
})
