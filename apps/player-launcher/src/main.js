import { invoke } from '@tauri-apps/api/core'
import brandIcon from '../../deployment-manager/src-tauri/icons/icon.png'
import './styles.css'

const app = document.querySelector('#app')
const state = {
  servers: [],
  selectedId: '',
  page: 'home',
  busy: false,
  error: '',
  notice: '',
  theme: readTheme(),
  themeMenuOpen: false,
}

const previewServers = []

async function playerInvoke(command, payload = {}) {
  if (window.__TAURI_INTERNALS__) return invoke(command, payload)
  if (command === 'launcher_state') {
    return { servers: previewServers, selectedServerId: previewServers[0]?.id || null }
  }
  if (command === 'add_server') {
    const raw = String(payload.endpoint || '').trim().replace(/\/$/, '')
    if (!raw || /\s/.test(raw)) throw new Error('请输入有效的服务器域名或 IP')
    const endpoint = raw.includes('://') ? raw : `https://${raw}`
    if (!/^https?:\/\//.test(endpoint)) throw new Error('服务器地址需要使用 HTTP 或 HTTPS')
    const host = endpoint.replace(/^https?:\/\//, '').split('/')[0]
    if (!host) throw new Error('服务器地址无效')
    const server = { id: endpoint.toLowerCase(), endpoint, name: host }
    const index = previewServers.findIndex((item) => item.id === server.id)
    if (index >= 0) previewServers.splice(index, 1)
    previewServers.unshift(server)
    return server
  }
  if (command === 'select_server') return { servers: previewServers, selectedServerId: payload.serverId }
  if (command === 'remove_server') {
    const index = previewServers.findIndex((server) => server.id === payload.serverId)
    if (index >= 0) previewServers.splice(index, 1)
    return { servers: previewServers, selectedServerId: previewServers[0]?.id || null }
  }
  throw new Error('此操作只能在 BOX3 玩家启动器中执行')
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function readTheme() {
  try {
    const saved = localStorage.getItem('box-player-launcher-theme')
    return ['system', 'light', 'dark'].includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

const themes = [['system', '跟随系统'], ['light', '亮色'], ['dark', '暗色']]

function applyTheme(theme) {
  state.theme = themes.some(([id]) => id === theme) ? theme : 'system'
  if (state.theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = state.theme
  try { localStorage.setItem('box-player-launcher-theme', state.theme) } catch { /* WebView storage may be disabled. */ }
}

function themeControl() {
  const currentLabel = themes.find(([id]) => id === state.theme)?.[1] || '跟随系统'
  const themeIcon = (id) => icon(id === 'system' ? 'device' : id === 'light' ? 'sun' : 'moon')
  return `<div class="theme-picker">
    ${state.themeMenuOpen ? `<div class="theme-menu" role="menu" aria-label="界面主题">${themes.map(([id, label]) => `<button class="${state.theme === id ? 'active' : ''}" data-theme-choice="${id}" role="menuitemradio" aria-checked="${state.theme === id}">${themeIcon(id)}<span>${label}</span><i></i></button>`).join('')}</div>` : ''}
    <button class="theme-trigger ${state.themeMenuOpen ? 'open' : ''}" id="theme-trigger" aria-expanded="${state.themeMenuOpen}">${themeIcon(state.theme)}<span>外观</span><small>${currentLabel}</small>${icon('chevron')}</button>
  </div>`
}

function selectedServer() {
  return state.servers.find((server) => server.id === state.selectedId) || null
}

function icon(name) {
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
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || ''}</svg>`
}

function serverRows() {
  if (!state.servers.length) return '<div class="nav-empty">还没有添加服务器</div>'
  return state.servers.map((server) => `
    <button class="server-nav ${state.selectedId === server.id && state.page === 'servers' ? 'active' : ''}" data-select-server="${escapeHtml(server.id)}">
      <span class="server-dot"></span>
      <span class="server-nav-copy"><strong>${escapeHtml(server.name || server.endpoint)}</strong><small>${escapeHtml(server.endpoint)}</small></span>
      <span class="server-remove" data-remove-server="${escapeHtml(server.id)}" title="从列表移除">${icon('trash')}</span>
    </button>`).join('')
}

function serverPage() {
  if (state.page === 'home') return `
    <section class="page welcome-page">
      <h1>准备好开始游玩了吗？</h1>
      <p>添加一个私服地址。启动器会为你找到可玩的地图，并在进入前自动准备好所需资源。</p>
      <button class="button primary" data-nav="add-server">${icon('plus')}添加服务器</button>
    </section>`

  if (state.page === 'add-server') return `
    <section class="page narrow">
      <div class="page-heading"><span class="eyebrow">服务器</span><h1>添加服务器</h1><p>输入服主提供的游玩地址。添加后，启动器会显示该服务器开放的地图。</p></div>
      <form id="server-form" class="surface add-form">
        <label for="server-endpoint">服务器地址</label>
        <div class="input-row"><span class="input-icon">${icon('globe')}</span><input id="server-endpoint" name="endpoint" placeholder="play.example.com 或 https://play.example.com" autocomplete="url" required autofocus /></div>
        <p class="field-help">支持域名、IP 和端口。HTTPS 会自动作为默认连接方式。</p>
        <div class="form-actions"><button type="button" class="button secondary" data-nav="home">取消</button><button class="button primary" ${state.busy ? 'disabled' : ''}>${state.busy ? '正在添加…' : '添加服务器'}${icon('arrow')}</button></div>
      </form>
    </section>`

  const server = selectedServer()
  if (!server) return `
    <section class="page welcome-page">
      <h1>准备好开始游玩了吗？</h1>
      <p>从左侧选择一个服务器，或添加新的服务器开始游玩。</p>
    </section>`

  return `
    <section class="page">
      <div class="page-heading server-heading">
        <div class="server-heading-icon">${icon('globe')}</div>
        <div><span class="eyebrow">游玩服务器</span><h1>${escapeHtml(server.name || server.endpoint)}</h1><p>${escapeHtml(server.endpoint)}</p></div>
      </div>
      <div class="section-heading"><div><h2>可游玩的地图</h2><p>选择地图后，启动器会自动准备资源并连接服务器。</p></div><button class="button secondary" data-action="discover" ${state.busy ? 'disabled' : ''}>刷新列表</button></div>
      <div class="empty-maps surface">
        <div class="empty-map-icon">${icon('packages')}</div>
        <h3>地图列表尚未加载</h3>
        <p>这个服务器的在线地图发现接口还未接入启动器。连接功能完成后，地图会显示在这里。</p>
      </div>
      <div class="server-footer"><span class="status-dot"></span>服务器已添加，等待连接</div>
    </section>`
}

function packagesPage() {
  return `
    <section class="page">
      <div class="page-heading"><span class="eyebrow">本机资源</span><h1>本地资源包</h1><p>可导入服主提供的签名资源包。连接对应服务器后，启动器会自动复用本地资源。</p></div>
      <div class="surface import-card">
        <div class="import-icon">${icon('packages')}</div>
        <div class="import-copy"><h2>导入资源包</h2><p>资源包必须由服务器签名。启动器会校验内容后保存到本地。</p></div>
        <button class="button primary" data-action="import">选择资源包</button>
      </div>
      <div class="section-heading"><div><h2>已准备的地图资源</h2><p>地图资源安装和完整性状态会显示在这里。</p></div></div>
      <div class="empty-maps surface compact"><div class="empty-map-icon">${icon('packages')}</div><p>还没有导入或下载地图资源。</p></div>
    </section>`
}

function render() {
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
        ${state.error ? `<div class="message error">${escapeHtml(state.error)}</div>` : ''}
        ${state.notice ? `<div class="message notice">${escapeHtml(state.notice)}</div>` : ''}
        <main class="content ${state.page === 'home' || (state.page === 'servers' && !selectedServer()) ? 'welcome-content' : ''}">${state.page === 'packages' ? packagesPage() : serverPage()}</main>
      </section>
    </main>`
  bindEvents()
}

function bindEvents() {
  document.querySelector('#theme-trigger')?.addEventListener('click', () => {
    state.themeMenuOpen = !state.themeMenuOpen
    render()
  })
  document.querySelectorAll('[data-theme-choice]').forEach((node) => node.addEventListener('click', () => {
    applyTheme(node.dataset.themeChoice)
    state.themeMenuOpen = false
    render()
  }))
  document.querySelectorAll('[data-nav]').forEach((node) => node.addEventListener('click', () => {
    state.page = node.dataset.nav || 'servers'
    state.error = ''
    state.notice = ''
    render()
  }))
  document.querySelectorAll('[data-select-server]').forEach((node) => node.addEventListener('click', async (event) => {
    if (event.target.closest('[data-remove-server]')) return
    const serverId = node.dataset.selectServer || ''
    state.selectedId = serverId
    state.page = 'servers'
    state.error = ''
    state.notice = ''
    render()
    try {
      await playerInvoke('select_server', { serverId })
    } catch (error) {
      state.error = String(error)
      render()
    }
  }))
  document.querySelectorAll('[data-remove-server]').forEach((node) => node.addEventListener('click', async (event) => {
    event.stopPropagation()
    const serverId = node.dataset.removeServer || ''
    try {
      const result = await playerInvoke('remove_server', { serverId })
      state.servers = result.servers || []
      state.selectedId = result.selectedServerId || ''
      state.page = 'home'
      state.notice = '服务器已从列表移除。'
      render()
    } catch (error) {
      state.error = String(error)
      render()
    }
  }))
  document.querySelector('#server-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const endpoint = new FormData(event.currentTarget).get('endpoint')
    state.busy = true
    state.error = ''
    state.notice = ''
    render()
    try {
      const server = await playerInvoke('add_server', { endpoint })
      state.servers = [server, ...state.servers.filter((item) => item.id !== server.id)]
      state.selectedId = server.id
      state.page = 'servers'
      state.notice = '服务器已添加。地图列表准备接入后，就可以从这里开始游玩。'
    } catch (error) {
      state.error = String(error)
      state.page = 'add-server'
    } finally {
      state.busy = false
      render()
    }
  })
  document.querySelector('[data-action="discover"]')?.addEventListener('click', () => {
    state.notice = '地图发现协议尚未接入。启动器只会列出服务器明确开放给玩家启动器的地图。'
    render()
  })
  document.querySelector('[data-action="import"]')?.addEventListener('click', () => {
    state.notice = '本地资源包导入器将在签名描述符协议接入后启用。'
    render()
  })
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
