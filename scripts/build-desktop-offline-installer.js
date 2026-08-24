'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { generateDistributionMetadata } = require('../apps/local-engine/src/distribution-metadata')

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
  ['macos-arm64', { os: 'darwin', arch: 'arm64', bundle: 'app', executable: 'BOX3 Engine.app' }],
  [
    'linux-amd64',
    { os: 'linux', arch: 'x64', bundle: false, executable: 'box-local-engine-manager' },
  ],
  [
    'linux-arm64',
    { os: 'linux', arch: 'arm64', bundle: false, executable: 'box-local-engine-manager' },
  ],
])

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function gitOutput(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return result.status === 0 ? result.stdout.trim() : ''
}

function prepareReleaseMetadata() {
  const dirty = gitOutput(['status', '--porcelain'])
  if (dirty && process.env.BOX_ALLOW_DIRTY_RELEASE !== 'true') {
    fail(
      '工作区存在未提交修改。请提交后再构建正式离线包；仅测试时可设置 BOX_ALLOW_DIRTY_RELEASE=true。',
    )
  }
  if (dirty) console.warn('WARNING: 正在构建带未提交修改的测试包，禁止用于公开发布。')
  process.env.BOX_BUILD_COMMIT ||= gitOutput(['rev-parse', 'HEAD']) || 'unknown'
  process.env.BOX_BUILD_DATE ||= new Date().toISOString()
  process.env.BOX_BUILD_SOURCE ||= dirty ? 'local-dirty' : 'release'
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

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true, force: true })
}

function createZip(packageRoot, destination) {
  fs.rmSync(destination, { force: true })
  const parent = path.dirname(packageRoot)
  const name = path.basename(packageRoot)
  const command =
    process.platform === 'win32'
      ? 'powershell'
      : process.platform === 'darwin'
        ? '/usr/bin/ditto'
        : 'zip'
  const args =
    process.platform === 'win32'
      ? [
          '-NoProfile',
          '-Command',
          `Compress-Archive -LiteralPath '${packageRoot.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`,
        ]
      : process.platform === 'darwin'
        ? ['-c', '-k', '--norsrc', '--keepParent', name, destination]
        : ['-rq', destination, name]
  const result = spawnSync(command, args, {
    cwd: parent,
    env: { ...process.env, COPYFILE_DISABLE: '1' },
    stdio: 'inherit',
  })
  if (result.status !== 0) fail(`ZIP 打包失败，退出码 ${result.status}`)
}

function main() {
  prepareReleaseMetadata()
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
    ? `${imageTagMatch[1]}-${platform.split('-')[0]}-${expectedArchitecture}`
    : process.env.BOX_IMAGE_TAG
  if (!imageTag) fail('无法从归档名称确定 BOX_IMAGE_TAG，请设置环境变量 BOX_IMAGE_TAG')

  const payloadArchive = path.join(managerRoot, 'src-tauri/payload', path.basename(archive))
  const imageManifest = {
    formatVersion: 1,
    archive: path.basename(archive),
    sha256: sha256(archive),
    imageTag,
    platform: `linux/${expectedArchitecture}`,
  }
  const payloadManifest = path.join(managerRoot, 'src-tauri/payload/BOX-OFFLINE-IMAGE.json')
  // A macOS app is often moved into /Applications after download. Embed its
  // image archive as an application resource so that move cannot break first
  // launch. Windows keeps the archive beside the .exe to avoid making the
  // executable itself hundreds of megabytes larger.
  if (spec.bundle) {
    fs.copyFileSync(archive, payloadArchive)
    fs.writeFileSync(payloadManifest, `${JSON.stringify(imageManifest, null, 2)}\n`)
  }
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
    if (spec.bundle) {
      fs.rmSync(payloadArchive, { force: true })
      fs.rmSync(payloadManifest, { force: true })
    }
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
  if (!spec.bundle) {
    fs.copyFileSync(archive, path.join(packageRoot, path.basename(archive)))
    fs.writeFileSync(
      path.join(packageRoot, 'BOX-OFFLINE-IMAGE.json'),
      `${JSON.stringify(imageManifest, null, 2)}\n`,
    )
  }
  // Keep the macOS download folder intentionally simple: users only see the
  // APP. Release metadata remains inside its Resources directory for support
  // and legal review, while Windows keeps it beside the EXE and image archive.
  const metadataRoot = spec.bundle
    ? path.join(executableDestination, 'Contents/Resources/metadata')
    : packageRoot
  fs.mkdirSync(metadataRoot, { recursive: true })
  generateDistributionMetadata(metadataRoot, {
    repoRoot,
    generatedAt: new Date().toISOString(),
    release: `desktop-${platform}`,
    platform: `${spec.os}/${spec.arch}`,
    images: [`${path.basename(archive)} (${imageTag})`],
  })
  const verification = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts/verify-desktop-offline-package.js'), packageRoot],
    { cwd: repoRoot, env: process.env, stdio: 'inherit' },
  )
  if (verification.status !== 0) fail(`桌面离线包校验失败，退出码 ${verification.status}`)
  const zip = path.join(outputRoot, `${packageName}.zip`)
  // Finder can create this hidden view-state file whenever the output folder
  // is opened. It is not part of the release and must not leak into the ZIP.
  fs.rmSync(path.join(packageRoot, '.DS_Store'), { force: true })
  createZip(packageRoot, zip)
  console.log(`Offline package: ${zip}`)
  console.log(`SHA-256:        ${sha256(zip)}`)
}

main()
