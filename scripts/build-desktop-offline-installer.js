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

function macApplicationHasResourceSeal(application) {
  return fs.existsSync(path.join(application, 'Contents', '_CodeSignature', 'CodeResources'))
}

function ensureMacApplicationSignature(application) {
  if (process.platform !== 'darwin' || macApplicationHasResourceSeal(application)) return
  // Tauri's unsigned CI bundle contains a linker ad-hoc signature on the
  // executable but no outer app resource seal. Gatekeeper reports that shape
  // as a damaged application once the offline payload is embedded. Sign the
  // finished bundle ad-hoc to seal every resource. A Developer ID-signed app
  // already has CodeResources, so this never replaces a release signature.
  const result = spawnSync('codesign', ['--force', '--deep', '--sign', '-', application], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim()
    fail(`无法为 macOS APP 写入资源签名${detail ? `：${detail}` : ''}`)
  }
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

function archiveEntry(archive, entry, run = spawnSync, platform = process.platform) {
  // Windows ships bsdtar, which does not consistently infer gzip compression
  // when extracting one entry. Explicit gzip extraction works with both
  // bsdtar and GNU tar, including the Windows desktop release runners.
  const tarArguments = [
    ...(platform === 'win32' ? ['--force-local'] : []),
    '-xzf',
    archive,
    '-O',
    entry,
  ]
  const result = run('tar', tarArguments, {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || '').trim()
    throw new Error(`无法从离线镜像归档读取 ${entry}${detail ? `：${detail}` : ''}`)
  }
  return result.stdout
}

function imageDetailsFromArchive(archive) {
  const manifest = JSON.parse(archiveEntry(archive, 'manifest.json'))
  return manifest.flatMap((entry) => {
    const image = entry.RepoTags?.[0]
    const configPath = entry.Config
    if (!image || !configPath) return []
    const config = JSON.parse(archiveEntry(archive, configPath))
    const separator = image.lastIndexOf(':')
    const imageName = separator > 0 ? image.slice(0, separator) : image
    const tag = separator > 0 ? image.slice(separator + 1) : 'unknown'
    const labels = config.config?.Labels || {}
    const configDigest = configPath.split('/').at(-1) || ''
    return [
      {
        image: imageName,
        tag,
        imageId: configDigest ? `sha256:${configDigest}` : 'unknown',
        createdAt: config.created || 'unknown',
        platform:
          config.os && config.architecture ? `${config.os}/${config.architecture}` : 'unknown',
        sourceRevision: labels['org.opencontainers.image.revision'] || 'unknown',
        buildSource: labels['org.opencontainers.image.source'] || 'unknown',
      },
    ]
  })
}

function tauriBuildCommand(platform = process.platform) {
  return platform === 'win32'
    ? { command: 'pnpm.cmd', shell: true }
    : { command: 'pnpm', shell: false }
}

function tauriBuildFailure(result) {
  if (result.error) {
    const code = result.error.code ? `${result.error.code}: ` : ''
    return `无法启动 Tauri 构建命令：${code}${result.error.message}`
  }
  if (result.signal) return `Tauri 构建被系统信号终止：${result.signal}`
  return `Tauri 构建失败，退出码 ${result.status}`
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

  // The Docker tag belongs to the image archive, not to the native desktop
  // executable. A linux/arm64 archive can be embedded by Windows on ARM,
  // macOS on Apple Silicon and Linux ARM64 installers without duplicating the
  // same five images under three different tags.
  const imageDetails = imageDetailsFromArchive(archive)
  const archiveImageTags = [...new Set(imageDetails.map(({ tag }) => tag).filter(Boolean))]
  const imageTag = archiveImageTags.length === 1 ? archiveImageTags[0] : process.env.BOX_IMAGE_TAG
  if (!imageTag) {
    fail('镜像归档包含多个标签，请使用只含一个版本的五服务归档或设置 BOX_IMAGE_TAG')
  }

  const payloadArchive = path.join(managerRoot, 'src-tauri/payload', path.basename(archive))
  const imageManifest = {
    formatVersion: 1,
    archive: path.basename(archive),
    sha256: sha256(archive),
    imageTag,
    platform: `linux/${expectedArchitecture}`,
  }
  const payloadManifest = path.join(managerRoot, 'src-tauri/payload/BOX-OFFLINE-IMAGE.json')
  const payloadImageInfo = path.join(managerRoot, 'src-tauri/payload/IMAGE-INFO.json')
  const payloadMetadata = path.join(managerRoot, 'src-tauri/payload/metadata')
  const originalImageInfo = fs.readFileSync(payloadImageInfo, 'utf8')
  const imageInfo = {
    formatVersion: 1,
    images: imageDetails,
  }
  // A macOS app is often moved into /Applications after download. Embed its
  // image archive as an application resource so that move cannot break first
  // launch. Windows keeps the archive beside the .exe to avoid making the
  // executable itself hundreds of megabytes larger.
  if (spec.bundle) {
    fs.copyFileSync(archive, payloadArchive)
    fs.writeFileSync(payloadManifest, `${JSON.stringify(imageManifest, null, 2)}\n`)
    // Tauri signs the complete .app bundle. Metadata must become a resource
    // before that step; writing it into Contents/Resources afterwards makes
    // macOS report the application as damaged.
    fs.rmSync(payloadMetadata, { recursive: true, force: true })
    fs.mkdirSync(payloadMetadata, { recursive: true })
    generateDistributionMetadata(payloadMetadata, {
      repoRoot,
      generatedAt: new Date().toISOString(),
      release: `desktop-${platform}`,
      platform: `${spec.os}/${spec.arch}`,
      images: [`${path.basename(archive)} (${imageTag})`],
    })
  }
  fs.writeFileSync(payloadImageInfo, `${JSON.stringify(imageInfo, null, 2)}\n`)
  try {
    const tauriArgs = ['--filter', '@box-local/deployment-manager', 'tauri', 'build']
    if (spec.bundle) tauriArgs.push('--bundles', spec.bundle)
    else tauriArgs.push('--no-bundle')
    const invocation = tauriBuildCommand()
    const result = spawnSync(invocation.command, tauriArgs, {
      cwd: repoRoot,
      env: { ...process.env, BOX_MANAGER_IMAGE_TAG: imageTag },
      shell: invocation.shell,
      stdio: 'inherit',
    })
    if (result.error || result.status !== 0) fail(tauriBuildFailure(result))
  } finally {
    fs.writeFileSync(payloadImageInfo, originalImageInfo)
    if (spec.bundle) {
      fs.rmSync(payloadArchive, { force: true })
      fs.rmSync(payloadManifest, { force: true })
      fs.rmSync(payloadMetadata, { recursive: true, force: true })
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
  if (spec.bundle) ensureMacApplicationSignature(executableDestination)
  if (!spec.bundle) {
    fs.copyFileSync(archive, path.join(packageRoot, path.basename(archive)))
    fs.writeFileSync(
      path.join(packageRoot, 'BOX-OFFLINE-IMAGE.json'),
      `${JSON.stringify(imageManifest, null, 2)}\n`,
    )
  }
  // Keep the macOS download folder intentionally simple: users only see the
  // APP. Its metadata was embedded before signing; Windows keeps metadata
  // beside the EXE and image archive.
  const metadataRoot = spec.bundle
    ? path.join(executableDestination, 'Contents/Resources/payload/metadata')
    : packageRoot
  if (!spec.bundle) {
    fs.mkdirSync(metadataRoot, { recursive: true })
    generateDistributionMetadata(metadataRoot, {
      repoRoot,
      generatedAt: new Date().toISOString(),
      release: `desktop-${platform}`,
      platform: `${spec.os}/${spec.arch}`,
      images: [`${path.basename(archive)} (${imageTag})`],
    })
  }
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

if (require.main === module) main()

module.exports = {
  archiveEntry,
  imageDetailsFromArchive,
  tauriBuildCommand,
  tauriBuildFailure,
  macApplicationHasResourceSeal,
  ensureMacApplicationSignature,
}
