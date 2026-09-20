const test = require('node:test')
const assert = require('node:assert/strict')

const { playerServiceRoutes } = require('./prune-player-build')

test('keeps Player Admin routes that are called by the standalone management UI', () => {
  assert.equal(playerServiceRoutes.has('/api/play-admin/identity-bans'), true)
  assert.equal(playerServiceRoutes.has('/api/play-admin/self-password'), true)
})
