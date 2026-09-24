'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const { createDevelopmentEnvironment } = require('./dev-environment')

const repoRoot = path.resolve(__dirname, '..')

test('source development uses the bundled local config without Nacos', () => {
  const env = createDevelopmentEnvironment({
    repoRoot,
    inheritedEnv: {},
    useInfrastructure: false,
  })

  assert.equal(
    env.BOX_LOCAL_CONFIG_PATH,
    path.join(repoRoot, 'apps/local-engine/config/local.config.json'),
  )
  assert.equal(env.NACOS_SERVER_ADDRESS, undefined)
})
