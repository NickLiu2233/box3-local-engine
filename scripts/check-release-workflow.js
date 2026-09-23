'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const workflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8')
const installerBuilder = fs.readFileSync(
  path.join(root, 'scripts/build-desktop-offline-installer.js'),
  'utf8',
)
const serverPackageBuilder = fs.readFileSync(
  path.join(root, 'scripts/build-headless-server-package.js'),
  'utf8',
)
const headlessVerifier = fs.readFileSync(
  path.join(root, 'scripts/verify-headless-server-package.js'),
  'utf8',
)
const { headlessCompose } = require('./build-headless-server-package')

for (const target of [
  'windows-amd64',
  'windows-arm64',
  'macos-arm64',
  'linux-amd64',
  'linux-arm64',
]) {
  assert.match(workflow, new RegExp(`(?:targets|target).*${target}`))
}
assert.doesNotMatch(workflow, /target:\s*macos-amd64/)

assert.match(
  workflow,
  /for service in player-service player-auth-portal server-manager creator play voxa/,
)
assert.match(workflow, /architecture: amd64\s+runner: ubuntu-latest/)
assert.match(workflow, /architecture: arm64\s+runner: ubuntu-24\.04-arm/)
assert.doesNotMatch(workflow, /^\s{2}verify:/m)
assert.doesNotMatch(workflow, /needs: verify/)
assert.doesNotMatch(workflow, /docker\/setup-qemu-action/)
assert.match(
  workflow,
  /box-local-engine-images-\$\{\{ github\.ref_name \}\}-linux-\$\{\{ matrix\.architecture \}\}\.tar\.gz/,
)
assert.match(workflow, /docker builder prune --all --force/)
assert.match(workflow, /export BOX_BUILD_VERSION="\$\{\{ github\.ref_name \}\}"/)
assert.match(workflow, /export BOX_BUILD_COMMIT="\$\{\{ github\.sha \}\}"/)
assert.match(
  workflow,
  /export BOX_BUILD_DATE="\$\(TZ=Asia\/Shanghai date \+'%Y-%m-%dT%H:%M:%S%:z'\)"/,
)
assert.match(workflow, /export BOX_BUILD_SOURCE="github-actions"/)
assert.match(workflow, /test -f "\$archive"/)
assert.doesNotMatch(workflow, /pnpm\/action-setup/)
assert.match(workflow, /node-version-file: \.node-version/)
assert.match(workflow, /corepack enable/)
assert.match(workflow, /pnpm --version/)
assert.match(installerBuilder, /const archiveImageTags = \[\.\.\.new Set\(imageDetails\.map/)
assert.match(installerBuilder, /const imageTag = archiveImageTags\.length === 1/)
assert.match(workflow, /headless-server:\s+needs: images/)
assert.match(workflow, /node scripts\/build-headless-server-package\.js/)
assert.match(workflow, /needs: \[desktop, headless-server\]/)
assert.match(
  workflow,
  /files:\s*\|[\s\S]*release-files\/BOX-Local-Engine-\*\.zip[\s\S]*release-files\/BOX3-Engine-Server-\*\.zip/,
)
assert.doesNotMatch(workflow, /files:\s*\|[\s\S]*release-files\/\*\.tar\.gz/)
assert.match(serverPackageBuilder, /BOX3-Engine-Server-/)
assert.match(serverPackageBuilder, /function headlessCompose/)
assert.match(serverPackageBuilder, /player-auth-portal:/)
assert.match(serverPackageBuilder, /server-manager:/)
assert.match(serverPackageBuilder, /play-storage-init:/)
assert.match(serverPackageBuilder, /templateRoot, '\.env\.example'/)
assert.match(serverPackageBuilder, /BOX3-OFFLINE-IMAGE\.json/)
assert.match(headlessVerifier, /archiveSha256/)
assert.match(headlessVerifier, /Docker archive missing/)
assert.match(workflow, /verify-headless-server-package\.js/)
assert.match(workflow, /box3-engine-play-server-images-/)
assert.match(workflow, /box-local-engine-player-service:/)
assert.match(workflow, /box-local-engine-player-auth-portal:/)
assert.match(workflow, /box-local-engine-play:/)
assert.match(workflow, /box-local-engine-server-manager:/)
assert.match(workflow, /box-local-engine-creator:/)
assert.match(workflow, /box-local-engine-voxa:/)

const headlessComposeSource = headlessCompose()
for (const requiredService of [
  'managed-postgres',
  'managed-redis',
  'player-service',
  'player-auth-portal',
  'server-manager',
  'creator',
  'creator-storage-init',
  'play-storage-init',
  'play',
  'voxa',
  'voxa-storage-init',
]) {
  assert.match(headlessComposeSource, new RegExp(`^  ${requiredService}:`, 'm'))
}
for (const forbiddenService of ['postgres', 'redis', 'migrator']) {
  assert.doesNotMatch(headlessComposeSource, new RegExp(`^  ${forbiddenService}:`, 'm'))
}
assert.match(headlessComposeSource, /BOX_CREATOR_PUBLIC_URL/)
assert.match(headlessComposeSource, /AUTH_DEMO_CREATOR_URL/)
assert.match(headlessComposeSource, /^ {2}box-managed-postgres-data:\s*$/m)
assert.match(headlessComposeSource, /^ {2}box-managed-redis-data:\s*$/m)
assert.match(headlessComposeSource, /^ {2}box-play-runtime-cache:\s*$/m)
assert.doesNotMatch(headlessComposeSource, /box-play-storage/)

// Build outputs are exchanged through Aliyun OSS rather than GitHub Actions
// artifacts. Keep this contract in sync with release.yml so the workflow check
// catches accidental regressions to the quota-limited artifact service.
for (const step of [
  'Upload images to Aliyun OSS',
  'Download images from Aliyun OSS',
  'Upload desktop installer to Aliyun OSS',
  'Upload server package to Aliyun OSS',
  'Download release files from Aliyun OSS',
]) {
  assert.match(workflow, new RegExp(step))
}
assert.match(workflow, /ossutil\s+config/)
assert.match(workflow, /OSS_BUCKET:\s*\$\{\{\s*secrets\.ALIYUN_OSS_BUCKET\s*\}\}/)
assert.match(workflow, /OSS_ENDPOINT:\s*\$\{\{\s*secrets\.ALIYUN_OSS_ENDPOINT\s*\}\}/)
assert.match(workflow, /OSS_ACCESS_KEY_ID:\s*\$\{\{\s*secrets\.ALIYUN_OSS_ACCESS_KEY_ID\s*\}\}/)
assert.match(
  workflow,
  /OSS_ACCESS_KEY_SECRET:\s*\$\{\{\s*secrets\.ALIYUN_OSS_ACCESS_KEY_SECRET\s*\}\}/,
)
assert.match(
  workflow,
  /OSS_PREFIX: box-local-engine\/\$\{\{ github\.ref_name \}\}\/e407586a7d349bd29f83c134b758d6797c4466cb/,
)
assert.doesNotMatch(workflow, /OSS_PREFIX:.*github\.sha/)
assert.doesNotMatch(workflow, /actions\/(?:upload|download)-artifact@/)
assert.doesNotMatch(workflow, /(?:access[_-]?key[_-]?id|access[_-]?key[_-]?secret)\s*:\s*['"][^$]/i)
assert.match(workflow, /release-files\/BOX-Local-Engine-\*\.zip/)
assert.match(workflow, /release-files\/BOX3-Engine-Server-\*\.zip/)
assert.match(workflow, /distribution\/server\/bootstrap\.sh release-files\/install\.sh/)
assert.match(workflow, /release-files\/install\.sh/)
assert.match(workflow, /oss:\/\/\$OSS_BUCKET\/local-engine\/install\.sh/)
assert.match(workflow, /oss:\/\/\$OSS_BUCKET\/local-engine\/latest\.txt/)
assert.match(workflow, /Publish latest\.txt last/)
assert.doesNotMatch(workflow, /release-files\/\*\.tar\.gz/)
for (const requiredTemplateFile of [
  'README.md',
  'install.sh',
  'status.sh',
  'logs.sh',
  'stop.sh',
  'verify.sh',
]) {
  assert.ok(
    fs.existsSync(path.join(root, 'distribution/server', requiredTemplateFile)),
    `missing headless server template file: ${requiredTemplateFile}`,
  )
}

const bootstrapInstaller = fs.readFileSync(
  path.join(root, 'distribution/server/bootstrap.sh'),
  'utf8',
)
assert.match(bootstrapInstaller, /uname -m/)
assert.match(bootstrapInstaller, /releases\/latest/)
assert.match(bootstrapInstaller, /BOX3_RELEASE_CDN_URL/)
assert.match(bootstrapInstaller, /https:\/\/assets\.box3\.fun\/local-engine/)
assert.match(bootstrapInstaller, /latest\.txt/)
assert.match(bootstrapInstaller, /CDN 发行包不可用，回退到 GitHub Releases/)
assert.match(bootstrapInstaller, /BOX3-Engine-Server-\$version-linux-\$architecture/)
assert.match(bootstrapInstaller, /get\.docker\.com/)
assert.match(bootstrapInstaller, /distribution_id.*alinux/)
assert.match(bootstrapInstaller, /alinux3-plus/)
assert.match(bootstrapInstaller, /mirrors\.aliyun\.com\/docker-ce/)
assert.match(bootstrapInstaller, /docker-compose-plugin/)
assert.match(bootstrapInstaller, /"\$package_directory\/verify\.sh"/)
assert.match(bootstrapInstaller, /\.\/install\.sh/)
assert.doesNotMatch(bootstrapInstaller, /rm -rf "?\/opt/)

console.log('release workflow image-tag contract check passed')
