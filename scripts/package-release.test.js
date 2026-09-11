'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')

const { createReleasePlan, executeReleasePlan } = require('./package-release')

test('a supplied desktop image archive skips image rebuilding', () => {
  const archive = 'apps/local-engine/dist/images/box-local-engine-images-v0.1.1-linux-amd64.tar.gz'
  const plan = createReleasePlan('desktop', 'windows-amd64', archive, '0.1.1')

  assert.equal(plan.architecture, 'amd64')
  assert.equal(plan.archive, path.resolve(__dirname, '..', archive))
  assert.equal(plan.buildImages, false)

  const calls = []
  executeReleasePlan(
    'desktop',
    'windows-amd64',
    plan,
    (command, args) => calls.push([command, args]),
    () => true,
  )
  assert.deepEqual(calls, [
    [
      process.execPath,
      ['scripts/build-desktop-offline-installer.js', 'windows-amd64', plan.archive],
    ],
  ])
})

test('desktop packaging without an archive still builds the matching image archive', () => {
  const plan = createReleasePlan('desktop', 'macos-arm64', '', '0.1.1')

  assert.equal(plan.architecture, 'arm64')
  assert.equal(
    plan.archive,
    path.resolve(
      __dirname,
      '../apps/local-engine/dist/images/box-local-engine-images-v0.1.1-linux-arm64.tar.gz',
    ),
  )
  assert.equal(plan.buildImages, true)
})
