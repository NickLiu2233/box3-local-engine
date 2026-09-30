import { invoke, isDesktopLauncher } from './platform/launcher-bridge'
import brandIcon from '../resources/brand-icon.png'
import { createPlayerApi } from './services/player-api'
import { bindEvents } from './events'
import { renderPackagesPage, renderServerPage } from './views/server-pages'
import type { PlayerLauncherState, PlayerServer } from './types'
import './styles.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('启动器界面根节点缺失')
document.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true })
const state: PlayerLauncherState = {
  servers: [],
  selectedId: '',
  page: 'home',
  busy: false,
  endpointInput: '',
  editingServerId: '',
  serverNameInput: '',
  serverBootstrap: null,
  player: null,
  playerMenuOpen: false,
  playerSettingsOpen: false,
  playerProfileName: '',
  playerProfileSkinId: 'explorer',
  playerProfileError: '',
  worlds: [],
  preparingMapId: '',
  authError: '',
  mapsError: '',
  confirmRemoveServerId: '',
  error: '',
  notice: '',
  theme: readTheme(),
  themeMenuOpen: false,
}

document.addEventListener('click', (event) => {
  if (!state.playerMenuOpen) return
  if (event.target instanceof Element && event.target.closest('.player-account-control')) return
  state.playerMenuOpen = false
  render()
})

const previewServers: PlayerServer[] = []
const remoteApi = createPlayerApi({ invoke, isNative: isDesktopLauncher })

async function refreshPlayerSession(server: PlayerServer | null = selectedServer()): Promise<void> {
  state.player = null
  state.worlds = []
  state.authError = ''
  state.mapsError = ''
  if (!server || !state.serverBootstrap?.supported) return
  if (state.serverBootstrap.loginRequired) {
    let result
    try {
      result = await remoteApi.readSession(server.endpoint, state.serverBootstrap)
    } catch (error) {
      state.authError = error.message || '无法连接玩家账号服务。'
      return
    }
    if (!result.response.ok) {
      state.authError = '无法检查当前服务器的登录状态，请稍后重试。'
      return
    }
    state.player = result.data?.player || null
    if (!state.player) return
  }
  try {
    const { data, response } = await remoteApi.getMaps(server.endpoint)
    if (response.status === 401) {
      state.player = null
      state.worlds = []
      state.authError = '服务器未接受当前登录状态，请重新登录。'
      return
    }
    if (response.status === 403) {
      state.mapsError = '服务器拒绝了地图列表请求，请检查当前账号权限。'
      return
    }
    if (!response.ok) {
      const responseMessage = (data as unknown as { message?: unknown } | undefined)?.message
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : ''
      throw new Error(message || `读取可玩地图失败（HTTP ${response.status}）`)
    }
    state.worlds = Array.isArray(data?.worlds) ? data.worlds : []
    state.mapsError = ''
  } catch (error) {
    state.mapsError = error.message || '读取可玩地图失败。'
  }
}

async function playerInvoke(command: string, payload: Record<string, any> = {}): Promise<any> {
  if (command === 'get_server_bootstrap') {
    try {
      return await remoteApi.readBootstrap(String(payload.endpoint || ''))
    } catch (error) {
      throw new Error(error.message || '无法读取服务器启动器支持信息（浏览器预览可能受跨域限制）')
    }
  }
  if (command === 'add_server') {
    const raw = String(payload.endpoint || '').trim().replace(/\/$/, '')
    if (!raw || /\s/.test(raw)) throw new Error('请输入有效的游玩端服务器 IP 或域名')
    const hasExplicitScheme = raw.includes('://')
    let endpoint = hasExplicitScheme ? raw : `https://${raw}`
    let parsed
    try { parsed = new URL(endpoint) } catch { throw new Error('请输入有效的游玩端服务器 IP 或域名') }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error('请输入有效的游玩端服务器 IP 或域名（支持 HTTP/HTTPS）')
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (!hasExplicitScheme && (hostname === 'localhost' || hostname.endsWith('.localhost') || /^127(?:\.\d{1,3}){3}$/.test(hostname) || hostname === '::1')) {
      parsed.protocol = 'http:'
      endpoint = parsed.toString().replace(/\/$/, '')
    }
    try { await remoteApi.verifyServer(endpoint) } catch (error) {
      throw new Error(error.message || '无法连接到游玩端服务器，请检查 IP/域名、端口和网络后重试')
    }
    if (isDesktopLauncher()) return invoke(command, { endpoint })
    const host = parsed.host
    const server = { id: endpoint.toLowerCase(), endpoint, name: host }
    const index = previewServers.findIndex((item) => item.id === server.id)
    if (index >= 0) previewServers.splice(index, 1)
    previewServers.unshift(server)
    return server
  }
  if (command === 'clear_player_session' && !isDesktopLauncher()) return undefined
  if (isDesktopLauncher()) return invoke(command, payload)
  if (command === 'launcher_state') {
    return { servers: previewServers, selectedServerId: previewServers[0]?.id || null }
  }
  if (command === 'select_server') return { servers: previewServers, selectedServerId: payload.serverId }
  if (command === 'rename_server') {
    const name = String(payload.name || '').trim()
    if (!name) throw new Error('服务器昵称不能为空')
    if ([...name].length > 40) throw new Error('服务器昵称不能超过 40 个字符')
    const server = previewServers.find((item) => item.id === payload.serverId)
    if (!server) throw new Error('这个服务器已不在列表中')
    server.name = name
    return { ...server }
  }
  if (command === 'remove_server') {
    const index = previewServers.findIndex((server) => server.id === payload.serverId)
    if (index >= 0) previewServers.splice(index, 1)
    return { servers: previewServers, selectedServerId: previewServers[0]?.id || null }
  }
  throw new Error('此操作只能在 BOX3 玩家启动器中执行')
}

function escapeHtml(value: unknown): string {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function readTheme(): string {
  try {
    const saved = localStorage.getItem('box-player-launcher-theme')
    return ['system', 'light', 'dark'].includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

const themes = [['system', '跟随系统'], ['light', '亮色'], ['dark', '暗色']]

function applyTheme(theme: string): void {
  state.theme = themes.some(([id]) => id === theme) ? theme : 'system'
  if (state.theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = state.theme
  try { localStorage.setItem('box-player-launcher-theme', state.theme) } catch { /* WebView storage may be disabled. */ }
}

function themeControl(): string {
  const currentLabel = themes.find(([id]) => id === state.theme)?.[1] || '跟随系统'
  const themeIcon = (id) => icon(id === 'system' ? 'device' : id === 'light' ? 'sun' : 'moon')
  return `<div class="theme-picker">
    ${state.themeMenuOpen ? `<div class="theme-menu" role="menu" aria-label="界面主题">${themes.map(([id, label]) => `<button class="${state.theme === id ? 'active' : ''}" data-theme-choice="${id}" role="menuitemradio" aria-checked="${state.theme === id}">${themeIcon(id)}<span>${label}</span><i></i></button>`).join('')}</div>` : ''}
    <button class="theme-trigger ${state.themeMenuOpen ? 'open' : ''}" id="theme-trigger" aria-expanded="${state.themeMenuOpen}">${themeIcon(state.theme)}<span>外观</span><small>${currentLabel}</small>${icon('chevron')}</button>
  </div>`
}

function selectedServer(): PlayerServer | null {
  return state.servers.find((server) => server.id === state.selectedId) || null
}

function icon(name: string): string {
  const paths = {
    servers: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>',
    packages: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    device: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.8 13A8.5 8.5 0 0 1 11 3.2 8.5 8.5 0 1 0 20.8 13Z"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.12 2.12 0 0 0-3-3L5 16l-1 4Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || ''}</svg>`
}

function serverRows(): string {
  if (!state.servers.length) return '<div class="nav-empty">还没有添加服务器</div>'
  return state.servers.map((server) => `
    <button class="server-nav ${state.selectedId === server.id && state.page === 'servers' ? 'active' : ''}" data-select-server="${escapeHtml(server.id)}">
      <span class="server-dot"></span>
      <span class="server-nav-copy"><strong>${escapeHtml(server.name || server.endpoint)}</strong><small>${escapeHtml(server.endpoint)}</small></span>
      <span class="server-remove" data-remove-server="${escapeHtml(server.id)}" title="从列表移除">${icon('trash')}</span>
    </button>`).join('')
}

function serverPage(): string {
  return renderServerPage(state, selectedServer(), { icon, escapeHtml })
}

function removeServerDialog(): string {
  const server = state.servers.find((item) => item.id === state.confirmRemoveServerId)
  if (!server) return ''
  return `
    <div class="confirm-backdrop" data-remove-server-dialog-dismiss>
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-server-title" aria-describedby="remove-server-description">
        <header><div><h2 id="remove-server-title">移除服务器并删除本地地图数据？</h2><p id="remove-server-description">“${escapeHtml(server.name || server.endpoint)}”将从本机启动器列表中移除，同时会删除本机为该服务器保存的地图数据。</p></div></header>
        <div class="confirm-actions"><button class="button" type="button" data-cancel-remove-server autofocus>取消</button><button class="button danger" type="button" data-confirm-remove-server ${state.busy ? 'disabled' : ''}>确认移除</button></div>
      </section>
    </div>`
}

function render(): void {
  app.innerHTML = `
    <main class="shell">
      <aside class="sidebar">
        <header class="brand"><img class="brand-icon" src="${brandIcon}" alt="" /><span class="brand-copy"><strong>BOX3 Player</strong><small>本地游玩</small></span></header>
        <div class="sidebar-section">
          <div class="sidebar-section-heading"><span>已添加的服务器</span><button class="icon-button" data-nav="add-server" title="添加服务器">${icon('plus')}</button></div>
          <div class="server-list">${serverRows()}</div>
        </div>
        <div class="sidebar-bottom">${themeControl()}<span class="launcher-copyright">©深圳奇梦岛科技有限公司 版权所有</span></div>
      </aside>
      <section class="main-area">
        ${(state.error || state.notice) ? `<div class="toast ${state.error ? 'danger' : 'success'}" role="status"><span>${state.error ? '操作未完成' : '操作完成'}</span><small>${escapeHtml(state.error || state.notice)}</small><button type="button" data-dismiss-feedback aria-label="关闭提示">×</button></div>` : ''}
        <main class="content ${state.page === 'home' || (state.page === 'servers' && !selectedServer()) ? 'welcome-content' : ''} ${state.page === 'add-server' ? 'add-server-content' : ''}">${state.page === 'packages' ? renderPackagesPage(icon) : serverPage()}</main>
      </section>
    </main>`
    + removeServerDialog()
  bindEvents({ state, playerInvoke, remoteApi, selectedServer, refreshPlayerSession, applyTheme, render })
}

async function bootstrap() {
  try {
    const launcher = await playerInvoke('launcher_state')
    state.servers = launcher.servers || []
    state.selectedId = launcher.selectedServerId || state.servers[0]?.id || ''
    state.page = 'home'
  } catch (error) {
    state.error = `无法读取本机启动器数据：${error}`
  }
  render()
}

applyTheme(state.theme)
bootstrap()
