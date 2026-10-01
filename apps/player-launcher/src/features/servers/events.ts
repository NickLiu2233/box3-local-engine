import { getServerAddressNotice } from './address-notice'
import { playerServerAddError } from './errors'

export function bindServerEvents({
  state,
  playerInvoke,
  remoteApi,
  selectedServer,
  refreshPlayerSession,
  render,
}) {
  document.querySelectorAll<HTMLElement>('[data-select-server]').forEach((node) =>
    node.addEventListener('click', async (event) => {
      if (event.target instanceof Element && event.target.closest('[data-remove-server]')) return
      const serverId = node.dataset.selectServer || ''
      if (serverId === state.selectedId) {
        if (state.page === 'servers') return
        const server = selectedServer()
        state.page = 'servers'
        state.playerMenuOpen = false
        state.playerSettingsOpen = false
        if (state.serverBootstrap?.supported && !state.serverBootstrap.error) {
          render()
          return
        }
        state.serverBootstrap = { loading: true }
        state.error = ''
        state.notice = ''
        render()
        try {
          state.serverBootstrap = await playerInvoke('get_server_bootstrap', {
            endpoint: server?.endpoint || '',
          })
          await refreshPlayerSession(server)
        } catch (error) {
          state.serverBootstrap = { error: String(error) }
        } finally {
          render()
        }
        return
      }
      state.selectedId = serverId
      state.mapSearch = ''
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
        state.serverBootstrap = await playerInvoke('get_server_bootstrap', {
          endpoint: server?.endpoint || '',
        })
        await refreshPlayerSession(server)
      } catch (error) {
        state.serverBootstrap = { error: String(error) }
      } finally {
        render()
      }
    }),
  )
  document.querySelectorAll<HTMLElement>('[data-remove-server]').forEach((node) =>
    node.addEventListener('click', (event) => {
      event.stopPropagation()
      if (state.busy) return
      state.confirmRemoveServerId = node.dataset.removeServer || ''
      state.error = ''
      state.notice = ''
      render()
      document.querySelector<HTMLElement>('[data-cancel-remove-server]')?.focus()
    }),
  )
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
      state.servers = state.servers.map((server) => (server.id === updated.id ? updated : server))
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
  document
    .querySelector('[data-server-address-dialog]')
    ?.addEventListener('keydown', (event: KeyboardEvent) => {
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
      .then(async (bootstrap) => {
        state.serverBootstrap = bootstrap
        await refreshPlayerSession(server)
      })
      .catch((error) => {
        state.serverBootstrap = { error: String(error) }
      })
      .finally(() => {
        state.busy = false
        render()
      })
  })
}
