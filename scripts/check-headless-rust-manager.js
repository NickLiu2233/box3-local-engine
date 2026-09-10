'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const dockerfile = read('apps/server-manager/Dockerfile')
const service = read('apps/server-manager-rust/src/main.rs')
const transport = read('apps/deployment-manager/src/transport.js')
const consoleSource = read('apps/deployment-manager/src/main.js')

assert.match(dockerfile, /FROM \$\{RUST_IMAGE\} AS rust-build/)
assert.match(dockerfile, /COPY --from=rust-build \/server-manager \/app\/server-manager/)
assert.match(dockerfile, /CMD \["\/app\/server-manager"\]/)
assert.doesNotMatch(dockerfile, /CMD \["node", "server\.js"\]/)
assert.match(transport, /\/api\/commands\/\$\{encodeURIComponent\(command\)\}/)
assert.match(transport, /\/api\/backups\/upload/)
assert.match(transport, /\/api\/diagnostics\/\$\{encodeURIComponent\(archive\)\}\/download/)
for (const command of [
  'get_system_status',
  'get_install_config',
  'save_configuration_command',
  'get_license_status',
  'install_license',
  'start_services',
  'control_service',
  'list_backups',
  'create_backup',
  'restore_backup',
  'get_performance_status',
  'destroy_project_runtime',
  'get_owner_secrets',
  'test_remote_connection',
  'export_diagnostics',
  'prepare_managed_database',
  'prepare_managed_redis',
  'get_managed_service_info',
  'start_managed_service',
]) {
  assert.match(service, new RegExp(`"${command}"`), `Rust manager must support ${command}`)
}
const browserHandledCommands = new Set([
  'open_service',
  'open_community_group',
  'open_docker_desktop_download',
  'start_docker_desktop',
  'import_backup',
  'export_backup',
])
const invokedCommands = [...consoleSource.matchAll(/invoke\('([a-z_]+)'/g)].map((match) => match[1])
for (const command of invokedCommands) {
  if (!browserHandledCommands.has(command)) {
    assert.match(service, new RegExp(`"${command}"`), `Rust manager must support UI command ${command}`)
  }
}
assert.match(service, /拒绝跨站管理请求/)
assert.match(service, /DefaultBodyLimit::max\(512 \* 1024 \* 1024\)/)
console.log('headless Rust manager checks passed')
