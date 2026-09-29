import { resolveGameServerTarget } from './remote-game-server'

describe('resolveGameServerTarget', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { window?: unknown }).window
  })

  test('keeps session and socket remote while routing launcher map assets locally', () => {
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true })
    const target = resolveGameServerTarget({
      mode: 'play',
      ARENA_URL: 'https://play.example.test',
      CDN_PATH: 'boxplay://localhost/opaque-launch-session',
      remoteGameServerURL: 'https://runtime.example.test',
      launcherLocalAssetMode: true,
    })

    expect(target.sessionURL).toBe('https://runtime.example.test/api/session')
    expect(target.socketServerURL).toBe('wss://runtime.example.test')
    expect(target.assetBaseURL).toBe('boxplay://localhost/opaque-launch-session')
    expect(target.isRemote).toBe(true)
  })

  test('keeps ordinary browser assets on the remote server', () => {
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true })
    const target = resolveGameServerTarget({
      mode: 'play',
      ARENA_URL: 'https://play.example.test',
      CDN_PATH: '/runtime/play/map-one',
      remoteGameServerURL: 'https://runtime.example.test',
      launcherLocalAssetMode: false,
    })

    expect(target.assetBaseURL).toBe('https://runtime.example.test')
  })
})
