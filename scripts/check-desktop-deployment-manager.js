'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const manager = path.join(root, 'apps/deployment-manager')
const frontend = fs.readFileSync(path.join(manager, 'src/main.js'), 'utf8')
const backend = fs.readFileSync(path.join(manager, 'src-tauri/src/lib.rs'), 'utf8')
const defaults = fs.readFileSync(path.join(manager, 'src-tauri/defaults.env'), 'utf8')
const styles = fs.readFileSync(path.join(manager, 'src/styles.css'), 'utf8')
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')
const builder = fs.readFileSync(
  path.join(root, 'scripts/build-desktop-offline-installer.js'),
  'utf8',
)

for (const file of [
  'package.json',
  'index.html',
  'src/main.js',
  'src/styles.css',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
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
  '安装配置',
  '运行日志',
  '帮助手册',
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
assert.match(builder, /PostgreSQL 和 Redis 均为选填/)
assert.match(builder, /--norsrc/)
assert.match(defaults, /^COMPOSE_PROFILES=creator,play,voxa$/m)
assert.match(defaults, /^BOX_DATABASE_URL=$/m)
assert.match(defaults, /^REDIS_HOST=$/m)
assert.match(backend, /if !config\.database_host\.trim\(\)\.is_empty\(\)/)
assert.match(backend, /if !config\.redis_host\.trim\(\)\.is_empty\(\)/)
assert.match(backend, /"creator,play,voxa"/)
assert.match(frontend, /data-setup-section/)
assert.match(frontend, /captureSetupForm/)
assert.match(frontend, /认识产品/)
assert.match(frontend, /快速部署/)
assert.match(frontend, /服务与端口/)
assert.match(frontend, /创作与游玩/)
assert.match(frontend, /玩家与权限/)
assert.match(frontend, /运维与排障/)
assert.match(frontend, /data-help-section/)
assert.match(styles, /html,\s*body,\s*#app[\s\S]*overflow: hidden/)
assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(styles, /\.help-layout/)
assert.doesNotMatch(defaults, /^BOX_POSTGRES_/m)
assert.doesNotMatch(defaults, /^BOX_REDIS_IMAGE=/m)
assert.match(backend, /REDIS_HOST/)
assert.match(backend, /BOX_DATABASE_URL/)
assert.match(backend, /Random|OsRng/)
assert.match(builder, /windows-amd64/)
assert.match(builder, /windows-arm64/)
assert.match(builder, /macos-amd64/)
assert.match(builder, /macos-arm64/)
assert.match(builder, /--no-bundle/)
assert.match(compose, /BOX_PLAYER_SERVICE_HOST_IP/)
assert.match(compose, /127\.0\.0\.1:\$\{BOX_CREATOR_PORT/)
assert.match(compose, /127\.0\.0\.1:\$\{BOX_VOXA_PORT/)

console.log('Desktop deployment manager checks passed')
