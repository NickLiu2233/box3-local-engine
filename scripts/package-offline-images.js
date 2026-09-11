'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const architectureByNode = { x64: 'amd64', arm64: 'arm64' }
const architecture = process.argv[2] || architectureByNode[process.arch]
const supportedArchitectures = new Set(['amd64', 'arm64'])
const services = [
  'player-service',
  'player-auth-portal',
  'server-manager',
  'creator',
  'play',
  'voxa',
]

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

if (!supportedArchitectures.has(architecture)) {
  fail('用法: pnpm package:images [amd64|arm64]')
}

const version = require(path.join(root, 'package.json')).version
const tag = `v${version}-linux-${architecture}`
const outputDirectory = path.join(root, 'apps/local-engine/dist/images')
const output = path.join(outputDirectory, `box-local-engine-images-${tag}.tar.gz`)
const environment = {
  ...process.env,
  BOX_IMAGE_TAG: tag,
  BOX_PLAY_PLATFORM: `linux/${architecture}`,
  DOCKER_DEFAULT_PLATFORM: `linux/${architecture}`,
  BOX_BUILD_VERSION: process.env.BOX_BUILD_VERSION || `v${version}`,
  BOX_BUILD_DATE: process.env.BOX_BUILD_DATE || new Date().toISOString(),
  BOX_BUILD_SOURCE: process.env.BOX_BUILD_SOURCE || 'local',
}

for (const service of services) {
  const result = spawnSync('docker', ['compose', 'build', service], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
  })
  if (result.status !== 0) fail(`构建 ${service} 镜像失败，退出码 ${result.status ?? 'unknown'}`)
}

fs.mkdirSync(outputDirectory, { recursive: true })
fs.rmSync(output, { force: true })
const save = spawn(
  'docker',
  ['image', 'save', ...services.map((service) => `box-local-engine-${service}:${tag}`)],
  {
    cwd: root,
    env: environment,
    stdio: ['ignore', 'pipe', 'inherit'],
  },
)
const outputDescriptor = fs.openSync(output, 'w')
const gzip = spawn('gzip', ['-1'], { stdio: ['pipe', outputDescriptor, 'inherit'] })
save.stdout.pipe(gzip.stdin)

Promise.all([
  new Promise((resolve) => save.once('close', resolve)),
  new Promise((resolve) => gzip.once('close', resolve)),
]).then(([saveStatus, gzipStatus]) => {
  fs.closeSync(outputDescriptor)
  if (saveStatus !== 0 || gzipStatus !== 0) {
    fs.rmSync(output, { force: true })
    fail('导出离线镜像归档失败')
  }
  console.log(`Offline image archive: ${output}`)
})
