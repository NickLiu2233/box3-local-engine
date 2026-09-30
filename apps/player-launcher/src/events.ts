import { prepareMapLaunch } from './services/map-launch-flow'
import { getServerAddressNotice } from './services/server-address-notice'
import { playerServerAddError } from './services/server-errors'
import { bindPlayerAccountEvents } from './events/player-account-events'
import {
  playerLoginConnectionError,
  playerLoginErrorMessage,
} from './services/player-auth-errors'

export function bindEvents({ state, playerInvoke, remoteApi, selectedServer, refreshPlayerSession, applyTheme, render }) {
  bindPlayerAccountEvents({ state, playerInvoke, remoteApi, selectedServer, render })
  document.querySelector('[data-dismiss-feedback]')?.addEventListener('click', () => {
    state.error = ''
    state.notice = ''
    render()
  })
  document.querySelector('#theme-trigger')?.addEventListener('click', () => {
    state.themeMenuOpen = !state.themeMenuOpen
    render()
  })
  document.querySelectorAll<HTMLElement>('[data-theme-choice]').forEach((node) => node.addEventListener('click', () => {
    applyTheme(node.dataset.themeChoice)
    state.themeMenuOpen = false
    render()
  }))
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((node) => node.addEventListener('click', () => {
    state.page = node.dataset.nav || 'servers'
    state.editingServerId = ''
    state.serverNameInput = ''
    state.error = ''
    state.notice = ''
    render()
  }))
  document.querySelectorAll<HTMLElement>('[data-select-server]').forEach((node) => node.addEventListener('click', async (event) => {
    if (event.target instanceof Element && event.target.closest('[data-remove-server]')) return
    const serverId = node.dataset.selectServer || ''
    if (serverId === state.selectedId) {
      if (state.page !== 'servers') {
        state.page = 'servers'
        state.playerMenuOpen = false
        state.playerSettingsOpen = false
        render()
      }
      return
    }
    state.selectedId = serverId
    state.page = 'servers'
    state.player = null
    state.worlds = []
    state.playerMenuOpen = false
    state.playerSettingsOpen = false
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
  document.querySelectorAll<HTMLElement>('[data-remove-server]').forEach((node) => node.addEventListener('click', (event) => {
    event.stopPropagation()
    if (state.busy) return
    state.confirmRemoveServerId = node.dataset.removeServer || ''
    state.error = ''
    state.notice = ''
    render()
    document.querySelector<HTMLElement>('[data-cancel-remove-server]')?.focus()
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
  document.querySelector('.confirm-dialog')?.addEventListener('keydown', (event: KeyboardEvent) => {
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
      state.notice = '服务器已从列表移除，本地地图数据已删除。'
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
    const input = document.querySelector<HTMLInputElement>('#server-name-input')
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
    const name = String(new FormData(event.currentTarget as HTMLFormElement).get('name') || '')
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
    const endpoint = new FormData(event.currentTarget as HTMLFormElement).get('endpoint')
    state.endpointInput = String(endpoint || '')
    const notice = getServerAddressNotice(state.endpointInput)
    if (notice) {
      state.pendingServerEndpoint = state.endpointInput
      state.serverAddressNotice = notice
      state.error = ''
      state.notice = ''
      render()
      document.querySelector<HTMLElement>('[data-cancel-server-address]')?.focus()
      return
    }
    await addServer(state.endpointInput)
  })
  document.querySelector('[data-cancel-server-address]')?.addEventListener('click', () => {
    state.pendingServerEndpoint = ''
    state.serverAddressNotice = null
    render()
    document.querySelector<HTMLInputElement>('#server-endpoint')?.focus()
  })
  document.querySelector('[data-server-address-dismiss]')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) return
    state.pendingServerEndpoint = ''
    state.serverAddressNotice = null
    render()
  })
  document.querySelector('[data-server-address-dialog]')?.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || state.busy) return
    state.pendingServerEndpoint = ''
    state.serverAddressNotice = null
    render()
  })
  document.querySelector('[data-confirm-server-address]')?.addEventListener('click', async () => {
    const endpoint = state.pendingServerEndpoint
    if (!endpoint || state.busy) return
    state.pendingServerEndpoint = ''
    state.serverAddressNotice = null
    await addServer(endpoint)
  })

  async function addServer(endpoint: string): Promise<void> {
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
      state.error = playerServerAddError(error)
      state.page = 'add-server'
    } finally {
      state.busy = false
      render()
    }
  }
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
  document.querySelectorAll<HTMLElement>('[data-action="prepare-map"]').forEach((node) => node.addEventListener('click', async () => {
    const server = selectedServer()
    const mapId = node.dataset.mapId || ''
    if (!server || !mapId || state.busy || !state.serverBootstrap?.signingKey) return
    state.busy = true
    state.preparingMapId = mapId
    state.error = ''
    state.notice = ''
    render()
    let stage = '检查服务器支持信息'
    try {
      const bootstrap = await remoteApi.readBootstrap(server.endpoint)
      if (!bootstrap.supported || !bootstrap.signingKey) {
        throw new Error('服务器未提供有效的地图资源签名信息。')
      }
      state.serverBootstrap = bootstrap
      stage = '验证地图并准备启动授权'
      const { descriptor, launchTicket } = await prepareMapLaunch({
        server,
        mapId,
        bootstrap,
        remoteApi,
        onStage: (value) => { stage = value },
      })
      stage = '检查当前账号的地图进入权限'
      const maps = await remoteApi.getMaps(server.endpoint)
      if (!maps.response.ok || !maps.data?.worlds?.some((world) => world.id === mapId || world.publicId === mapId)) {
        throw new Error('当前账号暂时不能进入这张地图。')
      }
      const mapName = state.worlds.find((world) => world.id === mapId || world.publicId === mapId)?.name
        || descriptor.accessId
      stage = '安全启动地图窗口'
      try {
        await remoteApi.launchMap(server.id, descriptor, bootstrap.signingKey, mapName, launchTicket)
      } catch (error) {
        const message = typeof error === 'string' ? error : error?.message || String(error ?? '')
        throw new Error(message ? `安全启动地图失败：${message}` : '安全启动地图失败（本机命令未返回错误说明）')
      }
      state.notice = `“${descriptor.accessId}”已验证，游戏将通过本机 Service Worker 缓存静态资源…`
    } catch (error) {
      const message = typeof error === 'string' ? error : error?.message
      const details = message || (error == null ? '' : String(error))
      state.error = details && details !== '地图启动准备失败，请稍后重试。'
        ? details
        : `${stage}阶段失败（没有收到详细错误信息）。`
    } finally {
      state.busy = false
      state.preparingMapId = ''
      render()
    }
  }))
  document.querySelector('#player-login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const username = String(new FormData(form as HTMLFormElement).get('username') || '').trim()
    const password = String(new FormData(form as HTMLFormElement).get('password') || '')
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
      state.playerMenuOpen = false
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
}
