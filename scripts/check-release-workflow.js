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

for (const target of ['windows-amd64', 'macos-arm64', 'linux-amd64']) {
  assert.match(workflow, new RegExp(`(?:targets|target).*${target}`))
}
for (const excludedTarget of ['windows-arm64', 'macos-amd64', 'linux-arm64']) {
  assert.doesNotMatch(workflow, new RegExp(`target: ${excludedTarget}`))
}

assert.match(workflow, /for service in player-service player-auth-portal creator play voxa/)
assert.match(workflow, /architecture: amd64\s+runner: ubuntu-latest/)
assert.match(workflow, /architecture: arm64\s+runner: ubuntu-24\.04-arm/)
assert.doesNotMatch(workflow, /docker\/setup-qemu-action/)
assert.match(
  workflow,
  /box-local-engine-images-\$\{\{ github\.ref_name \}\}-linux-\$\{\{ matrix\.architecture \}\}\.tar\.gz/,
)
assert.match(workflow, /docker builder prune --all --force/)
assert.match(workflow, /test -f "\$archive"/)
assert.doesNotMatch(workflow, /pnpm\/action-setup/)
assert.match(workflow, /node-version-file: \.node-version/)
assert.match(workflow, /corepack enable/)
assert.match(workflow, /pnpm --version/)
assert.match(installerBuilder, /const archiveImageTags = \[\.\.\.new Set\(imageDetails\.map/)
assert.match(installerBuilder, /const imageTag = archiveImageTags\.length === 1/)
assert.match(workflow, /pattern: images-\*/)
assert.match(workflow, /files:\s*\|\s*\*\.zip\s*\*\.tar\.gz/)

console.log('release workflow image-tag contract check passed')
