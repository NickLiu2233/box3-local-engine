import { prepareMapResources } from './services/map-package-flow.js'
import {
  playerLoginConnectionError,
  playerLoginErrorMessage,
} from './services/player-auth-errors.mjs'

export function bindEvents({ state, playerInvoke, remoteApi, selectedServer, refreshPlayerSession, applyTheme, render }) {
  document.querySelector('[data-dismiss-feedback]')?.addEventListener('click', () => {
    state.error = ''
    state.notice = ''
    render()
  })
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
    state.editingServerId = ''
    state.serverNameInput = ''
    state.error = ''
    state.notice = ''
    render()
  }))
  document.querySelectorAll('[data-select-server]').forEach((node) => node.addEventListener('click', async (event) => {
    if (event.target.closest('[data-remove-server]')) return
    const serverId = node.dataset.selectServer || ''
    state.selectedId = serverId
    state.page = 'servers'
    state.player = null
    state.worlds = []
    state.editingServerId = ''
    state.serverNameInput = ''
    state.serverBootstrap = { loading: true }
    state.error = ''
    state.notice = ''
    render()
    try {
      await playerInvoke('select_server', { serverId })
      const server = selectedServer()
      state.serverBootstrap = await playerInvoke('get_server_bootstrap', { endpoint: server?.endpoint || '' })
      await refreshPlayerSession(server)
    } catch (error) {
      state.serverBootstrap = { error: String(error) }
    } finally {
      render()
    }
  }))
  document.querySelectorAll('[data-remove-server]').forEach((node) => node.addEventListener('click', (event) => {
    event.stopPropagation()
    state.confirmRemoveServerId = node.dataset.removeServer || ''
    state.error = ''
    state.notice = ''
    render()
    document.querySelector('[data-cancel-remove-server]')?.focus()
  }))
  document.querySelector('[data-cancel-remove-server]')?.addEventListener('click', () => {
    state.confirmRemoveServerId = ''
    render()
  })
  document.querySelector('[data-remove-server-dialog-dismiss]')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) return
    state.confirmRemoveServerId = ''
    render()
  })
  document.querySelector('.confirm-dialog')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || state.busy) return
    state.confirmRemoveServerId = ''
    render()
  })
  document.querySelector('[data-confirm-remove-server]')?.addEventListener('click', async () => {
    const serverId = state.confirmRemoveServerId
    if (!serverId || state.busy) return
    state.busy = true
    state.error = ''
    state.notice = ''
    render()
    try {
      const result = await playerInvoke('remove_server', { serverId })
      state.servers = result.servers || []
      state.selectedId = result.selectedServerId || ''
      state.page = 'home'
      state.editingServerId = ''
      state.serverNameInput = ''
      state.serverBootstrap = null
      state.confirmRemoveServerId = ''
      state.notice = '服务器已从列表移除。'
    } catch (error) {
      state.error = String(error)
      state.confirmRemoveServerId = ''
    } finally {
      state.busy = false
      render()
    }
  })
  document.querySelector('[data-action="edit-server-name"]')?.addEventListener('click', () => {
    const server = selectedServer()
    if (!server) return
    state.editingServerId = server.id
    state.serverNameInput = server.name || server.endpoint
    state.error = ''
    state.notice = ''
    render()
    const input = document.querySelector('#server-name-input')
    input?.focus()
    input?.select()
  })
  document.querySelector('[data-action="cancel-server-name"]')?.addEventListener('click', () => {
    state.editingServerId = ''
    state.serverNameInput = ''
    state.error = ''
    render()
  })
  document.querySelector('#server-name-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name') || '')
    const serverId = state.editingServerId
    state.serverNameInput = name
    state.busy = true
    state.error = ''
    state.notice = ''
    render()
    try {
      const updated = await playerInvoke('rename_server', { serverId, name })
      state.servers = state.servers.map((server) => server.id === updated.id ? updated : server)
      state.selectedId = updated.id
      state.editingServerId = ''
      state.serverNameInput = ''
      state.notice = '服务器备注已更新。'
    } catch (error) {
      state.error = String(error)
    } finally {
      state.busy = false
      render()
    }
  })
  document.querySelector('#server-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const endpoint = new FormData(event.currentTarget).get('endpoint')
    state.endpointInput = String(endpoint || '')
    state.busy = true
    state.error = ''
    state.notice = ''
    render()
    try {
      const server = await playerInvoke('add_server', { endpoint })
      state.servers = [server, ...state.servers.filter((item) => item.id !== server.id)]
      state.selectedId = server.id
      state.page = 'servers'
      state.endpointInput = ''
      state.notice = '服务器已添加。'
      state.serverBootstrap = { loading: true }
      try {
        state.serverBootstrap = await playerInvoke('get_server_bootstrap', { endpoint: server.endpoint })
        await refreshPlayerSession(server)
      } catch (error) {
        state.serverBootstrap = { error: String(error) }
      }
    } catch (error) {
      state.error = String(error)
      state.page = 'add-server'
    } finally {
      state.busy = false
      render()
    }
  })
  document.querySelector('[data-action="discover"]')?.addEventListener('click', () => {
    const server = selectedServer()
    if (!server || state.busy) return
    state.busy = true
    state.serverBootstrap = { loading: true }
    render()
    playerInvoke('get_server_bootstrap', { endpoint: server.endpoint })
      .then(async (bootstrap) => { state.serverBootstrap = bootstrap; await refreshPlayerSession(server) })
      .catch((error) => { state.serverBootstrap = { error: String(error) } })
      .finally(() => { state.busy = false; render() })
  })
  document.querySelectorAll('[data-action="prepare-map"]').forEach((node) => node.addEventListener('click', async () => {
    const server = selectedServer()
    const mapId = node.dataset.mapId || ''
    if (!server || !mapId || state.busy || !state.serverBootstrap?.signingKey) return
    state.busy = true
    state.preparingMapId = mapId
    state.prepareProgress = { done: 0, total: 0 }
    state.error = ''
    state.notice = ''
    render()
    try {
      const bootstrap = await remoteApi.readBootstrap(server.endpoint)
      if (!bootstrap.supported || !bootstrap.resourceAccessEnabled || !bootstrap.signingKey) {
        throw new Error('该服务器当前未开放带签名的玩家地图资源。')
      }
      state.serverBootstrap = bootstrap
      const { descriptor, installed } = await prepareMapResources({
        server,
        mapId,
        bootstrap,
        remoteApi,
        onProgress: (progress) => { state.prepareProgress = progress; render() },
      })
      const key = `${server.id}:${mapId}`
      state.packageStates[key] = { ready: true, manifestDigest: installed.manifestDigest }
      const maps = await remoteApi.getMaps(server.endpoint)
      if (!maps.response.ok || !maps.data?.worlds?.some((world) => world.id === mapId || world.publicId === mapId)) {
        throw new Error('资源已准备，但当前账号暂时不能进入这张地图。')
      }
      await remoteApi.launchMap(server.id, descriptor, bootstrap.signingKey)
      state.notice = `“${descriptor.accessId}”的资源已验证，正在连接服务器…`
    } catch (error) {
      state.error = error.message || '地图资源准备失败，请稍后重试。'
    } finally {
      state.busy = false
      state.preparingMapId = ''
      state.prepareProgress = null
      render()
    }
  }))
  document.querySelector('#player-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const username = String(new FormData(form).get('username') || '').trim()
    const password = String(new FormData(form).get('password') || '')
    const server = selectedServer()
    if (!server || state.busy) return
    state.busy = true
    state.authError = ''
    state.mapsError = ''
    render()
    try {
      let loginResult
      try {
        loginResult = await remoteApi.login(server.endpoint, state.serverBootstrap, username, password)
      } catch (error) {
        state.authError = playerLoginConnectionError(error)
        return
      }
      const { data, error: apiError, response } = loginResult
      if (!response.ok || !data?.player) {
        state.authError = playerLoginErrorMessage(response.status, apiError)
        return
      }
      state.player = data.player
      const maps = await remoteApi.getMaps(server.endpoint)
      if (maps.response.status === 401) {
        state.player = null
        state.worlds = []
        state.authError = '服务器没有接受此登录状态，请重新登录。'
        return
      }
      if (!maps.response.ok) {
        state.mapsError = maps.error?.message || '登录成功，但暂时无法读取可玩地图。请稍后重试。'
        return
      }
      state.worlds = Array.isArray(maps.data?.worlds) ? maps.data.worlds : []
      state.mapsError = ''
      state.notice = `已登录到 ${server.name || server.endpoint}。`
    } catch (error) {
      if (state.player) {
        state.mapsError = error.message || '登录成功，但暂时无法读取可玩地图。请稍后重试。'
      } else {
        state.authError = playerLoginConnectionError(error)
      }
    } finally {
      state.busy = false
      render()
    }
  })
  document.querySelector('[data-action="logout"]')?.addEventListener('click', async () => {
    const server = selectedServer()
    if (!server || state.busy) return
    state.busy = true
    render()
    try {
      const { data, response } = await remoteApi.logout(server.endpoint, state.serverBootstrap)
      if (!response.ok) throw new Error(data?.message || `退出登录失败（HTTP ${response.status}）`)
      state.notice = '已退出当前服务器账号。'
    } catch (error) {
      state.error = error.message || '已清除此设备上的登录状态；服务器暂时无法确认退出。'
    } finally {
      try { await playerInvoke('clear_player_session', { serverId: server.id }) } catch { /* Always clear the UI session. */ }
      state.player = null
      state.worlds = []
      state.busy = false
      render()
    }
  })
  document.querySelectorAll('[data-action="launch-map"]').forEach((node) => node.addEventListener('click', async () => {
    const server = selectedServer()
    const mapId = node.dataset.mapId || ''
    const packageKey = `${server?.id || ''}:${mapId}`
    if (!server || !mapId || state.busy || !state.packageStates[packageKey]?.ready) return
    state.busy = true
    state.preparingMapId = mapId
    state.prepareProgress = { done: 0, total: 0 }
    state.error = ''
    state.notice = ''
    render()
    try {
      const bootstrap = await remoteApi.readBootstrap(server.endpoint)
      if (!bootstrap.supported || !bootstrap.resourceAccessEnabled) {
        throw new Error('该服务器当前未开放玩家启动器资源访问，无法从启动器开始游玩。')
      }
      state.serverBootstrap = bootstrap
      const session = await remoteApi.readSession(server.endpoint, bootstrap)
      if (!session.response.ok || !session.data?.player) {
        state.player = null
        throw new Error('当前服务器登录已失效，请重新登录后再开始游玩。')
      }
      state.player = session.data.player
      const maps = await remoteApi.getMaps(server.endpoint)
      if (!maps.response.ok || !maps.data?.worlds?.some((world) => world.id === mapId || world.publicId === mapId)) {
        throw new Error('该地图当前不再对你的账号开放。')
      }
      const { descriptor, installed } = await prepareMapResources({
        server,
        mapId,
        bootstrap,
        remoteApi,
        onProgress: (progress) => { state.prepareProgress = progress; render() },
      })
      state.packageStates[packageKey] = { ready: true, manifestDigest: installed.manifestDigest }
      await remoteApi.launchMap(server.id, descriptor, bootstrap.signingKey)
      state.notice = `正在连接“${descriptor.accessId}”…`
    } catch (error) {
      state.error = error.message || '无法启动地图，请稍后重试。'
    } finally {
      state.busy = false
      state.preparingMapId = ''
      state.prepareProgress = null
      render()
    }
  }))
}
