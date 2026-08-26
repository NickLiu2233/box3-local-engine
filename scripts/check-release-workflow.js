'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const workflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8')

for (const target of [
  'windows-amd64',
  'windows-arm64',
  'macos-amd64',
  'macos-arm64',
  'linux-amd64',
  'linux-arm64',
]) {
  assert.match(workflow, new RegExp(`(?:targets|target).*${target}`))
}

assert.match(workflow, /docker image tag "box-local-engine-\$\{service\}:\$\{BOX_IMAGE_TAG\}"/)
assert.match(workflow, /box-local-engine-images-\$\{target_tag\}\.tar\.gz/)
assert.match(
  workflow,
  /box-local-engine-images-\$\{\{ github\.ref_name \}\}-\$\{\{ matrix\.target \}\}\.tar\.gz/,
)
assert.match(workflow, /test -f "\$archive"/)
assert.doesNotMatch(workflow, /pnpm\/action-setup/)
assert.match(workflow, /node-version-file: \.node-version/)
assert.match(workflow, /corepack enable/)
assert.match(workflow, /pnpm --version/)

console.log('release workflow image-tag contract check passed')
