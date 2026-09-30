import * as crypto from 'node:crypto'
import type { Session } from 'electron'
import { createLaunchSession } from './local-resource-protocol'
import type { ActiveLaunchSession, ProtocolRequest } from './local-resource-protocol'
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
  handleLocalResource: (request: ProtocolRequest) => Promise<Response>
  syncCookies: (endpoint: string, targetSession: GameSession) => Promise<void>
  blobRoot: string
}

export interface GameWindowManager {
  launch(options: { server: PlayerServerRecord; descriptor: PackageDescriptor; launchTicket: string; title: string }): Promise<{ sessionId: string; window: GameWindow }>
  close(): Promise<void>
  isActiveFor(serverId: string): boolean
  playerSessions(): GameSession[]
  getLaunchSession(sessionId: string): ActiveLaunchSession | undefined
}

export function makeGameUrl(server: PlayerServerRecord, descriptor: PackageDescriptor, sessionId: string, launchTicket: string): URL {
  const url = new URL(server.endpoint)
  const basePath = url.pathname.replace(/\/$/, '')
  url.pathname = `${basePath}/p/${descriptor.accessId}`
  url.search = ''
  url.searchParams.set('box3LocalAssets', '1')
  url.searchParams.set('box3PermanentMapId', descriptor.permanentMapId)
  url.searchParams.set('box3ReleaseVersion', descriptor.releaseVersion)
  url.searchParams.set('box3ManifestDigest', descriptor.manifestDigest)
  url.hash = new URLSearchParams({ box3LocalAsset: sessionId, box3LaunchTicket: launchTicket }).toString()
  return url
}

export function createGameWindowManager({ createBrowserWindow, sessions, handleLocalResource, syncCookies, blobRoot }: GameWindowManagerOptions): GameWindowManager {
  let window: GameWindow | undefined
  let gameSession: GameSession | undefined
  let activeLaunchSession: string | undefined
  let activeServerId: string | undefined
  const launchSessions = new Map<string, ActiveLaunchSession>()
  const playerSessions = new Set<GameSession>()

  async function close(): Promise<void> {
    const currentWindow = window
    const currentSession = gameSession
    const launchSession = activeLaunchSession
    window = undefined
    gameSession = undefined
    activeLaunchSession = undefined
    activeServerId = undefined
    if (launchSession) launchSessions.delete(launchSession)
    if (currentSession) {
      playerSessions.delete(currentSession)
      try { currentSession.protocol.unhandle('boxplay') } catch { /* The session may already be shutting down. */ }
    }
    if (currentWindow && !currentWindow.isDestroyed()) currentWindow.destroy()
  }

  return Object.freeze({
    async launch({ server, descriptor, launchTicket, title }): Promise<{ sessionId: string; window: GameWindow }> {
      await close()
      const sessionId = crypto.randomBytes(32).toString('base64url')
      const origin = new URL(server.endpoint).origin
      launchSessions.set(sessionId, createLaunchSession(
        descriptor,
        blobRoot,
        origin,
        sessionId,
        Date.now() + 24 * 60 * 60 * 1000,
      ))
      activeLaunchSession = sessionId
      const url = makeGameUrl(server, descriptor, sessionId, launchTicket)

      try {
        const nextSession = sessions.fromPartition(`boxplay-launch-${sessionId}`, { cache: false })
        gameSession = nextSession
        playerSessions.add(nextSession)
        await nextSession.protocol.handle('boxplay', handleLocalResource)
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
        return { sessionId, window: nextWindow }
      } catch (error) {
        await close()
        throw new Error(`无法打开游玩地图：${error.message}`)
      }
    },
    close,
    isActiveFor(serverId: string): boolean {
      return activeServerId === serverId
    },
    playerSessions(): GameSession[] {
      return [...playerSessions]
    },
    getLaunchSession(sessionId: string): ActiveLaunchSession | undefined {
      return launchSessions.get(sessionId)
    },
  })
}
