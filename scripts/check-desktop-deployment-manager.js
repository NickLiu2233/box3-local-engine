'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const manager = path.join(root, 'apps/deployment-manager')
const frontend = fs.readFileSync(path.join(manager, 'src/main.js'), 'utf8')
const backendSourceDirectory = path.join(manager, 'src-tauri/src')
const backend = fs
  .readdirSync(backendSourceDirectory)
  .filter((file) => file.endsWith('.rs'))
  .sort()
  .map((file) => fs.readFileSync(path.join(backendSourceDirectory, file), 'utf8'))
  .join('\n')
const defaults = fs.readFileSync(path.join(manager, 'src-tauri/defaults.env'), 'utf8')
const styles = fs.readFileSync(path.join(manager, 'src/styles.css'), 'utf8')
const tauriConfig = fs.readFileSync(path.join(manager, 'src-tauri/tauri.conf.json'), 'utf8')
const tauriEntry = fs.readFileSync(path.join(manager, 'src-tauri/src/main.rs'), 'utf8')
const tauriConfiguration = JSON.parse(tauriConfig)
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')
const launcher = fs.readFileSync(path.join(root, 'apps/local-engine/src/launcher.js'), 'utf8')
const builder = fs.readFileSync(
  path.join(root, 'scripts/build-desktop-offline-installer.js'),
  'utf8',
)
const packageVerifier = fs.readFileSync(
  path.join(root, 'scripts/verify-desktop-offline-package.js'),
  'utf8',
)
const creatorWorkCenter = fs.readFileSync(
  path.join(root, 'apps/game/pages/projects/index.tsx'),
  'utf8',
)
const playWorkCenter = fs.readFileSync(path.join(root, 'apps/game/pages/index.tsx'), 'utf8')
const localEngineLauncher = fs.readFileSync(
  path.join(root, 'apps/local-engine/src/launcher.js'),
  'utf8',
)
const projectManager = fs.readFileSync(
  path.join(root, 'apps/local-engine/src/project-manager.js'),
  'utf8',
)
const playerIdentity = fs.readFileSync(
  path.join(root, 'apps/game/server/local-player-identity.ts'),
  'utf8',
)
const playAdminSecurity = fs.readFileSync(
  path.join(root, 'apps/game/server/play-admin-security.ts'),
  'utf8',
)
const authPortalServer = fs.readFileSync(
  path.join(root, 'examples/player-auth-portal/server.js'),
  'utf8',
)

for (const file of [
  'package.json',
  'index.html',
  'src/main.js',
  'src/styles.css',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'src-tauri/src/config.rs',
  'src-tauri/src/commands.rs',
  'src-tauri/src/docker.rs',
  'src-tauri/src/lib.rs',
  'src-tauri/defaults.env',
]) {
  assert.ok(
    fs.statSync(path.join(manager, file)).isFile(),
    `missing deployment manager file: ${file}`,
  )
}

for (const value of [
  '总览',
  '数据配置',
  '性能监控',
  '关于',
  '数据服务',
  '访问设置',
  '运行容量',
  'PostgreSQL',
  'Redis',
]) {
  assert.ok(frontend.includes(value), `deployment UI is missing ${value}`)
}
assert.doesNotMatch(frontend, /内置数据库|databaseMode/)
assert.doesNotMatch(backend, /database_mode|COMPOSE_PROFILES.*infra/)
assert.doesNotMatch(builder, /选择内置数据库/)
assert.match(builder, /--norsrc/)
assert.match(defaults, /^BOX_PLAY_PUBLIC_HOST=127\.0\.0\.1$/m)
assert.match(defaults, /^BOX_CREATOR_HOST=127\.0\.0\.1$/m)
assert.match(defaults, /^BOX_DATABASE_HOST=$/m)
assert.match(defaults, /^BOX_DATABASE_PASSWORD=$/m)
assert.doesNotMatch(defaults, /^COMPOSE_PROFILES=/m)
assert.doesNotMatch(defaults, /^BOX_DATABASE_URL=/m)
assert.doesNotMatch(defaults, /^BOX_IMAGE_TAG=/m)
assert.doesNotMatch(defaults, /^BOX_.*PUBLIC_URL=/m)
assert.match(defaults, /^REDIS_HOST=$/m)
for (const [name, value] of [
  ['BOX_LOCAL_PLAYER_LIMIT', '8'],
  ['BOX_CREATOR_EDIT_PREWARM_RUNTIMES', '6'],
  ['BOX_CREATOR_PLAY_PREWARM_RUNTIMES', '0'],
  ['BOX_PLAY_PREWARM_RUNTIMES', '8'],
  ['BOX_SCRIPT_HEAP_MB', '512'],
  ['BOX_SCRIPT_MEMORY_MB', '512'],
  ['BOX_RUNTIME_IDLE_TIMEOUT_MS', '900000'],
  ['BOX_RUNTIME_START_TIMEOUT_MS', '1800000'],
  ['BOX_TELEPORT_MAX_ROOMS', '64'],
  ['BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS', '900000'],
  ['BOX_PLAYER_REGISTRATION_ENABLED', 'true'],
  ['BOX_PLAY_LIBRARY_READ_ONLY', 'false'],
  ['BOX_PLAYER_SERVICE_MEMORY_LIMIT', '1g'],
  ['BOX_PLAYER_SERVICE_CPU_LIMIT', '1.0'],
  ['BOX_AUTH_PORTAL_MEMORY_LIMIT', '128m'],
  ['BOX_AUTH_PORTAL_CPU_LIMIT', '0.5'],
  ['BOX_CREATOR_MEMORY_LIMIT', '6g'],
  ['BOX_CREATOR_CPU_LIMIT', '4.0'],
  ['BOX_PLAY_MEMORY_LIMIT', '4g'],
  ['BOX_PLAY_CPU_LIMIT', '4.0'],
  ['BOX_DATABASE_POOL_SIZE', '10'],
  ['STORAGE_CACHE_REDIS_TTL', '240'],
]) {
  assert.match(defaults, new RegExp(`^${name}=${value}$`, 'm'))
  assert.match(backend, new RegExp(`"${name}"`))
}

// A setting appearing in the manager backend is not enough: it must also
// cross the Compose boundary and reach code that uses it. Keep this table
// explicit so a newly added UI option cannot silently become a no-op.
for (const [name, composePattern, consumer, consumerPattern] of [
  [
    'BOX_LOCAL_PLAYER_LIMIT',
    /BOX_LOCAL_PLAYER_LIMIT: \$\{BOX_LOCAL_PLAYER_LIMIT:-8\}/,
    localEngineLauncher,
    /process\.env\.BOX_LOCAL_PLAYER_LIMIT/,
  ],
  [
    'BOX_PLAY_MAX_RUNTIMES',
    /BOX_PLAY_MAX_RUNTIMES: \$\{BOX_PLAY_MAX_RUNTIMES:-8\}/,
    localEngineLauncher,
    /process\.env\.BOX_PLAY_MAX_RUNTIMES/,
  ],
  [
    'BOX_CREATOR_EDIT_MAX_RUNTIMES',
    /BOX_CREATOR_EDIT_MAX_RUNTIMES: \$\{BOX_CREATOR_EDIT_MAX_RUNTIMES:-6\}/,
    localEngineLauncher,
    /process\.env\.BOX_CREATOR_EDIT_MAX_RUNTIMES/,
  ],
  [
    'BOX_CREATOR_PLAY_MAX_RUNTIMES',
    /BOX_CREATOR_PLAY_MAX_RUNTIMES: \$\{BOX_CREATOR_PLAY_MAX_RUNTIMES:-4\}/,
    localEngineLauncher,
    /process\.env\.BOX_CREATOR_PLAY_MAX_RUNTIMES/,
  ],
  [
    'BOX_CREATOR_EDIT_PREWARM_RUNTIMES',
    /BOX_CREATOR_EDIT_PREWARM_RUNTIMES: \$\{BOX_CREATOR_EDIT_PREWARM_RUNTIMES:-6\}/,
    localEngineLauncher,
    /['"]BOX_CREATOR_EDIT_PREWARM_RUNTIMES['"]/,
  ],
  [
    'BOX_CREATOR_PLAY_PREWARM_RUNTIMES',
    /BOX_CREATOR_PLAY_PREWARM_RUNTIMES: \$\{BOX_CREATOR_PLAY_PREWARM_RUNTIMES:-0\}/,
    localEngineLauncher,
    /['"]BOX_CREATOR_PLAY_PREWARM_RUNTIMES['"]/,
  ],
  [
    'BOX_PLAY_PREWARM_RUNTIMES',
    /BOX_PLAY_PREWARM_RUNTIMES: \$\{BOX_PLAY_PREWARM_RUNTIMES:-8\}/,
    localEngineLauncher,
    /['"]BOX_PLAY_PREWARM_RUNTIMES['"]/,
  ],
  [
    'BOX_SCRIPT_HEAP_MB',
    /BOX_SCRIPT_HEAP_MB: \$\{BOX_SCRIPT_HEAP_MB:-512\}/,
    localEngineLauncher,
    /process\.env\.BOX_SCRIPT_HEAP_MB/,
  ],
  [
    'BOX_SCRIPT_MEMORY_MB',
    /SCRIPT_MEMORY_LIMIT: \$\{BOX_SCRIPT_MEMORY_MB:-512\}/,
    localEngineLauncher,
    /process\.env\.BOX_SCRIPT_MEMORY_MB/,
  ],
  [
    'BOX_RUNTIME_IDLE_TIMEOUT_MS',
    /BOX_RUNTIME_IDLE_TIMEOUT_MS: \$\{BOX_RUNTIME_IDLE_TIMEOUT_MS:-900000\}/,
    localEngineLauncher,
    /process\.env\.BOX_RUNTIME_IDLE_TIMEOUT_MS/,
  ],
  [
    'BOX_RUNTIME_START_TIMEOUT_MS',
    /BOX_RUNTIME_START_TIMEOUT_MS: \$\{BOX_RUNTIME_START_TIMEOUT_MS:-1800000\}/,
    localEngineLauncher,
    /process\.env\.BOX_RUNTIME_START_TIMEOUT_MS/,
  ],
  [
    'BOX_TELEPORT_MAX_ROOMS',
    /BOX_TELEPORT_MAX_ROOMS: \$\{BOX_TELEPORT_MAX_ROOMS:-64\}/,
    localEngineLauncher,
    /process\.env\.BOX_TELEPORT_MAX_ROOMS/,
  ],
  [
    'BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS',
    /BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS: \$\{BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS:-900000\}/,
    localEngineLauncher,
    /process\.env\.BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS/,
  ],
  [
    'BOX_DATABASE_POOL_SIZE',
    /BOX_DATABASE_POOL_SIZE: \$\{BOX_DATABASE_POOL_SIZE:-10\}/,
    playerIdentity,
    /process\.env\.BOX_DATABASE_POOL_SIZE/,
  ],
  [
    'BOX_AUTO_BACKUP_ENABLED',
    /BOX_AUTO_BACKUP_ENABLED: \$\{BOX_AUTO_BACKUP_ENABLED:-false\}/,
    projectManager,
    /process\.env\.BOX_AUTO_BACKUP_ENABLED/,
  ],
  [
    'BOX_AUTO_BACKUP_INTERVAL_MINUTES',
    /BOX_AUTO_BACKUP_INTERVAL_MINUTES: \$\{BOX_AUTO_BACKUP_INTERVAL_MINUTES:-60\}/,
    projectManager,
    /process\.env\.BOX_AUTO_BACKUP_INTERVAL_MINUTES/,
  ],
  [
    'BOX_AUTO_BACKUP_RETENTION_COUNT',
    /BOX_AUTO_BACKUP_RETENTION_COUNT: \$\{BOX_AUTO_BACKUP_RETENTION_COUNT:-24\}/,
    projectManager,
    /process\.env\.BOX_AUTO_BACKUP_RETENTION_COUNT/,
  ],
  [
    'BOX_AUTO_BACKUP_RETENTION_DAYS',
    /BOX_AUTO_BACKUP_RETENTION_DAYS: \$\{BOX_AUTO_BACKUP_RETENTION_DAYS:-30\}/,
    projectManager,
    /process\.env\.BOX_AUTO_BACKUP_RETENTION_DAYS/,
  ],
  [
    'BOX_PLAYER_REGISTRATION_ENABLED',
    /BOX_PLAYER_REGISTRATION_ENABLED: \$\{BOX_PLAYER_REGISTRATION_ENABLED:-true\}/,
    playerIdentity,
    /process\.env\.BOX_PLAYER_REGISTRATION_ENABLED/,
  ],
  [
    'AUTH_DEMO_REGISTRATION_ENABLED',
    /AUTH_DEMO_REGISTRATION_ENABLED: \$\{BOX_PLAYER_REGISTRATION_ENABLED:-true\}/,
    authPortalServer,
    /AUTH_DEMO_REGISTRATION_ENABLED/,
  ],
  [
    'BOX_PLAY_LIBRARY_READ_ONLY',
    /BOX_PLAY_LIBRARY_READ_ONLY: \$\{BOX_PLAY_LIBRARY_READ_ONLY:-true\}/,
    playAdminSecurity,
    /process\.env\.BOX_PLAY_LIBRARY_READ_ONLY/,
  ],
]) {
  assert.match(compose, composePattern, `${name} is not forwarded by Compose`)
  assert.match(consumer, consumerPattern, `${name} has no runtime consumer`)
}

for (const [name, pattern] of [
  ['BOX_PLAYER_SERVICE_MEMORY_LIMIT', /mem_limit: \$\{BOX_PLAYER_SERVICE_MEMORY_LIMIT:-1g\}/],
  ['BOX_PLAYER_SERVICE_CPU_LIMIT', /cpus: \$\{BOX_PLAYER_SERVICE_CPU_LIMIT:-1\.0\}/],
  ['BOX_AUTH_PORTAL_MEMORY_LIMIT', /mem_limit: \$\{BOX_AUTH_PORTAL_MEMORY_LIMIT:-128m\}/],
  ['BOX_AUTH_PORTAL_CPU_LIMIT', /cpus: \$\{BOX_AUTH_PORTAL_CPU_LIMIT:-0\.5\}/],
  ['BOX_CREATOR_MEMORY_LIMIT', /mem_limit: \$\{BOX_CREATOR_MEMORY_LIMIT:-6g\}/],
  ['BOX_CREATOR_CPU_LIMIT', /cpus: \$\{BOX_CREATOR_CPU_LIMIT:-4\.0\}/],
  ['BOX_PLAY_MEMORY_LIMIT', /mem_limit: \$\{BOX_PLAY_MEMORY_LIMIT:-4g\}/],
  ['BOX_PLAY_CPU_LIMIT', /cpus: \$\{BOX_PLAY_CPU_LIMIT:-4\.0\}/],
]) {
  assert.match(compose, pattern, `${name} does not control a Docker resource limit`)
}
for (const field of [
  'playerLimit',
  'runtimeIdleMinutes',
  'runtimeStartTimeoutMinutes',
  'teleportMaxRooms',
  'teleportRoomIdleMinutes',
  'creatorEditPrewarmRuntimes',
  'creatorPlayPrewarmRuntimes',
  'playPrewarmRuntimes',
  'scriptMemoryMb',
  'databasePoolSize',
  'storageCacheRedisTtl',
  'playerServiceMemoryMb',
  'playerServiceCpuLimit',
  'authPortalMemoryMb',
  'authPortalCpuLimit',
  'creatorMemoryMb',
  'creatorCpuLimit',
  'playMemoryMb',
  'playCpuLimit',
]) {
  assert.match(frontend, new RegExp(`input\\('${field}'`))
}
assert.match(frontend, /运行时空闲回收（分钟）/)
assert.match(frontend, /Teleport 私有房间上限/)
assert.match(backend, /fn validate_runtime_capacity/)
assert.match(backend, /fn validate_operator_performance/)
assert.match(backend, /fn minutes_to_milliseconds/)
assert.match(frontend, /允许新玩家注册/)
assert.match(frontend, /允许网页管理地图包/)
assert.match(backend, /if config\.library_management_enabled[\s\S]*?"false"[\s\S]*?"true"/)
assert.match(backend, /"BOX_SCRIPT_HEAP_MB"[\s\S]*?"BOX_SCRIPT_MEMORY_MB"/)
assert.match(frontend, /PostgreSQL<\/h2><span>必填/)
assert.match(backend, /必须配置 PostgreSQL 数据库地址后才能启动服务/)
assert.match(backend, /check_remote_endpoint\(" PostgreSQL", &database_host, database_port\)/)
assert.match(backend, /if !config\.redis_host\.trim\(\)\.is_empty\(\)/)
assert.match(backend, /"player-service,auth-portal,creator,play,voxa"/)
assert.doesNotMatch(backend, /"creator,play,voxa"/)
assert.match(backend, /Applications\/Docker\.app\/Contents\/Resources\/bin\/docker/)
assert.ok(backend.includes(String.raw`r"C:\Program Files\Docker\Docker\resources\bin\docker.exe"`))
assert.match(backend, /fn unavailable_message/)
assert.match(backend, /fn synchronize_runtime_image_tag/)
assert.match(backend, /fn runtime_env_path/)
assert.match(backend, /fn generate_runtime_environment/)
assert.match(backend, /runtime_env_path\(app\)/)
assert.match(backend, /set_env\(&mut runtime, "BOX_IMAGE_TAG", IMAGE_TAG\)/)
assert.match(backend, /synchronize_runtime_image_tag\(app\)\?;/)
assert.doesNotMatch(
  backend,
  /请把 box-local-engine-images-\*-\{expected\}\.tar\.gz 与程序放在同一目录/,
)
assert.doesNotMatch(backend, /Command::new\("docker"\)\.args/)
assert.match(frontend, /data-setup-section/)
assert.match(frontend, /captureSetupForm/)
// A setup-tab click is registered after the raw .env handlers. Keep those
// handlers top-level: nesting either in saveConfiguration makes bindEvents
// throw a ReferenceError and leaves every later setup tab inert.
assert.match(
  frontend,
  /async function saveConfiguration\(event\)[\s\S]*?\n}\n\nasync function saveRawEnvironment\(\)/,
)
assert.match(frontend, /function switchSetupSection\(section\)/)
for (const mode of ['local', 'lan', 'public']) {
  assert.match(frontend, new RegExp(`data-creator-network-mode="${mode}"`))
}
assert.match(frontend, /name="creatorNetworkMode" type="hidden"/)
assert.match(frontend, /name="creatorHost" type="hidden"/)
assert.match(frontend, /if \(mode === 'local'\) state\.config\.creatorHost = '127\.0\.0\.1'/)
assert.match(
  frontend,
  /if \(mode === 'lan' && state\.config\.lanIp\) state\.config\.creatorHost = state\.config\.lanIp/,
)
assert.doesNotMatch(frontend, /创作端访问地址/)
assert.match(frontend, /data-play-network-mode="public"/)
assert.match(frontend, /const inferredPlayAccessMode/)
assert.match(backend, /fn detect_lan_ip/)
for (const port of ['playPort', 'voxaPort', 'creatorPort', 'playerServicePort', 'authPortalPort']) {
  assert.match(frontend, new RegExp(`input\\('${port}'`))
}
assert.match(backend, /不能使用同一个端口/)
assert.match(backend, /BOX_AUTH_PORTAL_PORT/)
assert.match(compose, /VOXA_URL: \$\{BOX_VOXA_PUBLIC_URL/)
assert.match(compose, /\n {6}BOX_VOXA_PUBLIC_URL: \$\{BOX_VOXA_PUBLIC_URL/)
assert.match(compose, /BOX_RESOURCE_ALLOWED_ORIGINS: \$\{BOX_RESOURCE_ALLOWED_ORIGINS:-\}/)
assert.match(launcher, /process\.env\.VOXA_URL/)
assert.match(backend, /只允许打开当前配置中的 BOX 服务地址/)
assert.doesNotMatch(backend, /只允许打开本机 BOX 服务地址/)
assert.match(frontend, /box-manager-theme/)
assert.match(frontend, /跟随系统/)
assert.match(frontend, /发行许可/)
assert.match(frontend, /发行许可证/)
assert.match(frontend, /get_legal_notices/)
assert.match(backend, /fn get_legal_notices/)
assert.match(backend, /include_str!\("\.\.\/\.\.\/\.\.\/\.\.\/distribution\/LICENSE\.txt"\)/)
assert.match(frontend, /data-open-legal-document/)
assert.match(frontend, /function legalDocumentDialog\(\)/)
assert.match(styles, /\.about-document-row/)
assert.match(styles, /\.legal-dialog/)
assert.match(frontend, /data-theme-choice/)
assert.match(frontend, /get_performance_status/)
assert.match(frontend, /环境检查/)
assert.doesNotMatch(frontend, /managementPage/)
assert.doesNotMatch(frontend, /navItem\('projects'/)
assert.doesNotMatch(frontend, /navItem\('players'/)
assert.doesNotMatch(styles, /\.embedded-page/)
assert.match(frontend, /run_environment_checks/)
assert.match(frontend, /test_remote_connection/)
assert.match(frontend, /data-service-action/)
assert.match(frontend, /export_diagnostics/)
assert.match(backend, /fn is_sensitive_env_key/)
assert.match(backend, /\[REDACTED\]/)
assert.match(backend, /async fn control_service/)
assert.match(frontend, /setInterval\(refreshPerformance, 5000\)/)
assert.match(backend, /"stats",\s*"--no-stream"/)
assert.match(styles, /:root\[data-theme='light'\]/)
assert.match(styles, /:root\[data-theme='dark'\]/)
assert.doesNotMatch(creatorWorkCenter, /href="\/system"/)
assert.doesNotMatch(playWorkCenter, /href="\/play-system"/)
assert.match(styles, /html,\s*body,\s*#app[\s\S]*overflow: hidden/)
assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
assert.doesNotMatch(styles, /\.help-layout/)
assert.doesNotMatch(defaults, /^BOX_POSTGRES_/m)
assert.doesNotMatch(defaults, /^BOX_REDIS_IMAGE=/m)
assert.match(backend, /REDIS_HOST/)
assert.match(backend, /BOX_DATABASE_URL/)
assert.match(backend, /Random|OsRng/)
assert.match(builder, /windows-amd64/)
assert.match(builder, /windows-arm64/)
assert.match(builder, /macos-amd64/)
assert.match(builder, /macos-arm64/)
assert.match(builder, /linux-amd64/)
assert.match(builder, /linux-arm64/)
assert.match(builder, /platform\.endsWith\('arm64'\) \? 'arm64' : 'amd64'/)
assert.match(
  builder,
  /archiveImageTags\.length === 1 \? archiveImageTags\[0\] : process\.env\.BOX_IMAGE_TAG/,
)
assert.match(builder, /Embed its[\s\S]*image archive/)
assert.match(builder, /BOX-OFFLINE-IMAGE\.json/)
assert.match(builder, /sha256: sha256\(archive\)/)
assert.match(builder, /Contents\/Resources\/payload\/metadata/)
assert.match(builder, /ensureMacApplicationSignature/)
assert.match(builder, /CodeResources/)
assert.match(builder, /generateDistributionMetadata\(metadataRoot/)
assert.match(builder, /Metadata must become a resource[\s\S]*?before that step/)
assert.doesNotMatch(builder, /开始使用\.txt/)
assert.match(builder, /BOX_ALLOW_DIRTY_RELEASE/)
assert.match(builder, /BOX_BUILD_COMMIT/)
assert.match(builder, /BOX_BUILD_DATE/)
assert.match(builder, /verify-desktop-offline-package\.js/)
assert.match(packageVerifier, /BOX-OFFLINE-IMAGE\.json/)
assert.match(packageVerifier, /CodeResources/)
assert.match(packageVerifier, /BOX_DESKTOP_REQUIRE_SIGNING/)
assert.match(packageVerifier, /THIRD-PARTY-NOTICES\.json/)
assert.match(packageVerifier, /SHA-256 不匹配/)
assert.match(packageVerifier, /function findMetadataRoot/)
assert.match(packageVerifier, /codesign', \['--verify', '--deep', '--strict'/)
assert.match(builder, /if \(!spec\.bundle\) \{[\s\S]*?fs\.copyFileSync\(archive/)
assert.match(tauriConfig, /"resources": \["payload"\]/)
assert.deepEqual(tauriConfiguration.bundle.icon, ['icons/icon.ico', 'icons/icon.icns'])
assert.match(tauriEntry, /windows_subsystem = "windows"/)
const windowsIcon = path.join(manager, 'src-tauri/icons/icon.ico')
assert.ok(fs.statSync(windowsIcon).isFile(), 'missing Windows application icon')
assert.deepEqual(fs.readFileSync(windowsIcon).subarray(0, 4), Buffer.from([0, 0, 1, 0]))
assert.ok(
  fs.statSync(path.join(manager, 'src-tauri/icons/icon.png')).isFile(),
  'missing Tauri runtime icon',
)
assert.ok(
  fs.statSync(path.join(manager, 'src-tauri/icons/icon.icns')).isFile(),
  'missing macOS application icon',
)
assert.match(builder, /--no-bundle/)
assert.match(compose, /BOX_BIND_IP:-127\.0\.0\.1/)
assert.match(compose, /BOX_CREATOR_BIND_IP:-127\.0\.0\.1}:\$\{BOX_CREATOR_PORT/)
assert.match(compose, /BOX_VOXA_BIND_IP:-127\.0\.0\.1}:\$\{BOX_VOXA_PORT/)
assert.doesNotMatch(frontend, /name="bindIp"/)
// Saving data configuration must be a non-disruptive operation. It keeps the
// user on the current setup page; starting containers remains an explicit
// choice from the overview page.
assert.match(frontend, /保存配置/)
assert.match(frontend, /已保存在当前页面，服务不会自动启动/)
assert.match(frontend, /class="toast success"/)
assert.doesNotMatch(frontend, /state\.page = 'overview'\s*\n\s*state\.notice/)
assert.match(frontend, /function getServiceUrl\(/)
assert.match(frontend, /function startScopeDialog\(/)
assert.match(frontend, /class="dialog-backdrop"/)
assert.match(frontend, /data-start-scope="all"/)
assert.match(frontend, /data-start-scope="play"/)
assert.match(frontend, /data-start-scope="creator"/)
assert.match(frontend, /service-more-menu/)
assert.match(frontend, /running \? `<button data-copy-url/)
assert.match(frontend, /function closeServiceMenuOnOutside\(/)
assert.match(frontend, /target\.closest\('\.service-more'\)/)
assert.match(styles, /\.start-dialog/)
assert.match(styles, /\.dialog-backdrop/)
assert.doesNotMatch(frontend, /function overviewNextStep\(/)
assert.doesNotMatch(styles, /\.next-step-card/)
assert.doesNotMatch(frontend, /install_and_start/)
assert.match(backend, /async fn save_configuration_command/)
assert.match(backend, /async fn start_services\(app: AppHandle, scope: String\)/)
for (const scope of ['"all"', '"creator"', '"play"']) {
  assert.match(backend, new RegExp(scope))
}
assert.doesNotMatch(backend, /async fn install_and_start/)
assert.match(backend, /fn validate_creator_host/)
assert.match(backend, /"local" \| "lan" \| "public" => Ok\(value\)/)
assert.match(frontend, /不建议直接向公网开放创作端/)
assert.match(backend, /"BOX_CREATOR_BIND_IP", creator_bind_ip/)
assert.match(backend, /"BOX_VOXA_BIND_IP", creator_bind_ip/)
assert.match(backend, /fn enforce_creator_network_policy/)
assert.match(backend, /enforce_creator_network_policy\(app\)\?;/)
assert.match(backend, /BOX_CREATOR_PUBLIC_URL/)
assert.match(backend, /BOX_VOXA_ALLOWED_ORIGINS/)
assert.match(backend, /"BOX_CREATOR_ALLOWED_HOSTS", &creator_host/)
assert.match(
  backend,
  /"BOX_RESOURCE_ALLOWED_ORIGINS",\s*&creator_origins/,
  'the generated runtime config must allow the embedded VOXA origin to read Creator runtime blobs',
)
assert.match(
  compose,
  /VOXA_URL: \$\{BOX_VOXA_PUBLIC_URL[^\n]*\n\s*BOX_VOXA_PUBLIC_URL: \$\{BOX_VOXA_PUBLIC_URL/,
  'Creator must receive the VOXA public origin so its child runtimes expose the required CORS header',
)
assert.match(frontend, /服主与安全/)
assert.match(frontend, /原始 \.env/)
assert.match(frontend, /配置说明：这些服务用来做什么？/)
assert.match(frontend, /业务 DB \/ 缓存 DB/)
assert.match(styles, /\.setup-explainer/)
assert.match(frontend, /secretInput\('playAdminToken'/)
assert.match(frontend, /首次保存配置时会自动生成/)
assert.match(frontend, /id="toggle-owner-secrets"/)
assert.match(frontend, /async function toggleOwnerSecrets\(\)/)
assert.match(backend, /fn get_owner_secrets\(app: AppHandle\)/)
assert.match(backend, /OwnerSecretsView/)
assert.match(frontend, /data-save-raw-environment/)
assert.doesNotMatch(frontend, /运行日志|查看运行日志|syncLogPolling|loadLogs/)
assert.doesNotMatch(backend, /fn get_logs|fn get_service_logs/)
assert.match(frontend, /服主交流QQ群：1107448537/)
assert.match(frontend, /open_community_group/)
assert.match(backend, /fn open_community_group\(\)/)
assert.match(frontend, /addEventListener\('contextmenu', \(event\) => event\.preventDefault\(\)\)/)
assert.match(backend, /fn get_raw_environment/)
assert.match(backend, /fn save_raw_environment/)
assert.match(backend, /fn get_about_info/)
assert.match(backend, /source_revision/)
assert.match(frontend, /function about\(\)/)
assert.match(frontend, /get_about_info/)
assert.match(styles, /\.about-page/)
assert.match(backend, /normalize_owner_environment/)
assert.match(backend, /BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD/)
assert.match(backend, /remove_env\(&mut normalized, legacy\)/)
assert.match(backend, /fn write_private_file/)
assert.match(backend, /fn verify_offline_image_archive/)
assert.match(backend, /fn offline_image_digest_path/)
assert.match(backend, /let archive_digest = verify_offline_image_archive\(app, &archive\)/)
assert.match(backend, /imported_digest\.as_deref\(\) == Some\(archive_digest\.as_str\(\)\)/)
assert.match(backend, /write_private_file\(\s*&digest_path,\s*format!\("\{archive_digest\}\\n"\)/)
assert.match(backend, /SHA-256 校验失败/)
assert.match(backend, /BOX-OFFLINE-IMAGE\.json/)
const saveConfigurationCommand = backend.match(
  /async fn save_configuration_command[\s\S]*?(?=\n#\[tauri::command\]\nasync fn start_services)/,
)?.[0]
assert.ok(saveConfigurationCommand, 'missing save configuration command body')
assert.doesNotMatch(saveConfigurationCommand, /ensure_images|compose_output/)
assert.match(frontend, /allHealthy \? '' : `<button class="button primary" id="start"/)
// The main shell is intentionally fixed-height. The log pane therefore needs
// to reserve space for the page header and filters, then expose its own
// vertical scrollbar instead of being clipped below the viewport.
assert.doesNotMatch(styles, /\.logs-page|\.log-card|\.log-live-status/)

console.log('Desktop deployment manager checks passed')
