import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { readResourceCache, clearResourceCache } from '../runtime/resource-cache'

// Exercise the built file:// application without using a real account or the
// user's launcher profile. This also works against a packaged app.asar.
const root = process.env.BOX_LAUNCHER_SMOKE_ROOT || path.resolve(__dirname, '..')
if (root.endsWith('.asar')) {
  for (const excluded of [
    'node_modules',
    'electron',
    'tests',
    'dist-electron/launcher-smoke.cjs',
    'dist-electron/cache-smoke.cjs',
    'dist-electron/build',
  ]) {
    if (fs.existsSync(path.join(root, excluded)))
      throw new Error(`Unexpected packaged development files: ${excluded}`)
  }
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'box-launcher-smoke-'))
app.setPath('userData', temp)
nativeTheme.themeSource = 'light'
const server = { id: 'smoke-server', name: '测试服务器', endpoint: 'http://127.0.0.1:3121' }
const player = { username: 'test-player', displayName: '测试玩家', avatarSkinId: 'explorer' }
const cover = `data:image/png;base64,${fs.readFileSync(path.resolve(__dirname, '../../game/public/map-templates/blank-template.png')).toString('base64')}`
let cleared = false
let mapCleared = false
const emptyServer = { id: 'empty-server', name: '空缓存服务器', endpoint: 'http://127.0.0.1:9999' }

ipcMain.handle('launcher:invoke', (_event, command, payload) => {
  if (command === 'launcher_state') return { servers: [server, emptyServer], selectedServerId: server.id }
  if (command === 'remember_maps') return
  if (command === 'game_status') return null
  if (command === 'fetch_public_image') return cover
  if (command === 'clear_resource_cache') cleared = true
  if (command === 'clear_map_cache') mapCleared = true
  if (['cache_status', 'clear_resource_cache', 'clear_map_cache'].includes(command)) {
    const empty = cleared || payload.serverId === emptyServer.id
    return {
      staticBytes: empty || mapCleared ? 0 : 1024 * 1024,
      httpBytes: empty ? 0 : 256,
      inUse: false,
      maps:
        empty || mapCleared
          ? []
          : [
              {
                mapId: 'permanent-town',
                name: '星梦小镇',
                versions: ['v1.0.0'],
                bytes: 1024 * 1024,
                resources: 10,
              },
            ],
    }
  }
  if (command === 'api_request') {
    const url = new URL(payload.request.url)
    let data: unknown
    if (url.pathname.endsWith('/bootstrap'))
      data = {
        protocolVersion: 1,
        serverName: server.name,
        loginRequired: true,
        loginApiUrl: `${server.endpoint}/api/auth/login`,
        signingKey: null,
      }
    else if (url.pathname.endsWith('/session')) data = { player }
    else if (url.pathname.endsWith('/maps'))
      data = {
        worlds: [
          {
            id: 'town',
            publicId: 'town',
            name: '星梦小镇',
            author: '作者甲',
            version: 'v1.0.0',
            onlineCount: 3,
            cover: '',
          },
          {
            id: 'arena',
            publicId: 'arena',
            name: '竞技场',
            author: '作者乙',
            version: 'v1.1.0',
            onlineCount: 7,
            cover: '',
          },
        ],
      }
    else throw new Error(`Unexpected smoke API: ${url.pathname}`)
    return { status: 200, headers: [['content-type', 'application/json']], body: JSON.stringify(data) }
  }
  throw new Error(`Unexpected smoke command: ${command}`)
})

app
  .whenReady()
  .then(async () => {
    const window = new BrowserWindow({
      show: false,
      width: 1180,
      height: 760,
      webPreferences: {
        preload: path.join(root, 'dist-electron/preload.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    })
    const errors: string[] = []
    window.webContents.on('console-message', (event) => {
      if (event.level === 'error') errors.push(event.message)
    })
    const run = (code: string) => window.webContents.executeJavaScript(code)
    async function waitFor(code: string): Promise<void> {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (await run(code)) return
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      throw new Error(`Desktop smoke timed out: ${code}`)
    }
    await window.loadFile(path.join(root, 'dist/index.html'))
    await waitFor('Boolean(document.querySelector("[data-select-server]"))')
    if (
      !(await run(
        'getComputedStyle(document.documentElement).colorScheme === "dark" && getComputedStyle(document.body).backgroundColor === "rgb(13, 13, 13)" && !document.querySelector("#theme-trigger")',
      ))
    ) {
      throw new Error('Launcher must stay dark even when the system uses light appearance')
    }
    await run('document.querySelector("[data-select-server]").click()')
    await waitFor(
      'document.querySelectorAll(".world-card").length === 2 && [...document.querySelectorAll(".world-cover, .brand-icon, .player-account-avatar")].every(image => image.naturalWidth > 0)',
    )
    await run(
      'const input = document.querySelector("#map-search"); input.focus(); input.value = "星梦"; input.dispatchEvent(new Event("input", { bubbles: true }))',
    )
    await waitFor(
      'document.querySelectorAll(".world-card").length === 1 && document.activeElement.id === "map-search"',
    )
    await run('document.querySelector("[data-nav=packages]").click()')
    await waitFor('document.querySelector(".storage-row small")?.textContent.includes("1.0 MB")')
    if (
      !(await run(
        'document.querySelectorAll(".storage-server-trigger").length === 1 && !document.querySelector("[data-refresh-storage]")',
      ))
    )
      throw new Error('Empty servers or manual refresh are still displayed')
    await run('document.querySelector("[data-open-storage-server]").click()')
    await waitFor(
      'document.querySelector("[data-map-cache=permanent-town]")?.textContent.includes("星梦小镇")',
    )
    await run(
      'document.querySelector("[data-clear-map-cache]").click(); document.querySelector("[data-confirm-map-cache]").click()',
    )
    await waitFor(
      '!document.querySelector("[data-map-cache=permanent-town]") && Boolean(document.querySelector(".storage-browser-cache"))',
    )
    await run(
      'document.querySelector("[data-clear-cache]").click(); document.querySelector("[data-confirm-cache]").click()',
    )
    await waitFor(
      'Boolean(document.querySelector(".empty-maps")) && !document.querySelector(".storage-server-trigger")',
    )
    const nativeSession = window.webContents.session
    const usage = await readResourceCache(nativeSession)
    if (!Number.isFinite(usage.staticBytes) || !Number.isFinite(usage.httpBytes))
      throw new Error('Invalid native cache usage')
    await nativeSession.cookies.set({ url: 'https://smoke.example', name: 'smoke-account', value: 'fixture' })
    await clearResourceCache(nativeSession)
    if (!(await nativeSession.cookies.get({ name: 'smoke-account' })).length)
      throw new Error('Clearing resources removed account cookies')
    if (errors.length) throw new Error(errors.join('\n'))
    window.destroy()
    console.log('Desktop smoke passed: packaged assets, covers, search focus, cache usage and clearing')
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })

app.on('will-quit', () => fs.rmSync(temp, { recursive: true, force: true }))
