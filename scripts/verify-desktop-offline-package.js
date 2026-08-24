'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

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

function fail(message) {
  throw new Error(`桌面离线包校验失败：${message}`)
}

function findApplication(packageRoot) {
  return fs
    .readdirSync(packageRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.endsWith('.app'))
}

function findMetadataRoot(packageRoot) {
  if (fs.existsSync(path.join(packageRoot, 'BUILD-INFO.json'))) return packageRoot
  const application = findApplication(packageRoot)
  if (!application) fail('未找到 Windows 发布信息或 macOS APP')
  return path.join(packageRoot, application.name, 'Contents/Resources/metadata')
}

function verifyChecksums(metadataRoot) {
  const contents = fs.readFileSync(path.join(metadataRoot, 'SHA256SUMS'), 'utf8').trim()
  if (!contents) fail('SHA256SUMS 为空')
  for (const line of contents.split('\n')) {
    const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/)
    if (!match) fail(`无效的 SHA256SUMS 行：${line}`)
    const relative = match[2]
    const target = path.resolve(metadataRoot, relative)
    if (
      !target.startsWith(`${path.resolve(metadataRoot)}${path.sep}`) ||
      !fs.statSync(target).isFile()
    ) {
      fail(`校验文件不存在或越出包目录：${relative}`)
    }
    if (sha256(target) !== match[1]) fail(`SHA-256 不匹配：${relative}`)
  }
}

function findImageManifest(packageRoot) {
  const rootManifest = path.join(packageRoot, 'BOX-OFFLINE-IMAGE.json')
  if (fs.existsSync(rootManifest)) return rootManifest
  const application = findApplication(packageRoot)
  if (!application) fail('未找到 Windows 镜像清单或 macOS APP')
  return path.join(
    packageRoot,
    application.name,
    'Contents/Resources/payload/BOX-OFFLINE-IMAGE.json',
  )
}

function verifyMacSignature(packageRoot) {
  const application = findApplication(packageRoot)
  if (!application || process.env.BOX_DESKTOP_REQUIRE_SIGNING !== 'true') return
  const target = path.join(packageRoot, application.name)
  const result = spawnSync('codesign', ['-dv', '--verbose=4', target], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const details = `${result.stdout || ''}\n${result.stderr || ''}`
  if (result.status !== 0 || /Signature=adhoc|TeamIdentifier=not set/.test(details)) {
    fail('macOS APP 未使用 Developer ID 签名；正式发布请完成签名与公证')
  }
}

function verifyPackage(packageRoot) {
  packageRoot = path.resolve(packageRoot)
  if (!fs.statSync(packageRoot, { throwIfNoEntry: false })?.isDirectory()) {
    fail(`目录不存在：${packageRoot}`)
  }
  const metadataRoot = findMetadataRoot(packageRoot)
  for (const name of ['BUILD-INFO.json', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.json', 'SHA256SUMS']) {
    if (!fs.statSync(path.join(metadataRoot, name), { throwIfNoEntry: false })?.isFile()) {
      fail(`缺少 ${name}`)
    }
  }
  const info = JSON.parse(fs.readFileSync(path.join(metadataRoot, 'BUILD-INFO.json'), 'utf8'))
  if (
    !info.version ||
    !info.sourceRevision ||
    !info.buildCreatedAt ||
    (info.source === 'local-dirty' && process.env.BOX_ALLOW_DIRTY_RELEASE !== 'true')
  ) {
    fail('BUILD-INFO.json 缺少正式构建版本、提交号或构建时间')
  }
  const manifestPath = findImageManifest(packageRoot)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (
    manifest.formatVersion !== 1 ||
    !/^[a-f0-9]{64}$/i.test(manifest.sha256 || '') ||
    !manifest.imageTag ||
    !/^linux\/(amd64|arm64)$/.test(manifest.platform || '')
  ) {
    fail('BOX-OFFLINE-IMAGE.json 格式无效')
  }
  const imageArchive = path.join(path.dirname(manifestPath), manifest.archive || '')
  if (!fs.statSync(imageArchive, { throwIfNoEntry: false })?.isFile()) {
    fail('镜像清单引用的归档不存在')
  }
  if (sha256(imageArchive) !== manifest.sha256.toLowerCase()) fail('镜像归档 SHA-256 不匹配')
  verifyChecksums(metadataRoot)
  verifyMacSignature(packageRoot)
  return { imageArchive, manifest }
}

if (require.main === module) {
  try {
    const packageRoot = process.argv[2]
    assert.ok(packageRoot, '用法: node scripts/verify-desktop-offline-package.js <离线包目录>')
    const result = verifyPackage(packageRoot)
    console.log(`Desktop offline package verified: ${result.manifest.imageTag}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { verifyPackage }
