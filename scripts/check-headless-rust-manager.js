'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const dockerfile = read('apps/server-manager/Dockerfile')
const adapter = read('apps/server-manager-rust/src/main.rs')
const sharedDirectory = path.join(root, 'apps/manager-core/src')
const sharedBackend = fs
  .readdirSync(sharedDirectory)
  .filter((file) => file.endsWith('.rs'))
  .sort()
  .map((file) => fs.readFileSync(path.join(sharedDirectory, file), 'utf8'))
  .join('\n')
const service = adapter + '\n' + sharedBackend
const transport = read('apps/deployment-manager/src/transport.js')
const consoleSource = read('apps/deployment-manager/src/main.js')
const serverEnvExample = read('distribution/server/.env.example')
const serverInstall = read('distribution/server/install.sh')
const compose = read('docker-compose.yml')

assert.match(dockerfile, /FROM \$\{RUST_IMAGE\} AS rust-build/)
assert.match(dockerfile, /COPY --from=rust-build \/server-manager \/app\/server-manager/)
assert.match(dockerfile, /CMD \["\/app\/server-manager"\]/)
assert.doesNotMatch(dockerfile, /CMD \["node", "server\.js"\]/)
assert.match(dockerfile, /CMD \["\/app\/server-manager", "--healthcheck"\]/)
assert.doesNotMatch(dockerfile, /apt-get|\bcurl\b/)
assert.equal(
  (dockerfile.match(/COPY --from=docker-cli .*docker-compose/g) || []).length,
  1,
  'the Compose plugin must not be duplicated in the runtime image',
)
assert.match(adapter, /#\[tokio::main\(flavor = "current_thread"\)\]/)
assert.match(transport, /\/api\/commands\/\$\{encodeURIComponent\(command\)\}/)
assert.match(transport, /\/api\/backups\/upload/)
assert.match(transport, /\/api\/diagnostics\/\$\{encodeURIComponent\(archive\)\}\/download/)
assert.match(consoleSource, /id="web-logout"/, 'Web console must expose an explicit logout action')
assert.match(consoleSource, /navItem\('web-login', 'device', '管理登录'\)/)
assert.match(consoleSource, /<h1>Box Engine 管理界面<\/h1>/)
assert.match(
  consoleSource,
  /managementAvailable \? `<article class="about-card"><div class="about-card-heading"><h2>更新日志/,
)
assert.match(consoleSource, /managementAvailable \? '社区与许可' : '许可证'/)
assert.match(adapter, /if name != "get_legal_notices"/)
assert.match(
  adapter,
  /initialize_license_storage\(&app\)[\s\S]*?before serving requests/,
  'the manager must create the device bind-mount file before business containers can start',
)
assert.match(transport, /command === 'get_legal_notices' \? publicFetch : authenticatedFetch/)
assert.match(
  consoleSource,
  /#web-logout'[\s\S]*setWebManagerToken\(''\)[\s\S]*state\.page = 'web-login'/,
  'Web logout must clear the session token and return to the login gate',
)
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
  assert.match(adapter, new RegExp(`"${command}"`), `Rust manager must support ${command}`)
}
const browserHandledCommands = new Set([
  'open_service',
  'open_community_group',
  'open_docker_desktop_download',
  'start_docker_desktop',
  'choose_data_storage_directory',
  'import_backup',
  'export_backup',
])
const invokedCommands = [...consoleSource.matchAll(/invoke\('([a-z_]+)'/g)].map((match) => match[1])
for (const command of invokedCommands) {
  if (!browserHandledCommands.has(command)) {
    assert.match(
      adapter,
      new RegExp(`"${command}"`),
      `Rust manager must support UI command ${command}`,
    )
  }
}
assert.match(service, /拒绝跨站管理请求/)
assert.match(service, /DefaultBodyLimit::max\(512 \* 1024 \* 1024\)/)

// Parity with the desktop launcher backend. The headless manager must derive
// the Docker runtime environment instead of handing the raw .env to Compose,
// must recreate containers when starting services, and must expose the same
// configuration keys the launcher writes.
assert.match(service, /fn generate_runtime_environment\(app: &App\)/)
assert.match(service, /fn runtime_env_path\(app: &App\)/)
assert.match(service, /let environment = generate_runtime_environment\(app\)\?;/)
assert.match(service, /BOX_CREATOR_ALLOWED_HOSTS/)
assert.match(service, /BOX_PLAYER_AUTH_ALLOWED_ORIGINS/)
assert.match(service, /BOX_PLAYER_LOGIN_URL/)
assert.match(service, /BOX_PLAYER_SERVICE_INTERNAL_URL/)
assert.match(service, /--force-recreate/)
assert.match(service, /desktop-postgres/)
assert.match(service, /desktop-redis/)
assert.match(service, /BOX_SCRIPT_HEAP_MB/)
assert.match(service, /"lanIp": detect_lan_ip\(\)/)
assert.match(service, /fn validate_raw_environment\(content: &str\)/)
assert.match(service, /fn validate_configuration\(/)
assert.match(service, /fn check_remote_endpoint\(label: &str, host: &str, port: u16\)/)
assert.match(service, /fn is_sensitive_env_key\(key: &str\)/)
assert.match(service, /compose\(app, &\["logs", "--tail", "500", "--no-color"\]\)/)
// A fresh deployment must still produce a backup instead of refusing because
// no map data exists yet (the desktop launcher writes a README-only archive).
assert.doesNotMatch(service, /没有可备份的数据目录/)
assert.match(service, /BACKUP-README\.txt/)
// Archive integrity and empty-backup behavior belong to core backup tests,
// not the old GNU tar warning flag or desktop ZIP command implementation.
// The manager container cannot see the host LAN address, so the operator (or
// install.sh) supplies it and the container never guesses from its own netns.
assert.match(service, /fn configured_lan_ip\(\)/)
assert.match(service, /fn in_container\(\)/)
assert.match(service, /BOX_LAN_IP/)
assert.match(serverEnvExample, /^BOX_LAN_IP=/m)
assert.match(serverInstall, /BOX_LAN_IP=\$lan_ip/)
assert.match(compose, /BOX_LAN_IP: \$\{BOX_LAN_IP:-\}/)
// A new package version must not change the licence device identity.
assert.match(service, /fn install_secret\(app: &App\)/)
assert.match(service, /BOX_LICENSE_INSTALL_SECRET/)
assert.match(service, /许可证与当前设备不匹配/)
assert.match(serverEnvExample, /^BOX_LICENSE_INSTALL_SECRET=/m)
assert.match(serverInstall, /BOX_LICENSE_INSTALL_SECRET=\$license_secret\//)
assert.match(compose, /BOX_LICENSE_INSTALL_SECRET: \$\{BOX_LICENSE_INSTALL_SECRET:-\}/)
assert.match(serverInstall, /--remove-orphans --wait server-manager/)
assert.match(serverEnvExample, /^BOX_DOCKER_SOCKET=\/var\/run\/docker\.sock$/m)
assert.match(serverEnvExample, /^BOX_MANAGED_POSTGRES_MEMORY_LIMIT=512m$/m)
assert.match(serverEnvExample, /^BOX_MANAGED_REDIS_MEMORY_LIMIT=256m$/m)
assert.match(serverEnvExample, /^BOX_VOXA_MEMORY_LIMIT=1g$/m)

// Check production adapter wiring separately from the aggregated feature text.
// Test fixtures/comments must not make a disconnected core implementation pass.
const productionRust = (source) =>
  source
    // Top-level test modules end at an unindented brace in these Rust files.
    // Remove the whole module, preserving production items declared after it.
    .replace(/^#\[cfg\(test\)\]\s*mod \w+\s*\{[\s\S]*?^\}/gm, '')
    .replace(/^\s*\/\/.*$/gm, '')
const core = Object.fromEntries(
  ['lib', 'configuration', 'license', 'services', 'backup'].map((name) => [
    name,
    productionRust(fs.readFileSync(path.join(sharedDirectory, `${name}.rs`), 'utf8')),
  ]),
)
for (const module of ['configuration', 'license', 'services']) {
  assert.ok(core.lib.includes(`pub mod ${module};`), `core must export ${module}`)
}
// Core owns policies; native filesystem/network/UI adapters must stay outside
// configuration. License time/checkpoint I/O and backup filesystem I/O are valid.
assert.doesNotMatch(core.configuration, /\b(?:tauri|axum)::/)
assert.doesNotMatch(core.configuration, /\b(?:std::env|env)::(?:var|var_os)\(/)
for (const name of [
  'validate_raw_environment',
  'validate_configuration',
  'runtime_environment',
  'database_url',
]) {
  assert.ok(
    core.configuration.includes(`pub fn ${name}(`),
    `missing shared configuration API ${name}`,
  )
}
for (const key of [
  'BOX_CREATOR_ALLOWED_HOSTS',
  'BOX_RESOURCE_ALLOWED_ORIGINS',
  'BOX_VOXA_ALLOWED_ORIGINS',
  'BOX_PLAYER_AUTH_ALLOWED_ORIGINS',
  'BOX_PLAYER_LOGIN_URL',
  'BOX_PLAYER_SERVICE_INTERNAL_URL',
  'BOX_DATABASE_QUERY',
]) {
  assert.ok(core.configuration.includes(`"${key}"`), `shared runtime must derive/preserve ${key}`)
}
// The camelCase signed-token contract is now public and owned by core.
assert.match(
  core.license,
  /#\[serde\(rename_all = "camelCase"\)\]\s*pub struct LicensePayload\s*\{/,
)
assert.match(
  core.license,
  /\.verify_strict\(/,
  'signed licenses must use strict signature verification',
)
assert.match(
  core.license,
  /payload\.device_id != expected_device/,
  'licenses must bind to the device',
)
for (const name of ['verify_token', 'status_from_token', 'trusted_now']) {
  assert.ok(core.license.includes(`pub fn ${name}(`), `missing shared license API ${name}`)
}
assert.match(core.services, /pub const MANAGED_SERVICES:/)
for (const serviceName of [
  'managed-postgres',
  'managed-redis',
  'creator',
  'play',
  'voxa',
  'player-service',
  'player-auth-portal',
]) {
  assert.ok(
    core.services.includes(`"${serviceName}"`),
    `core service catalog is missing ${serviceName}`,
  )
}
for (const name of ['start', 'control', 'stop', 'statuses', 'compose_rows', 'enabled']) {
  assert.ok(core.services.includes(`pub fn ${name}(`), `missing shared service operation ${name}`)
}
// Keep the license guard as a security invariant, but leave scope selection,
// dependency order and exact Compose argv to the shared runtime behavior tests.
assert.match(core.services, /runtime\.require_license\(\)\?;/)
assert.match(core.services, /--force-recreate/)
assert.doesNotMatch(
  core.services,
  /COMPOSE_PROFILES/,
  'service enablement must not depend on stale owner profiles',
)

// Backup migration is staged: until lib.rs exports backup, check the new core
// contract without requiring desktop's soon-to-be-deleted ZIP/tar helpers.
// Once exported, adapters must use backup_store for creation/import validation
// and backup for restoration; check both links in that shared call chain.
assert.match(core.backup, /pub fn create_archive\(/)
assert.match(core.backup, /pub fn validate_archive\(/)
assert.match(core.backup, /pub fn restore_archive\b/)
assert.match(core.backup, /pub const DATA_DIRECTORIES:/)
assert.ok(core.backup.includes('".tar.gz"'), 'new backups must use .tar.gz')
assert.ok(
  core.backup.includes('"BACKUP-README.txt"'),
  'empty installations must have a valid README-only backup',
)
// Rejecting traversal/links, validating before stopping writers, ZIP/TAR legacy
// import and rollback belong in the core backup behavior suite.
// No check here requires an archive shell command or a particular parser.

const webAdapter = productionRust(adapter)
assert.match(webAdapter, /use box_manager_core::configuration as shared_config;/)
assert.match(webAdapter, /shared_config::runtime_environment\(/)
assert.match(webAdapter, /use shared_config::validate_configuration;/)
assert.match(webAdapter, /validate_configuration\(config\)\?;/)
assert.match(webAdapter, /use shared_config::validate_raw_environment;/)
assert.match(webAdapter, /validate_raw_environment\(s\)\?;/)
assert.match(webAdapter, /web_manager:\s*true/)
assert.match(
  webAdapter,
  /private\(&path, &runtime\)\?;/,
  'derived environment must be written privately',
)
assert.match(webAdapter, /use box_manager_core::services::\{/)
assert.match(webAdapter, /impl ServiceRuntime for WebRuntime/)
assert.match(webAdapter, /services::statuses\(/)
assert.match(webAdapter, /services::enabled\(/)
for (const operation of ['start', 'control', 'stop']) {
  assert.ok(
    webAdapter.includes(`services::${operation}(&WebRuntime(`),
    `Web must delegate ${operation} to core services`,
  )
}
assert.match(
  webAdapter,
  /license\(self\.0,\s*None\)\?\s*\.get\("valid"\)/,
  'Web runtime must supply the license gate',
)
assert.match(webAdapter, /use box_manager_core::license as shared_license;/)
for (const operation of ['trusted_now', 'verify_token', 'status_from_token']) {
  assert.ok(
    webAdapter.includes(`shared_license::${operation}(`),
    `Web must use shared license ${operation}`,
  )
}
if (core.lib.includes('pub mod backup;')) {
  // Accept direct and flat grouped imports, including module aliases. Match
  // complete members so backup_store alone cannot satisfy the backup import.
  const coreImports = new Map()
  for (const [, name, alias] of webAdapter.matchAll(
    /use\s+box_manager_core::(\w+)(?:\s+as\s+(\w+))?\s*;/g,
  )) {
    coreImports.set(name, alias || name)
  }
  for (const [, members] of webAdapter.matchAll(/use\s+box_manager_core::\{([^{}]+)\}\s*;/g)) {
    for (const member of members.split(',')) {
      const binding = member.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/)
      if (binding) coreImports.set(binding[1], binding[2] || binding[1])
    }
  }
  for (const module of ['backup', 'backup_store']) {
    assert.ok(coreImports.has(module), 'Web must import core ' + module)
    assert.ok(core.lib.includes(`pub mod ${module};`), `core must export ${module}`)
  }
  const backupName = coreImports.get('backup')
  const storeName = coreImports.get('backup_store')
  assert.ok(
    webAdapter.includes(`${backupName}::restore_archive(`),
    'Web must use shared backup restore_archive',
  )
  for (const operation of ['list', 'resolve', 'create', 'import_bytes']) {
    assert.ok(
      webAdapter.includes(`${storeName}::${operation}(`),
      `Web must use shared backup_store ${operation}`,
    )
  }
  const backupStore = productionRust(
    fs.readFileSync(path.join(sharedDirectory, 'backup_store.rs'), 'utf8'),
  )
  assert.match(backupStore, /use crate::backup::\{self, Limits\};/)
  for (const operation of ['create_archive', 'validate_archive']) {
    assert.ok(
      backupStore.includes(`backup::${operation}(`),
      `backup_store must delegate ${operation} to shared backup`,
    )
  }
} else {
  console.log('Web backup: core contract checked; adapter integration pending pub mod backup')
}

console.log('headless Rust manager checks passed')
