import { app, BrowserWindow, ipcMain, protocol, session } from 'electron'
import * as os from 'node:os'
import * as path from 'node:path'
import { createApiTransport } from './services/api-transport'
import { createLocalResourceProtocol } from './services/local-resource-protocol'
import { createGameWindowManager } from './services/game-window-manager'
import { createMapPackageManager } from './services/map-package-manager'
import { createServerStore } from './services/server-store'
import type { ElectronCommandPayload } from './types'
import type { ServerStore } from './services/server-store'
import type { MapPackageManager } from './services/map-package-manager'
import type { GameWindow, GameWindowManager, GameWindowOptions } from './services/game-window-manager'
import type { ViteDevServer } from 'vite'

protocol.registerSchemesAsPrivileged([{
  scheme: 'boxplay',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  },
}])

const COMMANDS = new Set<string>([
  'launcher_state',
  'add_server',
  'select_server',
  'remove_server',
  'rename_server',
  'clear_player_session',
  'api_request',
  'prepare_map_package',
  'get_map_asset_resume_offset',
  'install_map_asset',
  'commit_map_package',
  'associate_map_packages_with_server',
  'launch_map',
])

let mainWindow: Electron.BrowserWindow | undefined
let devServer: ViteDevServer | undefined
const apiTransport = createApiTransport()

app.setName('BOX3 Player Launcher')
const dataRoot = process.platform === 'linux'
  ? (process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'))
  : app.getPath('appData')
app.setPath('userData', path.join(dataRoot, 'com.box.player.launcher'))
const hasSingleInstanceLock = app.requestSingleInstanceLock()

function getServerStore(): ServerStore {
  return createServerStore(path.join(app.getPath('userData'), 'servers.json'))
}

const serverStore: ServerStore = getServerStore()
const packageManager: MapPackageManager = createMapPackageManager({
  root: path.join(app.getPath('userData'), 'map-packages'),
  serverStore,
  apiTransport,
  onProgress(progress) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('launcher:event:box-player-map-download-progress', progress)
    }
  },
})
let gameWindowManager: GameWindowManager
const handleLocalResource = createLocalResourceProtocol({
  getSession: (id) => gameWindowManager?.getLaunchSession(id),
})
gameWindowManager = createGameWindowManager({
  createBrowserWindow: (options: GameWindowOptions) => new BrowserWindow(options as Electron.BrowserWindowConstructorOptions) as unknown as GameWindow,
  sessions: session,
  handleLocalResource,
  syncCookies: syncPlayerCookies,
  blobRoot: path.join(app.getPath('userData'), 'map-packages', 'blobs'),
})

async function syncPlayerCookies(endpoint: string, targetSession: Electron.Session): Promise<void> {
  const secure = new URL(endpoint).protocol === 'https:'
  const expires = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
  for (const [name, value] of apiTransport.cookies(endpoint)) {
    await targetSession.cookies.set({
      url: endpoint,
      name,
      value,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      expirationDate: expires,
    })
  }
}

async function clearWebSessionCookies(endpoint: string): Promise<void> {
  const cookieSessions = new Set([session.defaultSession, ...gameWindowManager.playerSessions()])
  for (const targetSession of cookieSessions) {
    const cookies = await targetSession.cookies.get({ url: endpoint })
    for (const cookie of cookies) {
      if (['box_local_player_session', 'box_local_player_device'].includes(cookie.name)) {
        const protocolName = cookie.secure ? 'https:' : 'http:'
        const host = cookie.domain.replace(/^\./, '')
        const url = `${protocolName}//${host}${cookie.path || '/'}`
        await targetSession.cookies.remove(url, cookie.name)
      }
    }
  }
}

function validateLaunchTicket(ticket: unknown): ticket is string {
  return typeof ticket === 'string'
    && ticket.length > 0
    && ticket.length <= 2048
    && /^[A-Za-z0-9_.-]+$/.test(ticket)
    && /^[^.]+\.[^.]+$/.test(ticket)
}

async function launchMap(payload: ElectronCommandPayload): Promise<void> {
  const serverId = requireString(payload.serverId, '这个服务器已不在列表中')
  const state = serverStore.load()
  if (state.selectedServerId !== serverId) throw new Error('请先选择要启动地图的服务器')
  const server = state.servers.find((item) => item.id === serverId)
  if (!server) throw new Error('这个服务器已不在列表中')
  if (!validateLaunchTicket(payload.launchTicket)) throw new Error('服务器启动授权无效，请重新点击开始游玩。')
  const installed = await packageManager.verifyInstalled(
    serverId,
    requireString(payload.descriptor, '地图资源描述符格式无效'),
    requireString(payload.trustedSigningKey, '服务器签名公钥格式无效'),
  )
  const releaseVersion = installed.releaseVersion.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 128) || '未知版本'
  const mapName = String(payload.mapName || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) || 'BOX3 Player'
  const title = `${mapName} · ${releaseVersion}`
  await gameWindowManager.launch({ server, descriptor: installed.descriptor, launchTicket: payload.launchTicket, title })
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value) throw new Error(message)
  return value
}

async function dispatch(command: string, payload: ElectronCommandPayload = {}): Promise<any> {
  if (!COMMANDS.has(command)) throw new Error('不允许的启动器命令')
  const store = serverStore
  if (command === 'launcher_state') return store.load()
  if (command === 'add_server') return store.add(requireString(payload.endpoint, '请输入有效的游玩端服务器 IP 或域名'))
  if (command === 'select_server') return store.select(requireString(payload.serverId, '这个服务器已不在列表中'))
  if (command === 'rename_server') return store.rename(
    requireString(payload.serverId, '这个服务器已不在列表中'),
    requireString(payload.name, '服务器昵称不能为空'),
  )
  if (command === 'api_request') {
    if (!payload.request) throw new Error('API 请求参数缺失')
    return apiTransport.request(payload.request)
  }
  if (command === 'clear_player_session') {
    const server = store.load().servers.find((item) => item.id === payload.serverId)
    if (!server) throw new Error('这个服务器已不在列表中')
    apiTransport.clear(server.endpoint)
    await clearWebSessionCookies(server.endpoint)
    return undefined
  }
  if (command === 'remove_server') {
    const server = store.load().servers.find((item) => item.id === payload.serverId)
    if (!server) throw new Error('这个服务器已不在列表中')
    if (gameWindowManager.isActiveFor(server.id)) await gameWindowManager.close()
    await packageManager.removeServer(server.id)
    apiTransport.clear(server.endpoint)
    await clearWebSessionCookies(server.endpoint)
    const next = await store.remove(server.id)
    return next
  }
  if (command === 'prepare_map_package') return packageManager.prepare(
    requireString(payload.serverId, '这个服务器已不在列表中'),
    requireString(payload.descriptor, '地图资源描述符格式无效'),
    requireString(payload.trustedSigningKey, '服务器签名公钥格式无效'),
  )
  if (command === 'get_map_asset_resume_offset') return packageManager.resumeOffset(
    requireString(payload.serverId, '这个服务器已不在列表中'),
    requireString(payload.descriptor, '地图资源描述符格式无效'),
    requireString(payload.trustedSigningKey, '服务器签名公钥格式无效'),
    requireString(payload.hash, '资源 hash 无效'),
  )
  if (command === 'install_map_asset') return packageManager.install({ payload: payload.payload as NonNullable<ElectronCommandPayload['payload']> })
  if (command === 'commit_map_package') return packageManager.commit(
    requireString(payload.serverId, '这个服务器已不在列表中'),
    requireString(payload.descriptor, '地图资源描述符格式无效'),
    requireString(payload.trustedSigningKey, '服务器签名公钥格式无效'),
  )
  if (command === 'associate_map_packages_with_server') return packageManager.associate(
    requireString(payload.serverId, '这个服务器已不在列表中'),
    payload.accessIds || [],
    requireString(payload.trustedSigningKey, '服务器签名公钥格式无效'),
  )
  if (command === 'launch_map') return launchMap(payload)
  throw new Error(`Electron 迁移尚未接入 ${command}，请勿用此构建进行地图或账号操作。`)
}

function isLauncherWindow(event: Electron.IpcMainInvokeEvent): boolean {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) return false
  const frameUrl = event.senderFrame?.url || ''
  if (process.argv.includes('--dev')) return frameUrl.startsWith('http://127.0.0.1:1421/')
  try {
    const sender = new URL(frameUrl)
    const expected = new URL(`file://${path.resolve(__dirname, '../dist/index.html')}`)
    return sender.protocol === 'file:' && sender.pathname === expected.pathname
  } catch {
    return false
  }
}

ipcMain.handle('launcher:invoke', (event: Electron.IpcMainInvokeEvent, command: string, payload: ElectronCommandPayload) => {
  if (!isLauncherWindow(event)) throw new Error('启动器 IPC 来源无效')
  return dispatch(command, payload)
})

async function startVite(): Promise<string> {
  if (devServer) return 'http://127.0.0.1:1421'
  const { createServer } = await import('vite')
  devServer = await createServer({
    root: path.resolve(__dirname, '..'),
    server: {
      host: '127.0.0.1',
      port: 1421,
      strictPort: true,
      watch: { ignored: ['**/release-electron/**', '**/src-tauri/target/**'] },
    },
  })
  await devServer.listen()
  return 'http://127.0.0.1:1421'
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: `BOX3 Player Launcher v${app.getVersion()}`,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('context-menu', (event) => event.preventDefault())
  if (process.argv.includes('--dev')) {
    await mainWindow.loadURL(await startVite())
    if (process.argv.includes('--devtools')) mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.resolve(__dirname, '../dist/index.html'))
  }
  mainWindow.setTitle(`BOX3 Player Launcher v${app.getVersion()}`)
}

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    void createMainWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) {
    app.quit()
    return
  }
  await createMainWindow()
}).catch((error) => {
  console.error(error)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (devServer) void devServer.close()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createMainWindow()
})
