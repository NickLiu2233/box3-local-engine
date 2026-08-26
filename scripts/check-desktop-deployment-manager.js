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
  '运行日志',
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
assert.match(frontend, /data-creator-network-host="127\.0\.0\.1"/)
assert.match(frontend, /name="creatorHost" type="hidden"/)
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
assert.match(frontend, /data-service-logs/)
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
assert.match(builder, /generateDistributionMetadata\(metadataRoot/)
assert.match(builder, /Metadata must become a resource[\s\S]*?before that step/)
assert.doesNotMatch(builder, /开始使用\.txt/)
assert.match(builder, /BOX_ALLOW_DIRTY_RELEASE/)
assert.match(builder, /BOX_BUILD_COMMIT/)
assert.match(builder, /BOX_BUILD_DATE/)
assert.match(builder, /verify-desktop-offline-package\.js/)
assert.match(packageVerifier, /BOX-OFFLINE-IMAGE\.json/)
assert.match(packageVerifier, /THIRD-PARTY-NOTICES\.json/)
assert.match(packageVerifier, /SHA-256 不匹配/)
assert.match(packageVerifier, /function findMetadataRoot/)
assert.match(packageVerifier, /codesign', \['--verify', '--deep', '--strict'/)
assert.match(builder, /if \(!spec\.bundle\) \{[\s\S]*?fs\.copyFileSync\(archive/)
assert.match(tauriConfig, /"resources": \["payload"\]/)
assert.deepEqual(tauriConfiguration.bundle.icon, ['icons/icon.ico', 'icons/icon.icns'])
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
assert.match(backend, /禁止公网部署/)
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
assert.match(frontend, /function syncLogPolling\(/)
assert.match(frontend, /setInterval\(\(\) => loadLogs\(\{ renderPage: false \}\), 1500\)/)
assert.match(frontend, /正在连接日志流/)
assert.match(frontend, /followTail/)
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
assert.match(styles, /\.logs-page[\s\S]*grid-template-rows: 56px 40px minmax\(0, 1fr\)/)
assert.match(styles, /\.log-card[\s\S]*min-height: 0[\s\S]*display: flex/)
assert.match(styles, /\.log-card pre[\s\S]*overflow: auto/)
assert.doesNotMatch(styles, /\.log-card pre[\s\S]*scrollbar-width: none/)

console.log('Desktop deployment manager checks passed')
