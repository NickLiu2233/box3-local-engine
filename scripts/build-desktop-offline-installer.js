'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const repoRoot = path.resolve(__dirname, '..')
const managerRoot = path.join(repoRoot, 'apps/deployment-manager')
const outputRoot = path.join(repoRoot, 'apps/local-engine/dist/desktop-installers')
const supported = new Map([
  [
    'windows-amd64',
    { os: 'win32', arch: 'x64', bundle: false, executable: 'box-local-engine-manager.exe' },
  ],
  [
    'windows-arm64',
    { os: 'win32', arch: 'arm64', bundle: false, executable: 'box-local-engine-manager.exe' },
  ],
  ['macos-amd64', { os: 'darwin', arch: 'x64', bundle: 'app', executable: 'BOX3 Engine.app' }],
  [
    'macos-arm64',
    { os: 'darwin', arch: 'arm64', bundle: 'app', executable: 'BOX3 Engine.app' },
  ],
])

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

function walk(directory) {
  const result = []
  if (!fs.existsSync(directory)) return result
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...walk(absolute))
    else if (entry.isFile()) result.push(absolute)
  }
  return result
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true, force: true })
}

function createZip(packageRoot, destination) {
  fs.rmSync(destination, { force: true })
  const parent = path.dirname(packageRoot)
  const name = path.basename(packageRoot)
  const command = process.platform === 'win32' ? 'powershell' : '/usr/bin/ditto'
  const args =
    process.platform === 'win32'
      ? [
          '-NoProfile',
          '-Command',
          `Compress-Archive -LiteralPath '${packageRoot.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`,
        ]
      : ['-c', '-k', '--norsrc', '--keepParent', name, destination]
  const result = spawnSync(command, args, {
    cwd: parent,
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    stdio: 'inherit',
  })
  if (result.status !== 0) fail(`ZIP 打包失败，退出码 ${result.status}`)
}

function main() {
  const platform = process.argv[2]
  const archive = process.argv[3] ? path.resolve(process.argv[3]) : ''
  const spec = supported.get(platform)
  if (!spec) {
    fail(
      `用法: pnpm build:desktop-installer <${[...supported.keys()].join('|')}> <镜像归档.tar.gz>`,
    )
  }
  if (process.platform !== spec.os || process.arch !== spec.arch) {
    fail(`${platform} 原生安装器必须在对应的 ${spec.os}/${spec.arch} 构建机上生成`)
  }
  if (!archive || !fs.statSync(archive, { throwIfNoEntry: false })?.isFile()) {
    fail('离线镜像归档不存在')
  }
  const expectedArchitecture = platform.endsWith('arm64') ? 'arm64' : 'amd64'
  if (!path.basename(archive).includes(expectedArchitecture)) {
    fail(`镜像归档名称与目标架构 ${expectedArchitecture} 不一致`)
  }

  const imageTagMatch = path
    .basename(archive)
    .match(/^box-local-engine-images-(.+)-(?:windows|macos|linux)-(?:amd64|arm64)\.tar(?:\.gz)?$/)
  const imageTag = imageTagMatch
    ? `${imageTagMatch[1]}-windows-${expectedArchitecture}`
    : process.env.BOX_IMAGE_TAG
  if (!imageTag) fail('无法从归档名称确定 BOX_IMAGE_TAG，请设置环境变量 BOX_IMAGE_TAG')

  const payloadArchive = path.join(managerRoot, 'src-tauri/payload', path.basename(archive))
  // A macOS app is often moved into /Applications after download. Embed its
  // image archive as an application resource so that move cannot break first
  // launch. Windows keeps the archive beside the .exe to avoid making the
  // executable itself hundreds of megabytes larger.
  if (spec.bundle) fs.copyFileSync(archive, payloadArchive)
  try {
    const tauriArgs = ['--filter', '@box-local/deployment-manager', 'tauri', 'build']
    if (spec.bundle) tauriArgs.push('--bundles', spec.bundle)
    else tauriArgs.push('--no-bundle')
    const result = spawnSync('pnpm', tauriArgs, {
      cwd: repoRoot,
      env: { ...process.env, BOX_MANAGER_IMAGE_TAG: imageTag },
      stdio: 'inherit',
    })
    if (result.status !== 0) fail(`Tauri 构建失败，退出码 ${result.status}`)
  } finally {
    if (spec.bundle) fs.rmSync(payloadArchive, { force: true })
  }

  const targetRoot = path.join(managerRoot, 'src-tauri/target/release')
  const executableSource = spec.bundle
    ? path.join(targetRoot, 'bundle/macos', spec.executable)
    : path.join(targetRoot, spec.executable)
  if (!fs.statSync(executableSource, { throwIfNoEntry: false })) {
    fail(`未找到原生程序产物：${executableSource}`)
  }

  fs.mkdirSync(outputRoot, { recursive: true })
  const version = require(path.join(managerRoot, 'package.json')).version
  const packageName = `BOX-Local-Engine-${version}-${platform}`
  const packageRoot = path.join(outputRoot, packageName)
  fs.rmSync(packageRoot, { recursive: true, force: true })
  fs.mkdirSync(packageRoot, { recursive: true })
  const executableDestination = path.join(packageRoot, spec.executable)
  if (spec.bundle) copyDirectory(executableSource, executableDestination)
  else fs.copyFileSync(executableSource, executableDestination)
  if (!spec.bundle) fs.copyFileSync(archive, path.join(packageRoot, path.basename(archive)))
  for (const name of ['BUILD-INFO.json', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.json']) {
    const source = path.join(path.dirname(archive), name)
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(packageRoot, name))
  }
  fs.writeFileSync(
    path.join(packageRoot, '开始使用.txt'),
    `BOX3 Engine ${version}\n\n准备：\n- 已安装并启动 Docker。\n- PostgreSQL 和 Redis 均为选填，本程序不会安装或启动数据库。\n\n1. 双击 ${spec.executable}。\n2. 按需填写远程 PostgreSQL 和 Redis。\n3. 点击“保存配置”，程序不会自动启动容器。\n4. 回到“总览”，选择启动全部服务、创作端或游玩端。\n\nmacOS 版本已将离线镜像内置于 APP，可直接移动 APP。Windows 版本请保持 EXE 与镜像归档在同一目录。\n\n未配置 PostgreSQL 时，地图数据存储 API、玩家管理和登录门户不启用；未配置 Redis 时不启用 Redis 缓存。\n`,
  )
  const checksums = walk(packageRoot).map(
    (file) => `${sha256(file)}  ${path.relative(packageRoot, file).split(path.sep).join('/')}`,
  )
  fs.writeFileSync(path.join(packageRoot, 'SHA256SUMS'), `${checksums.join('\n')}\n`)
  const zip = path.join(outputRoot, `${packageName}.zip`)
  createZip(packageRoot, zip)
  console.log(`Offline package: ${zip}`)
  console.log(`SHA-256:        ${sha256(zip)}`)
}

main()
