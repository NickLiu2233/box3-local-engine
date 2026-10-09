'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('shared engine image builds application dependencies before runtime assets', () => {
  const dockerfile = fs.readFileSync(
    path.join(__dirname, '../apps/local-engine/Dockerfile'),
    'utf8',
  )
  const stage = dockerfile.split('FROM source-base AS engine-build-base')[1].split(/^FROM /m)[0]
  const build = stage.indexOf('RUN node common/scripts/install-run-rush.js rebuild')
  const assets = stage.indexOf(
    'RUN cd apps/local-engine && node ../../common/scripts/install-run-rushx.js prepare-assets',
  )
  assert.ok(build >= 0 && build < assets, 'build all prerequisites before runtime assets')
  for (const name of ['game', 'player-admin', 'game-server', 'local-engine']) {
    assert.ok(stage.includes(`--to-except @box/${name}`), `prepare dependencies for ${name}`)
  }
  assert.match(stage, /--parallelism 2/)
})

test('player service compiler has a bounded configurable cold-build heap', () => {
  const dockerfile = fs.readFileSync(
    path.join(__dirname, '../apps/local-engine/Dockerfile'),
    'utf8',
  )
  const stage = dockerfile
    .split('FROM engine-build-base AS player-service-build')[1]
    .split(/^FROM /m)[0]
  assert.match(stage, /ARG BOX_PLAYER_SERVICE_BUILD_HEAP_MB=4096/)
  assert.match(stage, /NODE_OPTIONS="--max-old-space-size=\$\{BOX_PLAYER_SERVICE_BUILD_HEAP_MB\}"/)
})
