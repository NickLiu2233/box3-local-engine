'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('shared engine image builds script API types before schema and runtime assets', () => {
  const dockerfile = fs.readFileSync(
    path.join(__dirname, '../apps/local-engine/Dockerfile'),
    'utf8',
  )
  const stage = dockerfile.split('FROM source-base AS engine-build-base')[1].split(/^FROM /m)[0]
  const scriptApi = stage.indexOf(
    'RUN cd packages/script-api && node ../../common/scripts/install-run-rushx.js build',
  )
  const schema = stage.indexOf(
    'RUN cd internals/schema && node ../../common/scripts/install-run-rushx.js build',
  )
  const assets = stage.indexOf(
    'RUN cd apps/local-engine && node ../../common/scripts/install-run-rushx.js prepare-assets',
  )
  assert.ok(scriptApi >= 0, 'a clean image must generate script API declarations')
  assert.ok(
    scriptApi < schema && schema < assets,
    'build order must follow runtime asset dependencies',
  )
})
