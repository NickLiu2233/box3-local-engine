import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { createGameWindowManager } from './game-window-manager'
import { createSignedPackageFixture } from '../testing/signed-package-fixture'
import type { GameSession, GameWindow, GameWindowManagerOptions, GameWindowOptions } from './game-window-manager'

test('binds the resource protocol and player cookies to one ephemeral game session', async (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-window-'))
  context.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const { descriptor } = createSignedPackageFixture(Buffer.from('resource'), { mapId: 'map-1', releaseVersion: 'v1.0.0' })
  let capturedOptions
  let capturedUrl
  let handlerRegistered = false
  let handlerRemoved = false
  let cookiesSyncedTo
  let closedHandler: (() => void) | undefined
  const gameSession = {
    protocol: {
      async handle(scheme) { assert.equal(scheme, 'boxplay'); handlerRegistered = true },
      unhandle(scheme) { assert.equal(scheme, 'boxplay'); handlerRemoved = true },
    },
    cookies: {},
  } as unknown as GameSession
  const sessions: GameWindowManagerOptions['sessions'] = { fromPartition(partition, options) {
    assert.match(partition, /^boxplay-launch-/)
    assert.equal(options.cache, false)
    return gameSession
  } }
  const window = {
    webContents: {
      setWindowOpenHandler() {},
      on() {},
    },
    setMenuBarVisibility() {},
    on(event, callback) { if (event === 'closed') closedHandler = callback },
    async loadURL(url) { capturedUrl = new URL(url) },
    setTitle(value) { this.title = value },
    isDestroyed() { return false },
    destroy() { closedHandler?.() },
  }
  const createBrowserWindow = (options: GameWindowOptions): GameWindow => {
    capturedOptions = options
    return window as unknown as GameWindow
  }
  const manager = createGameWindowManager({
    createBrowserWindow,
    sessions,
    handleLocalResource: async () => new Response(),
    blobRoot: path.join(root, 'blobs'),
    async syncCookies(_endpoint, targetSession) { cookiesSyncedTo = targetSession },
  })

  const launched = await manager.launch({
    server: { id: 'server-1', endpoint: 'https://play.example.com/base', name: 'Play' },
    descriptor,
    launchTicket: 'payload.signature',
    title: 'Town · v1.0.0',
  })
  assert.equal(handlerRegistered, true)
  assert.equal(cookiesSyncedTo, gameSession)
  assert.equal(capturedOptions.webPreferences.session, gameSession)
  assert.equal(capturedOptions.webPreferences.nodeIntegration, false)
  assert.equal(capturedOptions.webPreferences.contextIsolation, true)
  assert.equal(capturedUrl.pathname, '/base/p/town')
  assert.equal(capturedUrl.searchParams.get('box3LocalAssets'), '1')
  assert.equal(capturedUrl.hash.includes(launched.sessionId), true)
  assert.equal(manager.isActiveFor('server-1'), true)
  assert.deepEqual(manager.playerSessions(), [gameSession])

  await manager.close()
  assert.equal(handlerRemoved, true)
  assert.equal(manager.isActiveFor('server-1'), false)
  assert.deepEqual(manager.playerSessions(), [])
})
