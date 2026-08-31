'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const repoRoot = path.resolve(__dirname, '..')
const outputRoot = path.join(repoRoot, 'apps/local-engine/dist/server-packages')
const templateRoot = path.join(repoRoot, 'distribution/server')
const supportedArchitectures = new Set(['amd64', 'arm64'])

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function sha256(file) {
  const hash = crypto.createHash('sha256')
  const descriptor = fs.openSync(file, 'r')
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  try {
    let bytes = 0
    do {
      bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null)
      if (bytes) hash.update(buffer.subarray(0, bytes))
    } while (bytes)
  } finally {
    fs.closeSync(descriptor)
  }
  return hash.digest('hex')
}

function createZip(packageRoot, destination) {
  fs.rmSync(destination, { force: true })
  const result = spawnSync('zip', ['-rq', destination, path.basename(packageRoot)], {
    cwd: path.dirname(packageRoot),
    stdio: 'inherit',
  })
  if (result.status !== 0) fail(`服务器离线包 ZIP 打包失败，退出码 ${result.status}`)
}

function serviceSection(source, start, end) {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex)
  if (startIndex < 0 || endIndex < 0) fail(`无法从 Compose 模板提取服务：${start.trim()}`)
  return source.slice(startIndex, endIndex)
}

function headlessCompose() {
  const source = fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8')
  const servicesIndex = source.indexOf('services:\n')
  const header = source.slice(0, servicesIndex + 'services:\n'.length)
  const playerService = serviceSection(
    source,
    '  player-service:',
    '  player-auth-portal:',
  ).replace(/^ {6}BOX_CREATOR_PUBLIC_URL:.*\n/m, '')
  const authPortal = serviceSection(source, '  player-auth-portal:', '  server-manager:').replace(
    /^ {6}AUTH_DEMO_CREATOR_URL:.*\n/m,
    '',
  )
  const serverManager = serviceSection(source, '  server-manager:', '  creator:')
  const play = serviceSection(source, '  play-storage-init:', '  voxa:')
  const volumes = 'volumes:\n  box-play-storage:\n'
  if (servicesIndex < 0 || !playerService || !authPortal || !serverManager || !play) {
    fail('无法生成游玩服务器 Compose 配置')
  }
  return `${header}${playerService}${authPortal}${serverManager}${play}${volumes}`
}

function main() {
  const architecture = process.argv[2]
  const archive = process.argv[3] ? path.resolve(process.argv[3]) : ''
  if (!supportedArchitectures.has(architecture)) {
    fail('用法: node scripts/build-headless-server-package.js <amd64|arm64> <镜像归档.tar.gz>')
  }
  if (!archive || !fs.statSync(archive, { throwIfNoEntry: false })?.isFile()) {
    fail('离线镜像归档不存在')
  }
  if (!path.basename(archive).includes(`linux-${architecture}`)) {
    fail(`镜像归档名称与目标架构 ${architecture} 不一致`)
  }

  const version = require(path.join(repoRoot, 'package.json')).version
  const packageName = `BOX3-Engine-Server-${version}-linux-${architecture}`
  const packageRoot = path.join(outputRoot, packageName)
  const imageTag = `v${version}-linux-${architecture}`
  fs.rmSync(packageRoot, { recursive: true, force: true })
  fs.mkdirSync(packageRoot, { recursive: true })

  fs.cpSync(templateRoot, packageRoot, { recursive: true })
  fs.writeFileSync(path.join(packageRoot, 'compose.yml'), headlessCompose())
  fs.copyFileSync(archive, path.join(packageRoot, path.basename(archive)))

  const envTemplate = fs
    .readFileSync(path.join(templateRoot, '.env.example'), 'utf8')
    .replaceAll('__BOX_IMAGE_TAG__', imageTag)
    .replaceAll('__BOX_PLAY_PLATFORM__', `linux/${architecture}`)
  fs.writeFileSync(path.join(packageRoot, '.env.example'), envTemplate)

  const installer = fs
    .readFileSync(path.join(packageRoot, 'install.sh'), 'utf8')
    .replaceAll('__IMAGE_ARCHIVE__', path.basename(archive))
  fs.writeFileSync(path.join(packageRoot, 'install.sh'), installer, { mode: 0o755 })
  for (const file of ['status.sh', 'logs.sh', 'stop.sh', 'verify.sh']) {
    fs.chmodSync(path.join(packageRoot, file), 0o755)
  }

  const files = fs
    .readdirSync(packageRoot)
    .filter((file) => file !== 'SHA256SUMS')
    .sort()
    .map((file) => `${sha256(path.join(packageRoot, file))}  ${file}`)
  fs.writeFileSync(path.join(packageRoot, 'SHA256SUMS'), `${files.join('\n')}\n`)

  const zip = path.join(outputRoot, `${packageName}.zip`)
  createZip(packageRoot, zip)
  console.log(`Headless server package: ${zip}`)
}

if (require.main === module) main()

module.exports = { headlessCompose }
