import * as crypto from 'node:crypto'
import type { Session } from 'electron'
import type { PackageDescriptor, PlayerServerRecord } from '../types'

export type GameSession = Session

export interface GameWindow {
  webContents: {
    setWindowOpenHandler(handler: () => { action: 'deny' }): void
    on(event: 'will-navigate', listener: (event: { preventDefault(): void }, target: string) => void): void
  }
  setMenuBarVisibility(visible: boolean): void
  on(event: 'closed', listener: () => void): void
  loadURL(url: string): Promise<void>
  setTitle(title: string): void
  isDestroyed(): boolean
  destroy(): void
}

export interface GameWindowOptions {
  width: number
  height: number
  minWidth: number
  minHeight: number
  title: string
  autoHideMenuBar: boolean
  backgroundColor: string
  webPreferences: {
    session: GameSession
    contextIsolation: boolean
    nodeIntegration: boolean
    sandbox: boolean
    webSecurity: boolean
    allowRunningInsecureContent: boolean
  }
}

export interface GameWindowManagerOptions {
  createBrowserWindow: (options: GameWindowOptions) => GameWindow
  sessions: { fromPartition(partition: string, options: { cache: boolean }): GameSession }
  syncCookies: (endpoint: string, targetSession: GameSession) => Promise<void>
}

export interface GameWindowManager {
  launch(options: { server: PlayerServerRecord; descriptor: PackageDescriptor; launchTicket: string; title: string }): Promise<{ window: GameWindow }>
  close(): Promise<void>
  clearServerCache(serverId: string): Promise<void>
  isActiveFor(serverId: string): boolean
  playerSessions(): GameSession[]
}

export function makeGameUrl(server: PlayerServerRecord, descriptor: PackageDescriptor, launchTicket: string): URL {
  const url = new URL(server.endpoint)
  const basePath = url.pathname.replace(/\/$/, '')
  url.pathname = `${basePath}/p/${descriptor.accessId}`
  url.search = ''
  url.searchParams.set('box3ServiceWorkerCache', '1')
  url.searchParams.set('box3PermanentMapId', descriptor.permanentMapId)
  url.searchParams.set('box3ReleaseVersion', descriptor.releaseVersion)
  url.searchParams.set('box3ManifestDigest', descriptor.manifestDigest)
  url.hash = new URLSearchParams({ box3LaunchTicket: launchTicket }).toString()
  return url
}

export function isAllowedGamePermission(permission: string, requestingUrl: string, isMainFrame: boolean, allowedOrigin: string): boolean {
  if (!isMainFrame || !['pointerLock', 'fullscreen'].includes(permission)) return false
  try {
    return new URL(requestingUrl).origin === allowedOrigin
  } catch {
    return false
  }
}

function cachePartition(serverId: string): string {
  const id = crypto.createHash('sha256').update(serverId).digest('hex').slice(0, 32)
  return `persist:box-player-${id}`
}

export function createGameWindowManager({ createBrowserWindow, sessions, syncCookies }: GameWindowManagerOptions): GameWindowManager {
  let window: GameWindow | undefined
  let gameSession: GameSession | undefined
  let activeServerId: string | undefined
  const playerSessions = new Set<GameSession>()

  async function close(): Promise<void> {
    const currentWindow = window
    const currentSession = gameSession
    window = undefined
    gameSession = undefined
    activeServerId = undefined
    if (currentSession) {
      playerSessions.delete(currentSession)
    }
    if (currentWindow && !currentWindow.isDestroyed()) currentWindow.destroy()
  }

  async function clearServerCache(serverId: string): Promise<void> {
    if (activeServerId === serverId) await close()
    const target = sessions.fromPartition(cachePartition(serverId), { cache: true })
    await target.clearStorageData({ storages: ['cookies', 'serviceworkers', 'cachestorage'] })
  }

  return Object.freeze({
    async launch({ server, descriptor, launchTicket, title }): Promise<{ window: GameWindow }> {
      await close()
      const origin = new URL(server.endpoint).origin
      const url = makeGameUrl(server, descriptor, launchTicket)

      try {
        // Keep one persistent origin partition per server so Service Worker
        // Cache Storage survives relaunches and is shared across its maps.
        const nextSession = sessions.fromPartition(cachePartition(server.id), { cache: true })
        gameSession = nextSession
        playerSessions.add(nextSession)
        nextSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) => (
          isAllowedGamePermission(permission, requestingOrigin, details.isMainFrame, origin)
        ))
        nextSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
          const allowed = 'requestingUrl' in details && 'isMainFrame' in details
            && isAllowedGamePermission(permission, details.requestingUrl, details.isMainFrame, origin)
          callback(allowed)
        })
        await syncCookies(server.endpoint, nextSession)

        const nextWindow = createBrowserWindow({
          width: 1280,
          height: 800,
          minWidth: 900,
          minHeight: 620,
          title,
          autoHideMenuBar: true,
          backgroundColor: '#000000',
          webPreferences: {
            session: nextSession,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
          },
        })
        window = nextWindow
        activeServerId = server.id
        nextWindow.setMenuBarVisibility(false)
        nextWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
        nextWindow.webContents.on('will-navigate', (event, target) => {
          let next
          try { next = new URL(target) } catch { event.preventDefault(); return }
          if (next.origin !== origin) event.preventDefault()
        })
        nextWindow.on('closed', () => {
          if (window === nextWindow) void close()
        })
        await nextWindow.loadURL(url.toString())
        nextWindow.setTitle(title)
        return { window: nextWindow }
      } catch (error) {
        await close()
        throw new Error(`无法打开游玩地图：${error.message}`)
      }
    },
    close,
    clearServerCache,
    isActiveFor(serverId: string): boolean {
      return activeServerId === serverId
    },
    playerSessions(): GameSession[] {
      return [...playerSessions]
    },
  })
}
