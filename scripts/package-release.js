'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const outputDirectory = path.join(root, 'apps/local-engine/dist/images')

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) fail(`无法启动 ${command}：${result.error.message}`)
  if (result.status !== 0) fail(`${command} 执行失败，退出码 ${result.status ?? 'unknown'}`)
}

function architectureForDesktopTarget(target) {
  if (!/^(?:windows|macos|linux)-(?:amd64|arm64)$/.test(target)) return ''
  return target.endsWith('-arm64') ? 'arm64' : 'amd64'
}

function usage(kind) {
  if (kind === 'desktop') {
    return '用法: pnpm package:desktop <windows-amd64|windows-arm64|macos-amd64|macos-arm64|linux-amd64|linux-arm64>'
  }
  return '用法: pnpm package:web <amd64|arm64>'
}

function main() {
  const kind = process.argv[2]
  const target = process.argv[3]
  const architecture =
    kind === 'desktop' ? architectureForDesktopTarget(target || '') : target || ''
  if (
    !['desktop', 'web'].includes(kind) ||
    !architecture ||
    !['amd64', 'arm64'].includes(architecture)
  ) {
    fail(usage(kind))
  }

  // Build every offline service and export exactly one versioned archive before
  // invoking the platform-specific packager. package-offline-images derives
  // the image tag and archive name from the current root package version.
  run(process.execPath, [path.join('scripts', 'sync-root-version.js')])
  run(process.execPath, [path.join('scripts', 'package-offline-images.js'), architecture])

  const version = require(path.join(root, 'package.json')).version

  const archive = path.join(
    outputDirectory,
    `box-local-engine-images-v${version}-linux-${architecture}.tar.gz`,
  )
  if (!fs.statSync(archive, { throwIfNoEntry: false })?.isFile()) {
    fail(`镜像归档未生成：${archive}`)
  }

  if (kind === 'desktop') {
    run(process.execPath, [
      path.join('scripts', 'build-desktop-offline-installer.js'),
      target,
      archive,
    ])
  } else {
    run(process.execPath, [
      path.join('scripts', 'build-headless-server-package.js'),
      architecture,
      archive,
    ])
  }
}

if (require.main === module) main()
