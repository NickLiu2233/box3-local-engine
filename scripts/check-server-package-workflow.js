'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const workflowPath = path.join(root, '.github/workflows/package-server.yml')
assert.ok(fs.existsSync(workflowPath), 'manual server package workflow is missing')

const workflow = fs.readFileSync(workflowPath, 'utf8')
assert.match(workflow, /workflow_dispatch:/)
assert.match(workflow, /architecture:/)
assert.match(workflow, /publish_stable:/)
assert.match(workflow, /Updating the stable CDN requires both amd64 and arm64 packages/)
assert.match(workflow, /box-local-engine-images-v\$\{\{ inputs\.version \}\}-linux-/)
assert.match(workflow, /docker load -i/)
assert.match(workflow, /node scripts\/build-headless-server-package\.js/)
assert.match(workflow, /node scripts\/verify-headless-server-package\.js/)
assert.match(workflow, /OSS_BUILD_PREFIX/)
assert.match(workflow, /OSS_SERVER_RELEASE_PREFIX/)
assert.match(workflow, /package_version="\$\(node -p "require\('\.\/package\.json'\)\.version"\)"/)
assert.doesNotMatch(workflow, /node -p \\"require/)
assert.match(workflow, /latest\.txt/)
assert.match(workflow, /pointer last/)
assert.doesNotMatch(workflow, /docker compose build/)

console.log('manual server package workflow check passed')
