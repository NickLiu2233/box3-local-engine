import { bindServerEvents } from './features/servers/events'
import { bindPlayerAccountEvents } from './features/player/account-events'
import { bindLoginEvents } from './features/player/login-events'
import { bindMapEvents } from './features/maps/events'
import { bindStorageEvents, refreshStorage } from './features/storage/events'
import { bindMapSearch } from './features/maps/search-events'
import type { PlayerServer } from './types'

export function bindEvents({ state, playerInvoke, remoteApi, selectedServer, refreshPlayerSession, refreshRecentMap = async (_server: PlayerServer) => undefined, render }) {
  bindPlayerAccountEvents({ state, playerInvoke, remoteApi, selectedServer, render })
  bindStorageEvents({ state, playerInvoke, render })
  const mapSearch = document.querySelector<HTMLInputElement>('#map-search')
  if (mapSearch) bindMapSearch(mapSearch, state, render)
  document.querySelector('[data-dismiss-feedback]')?.addEventListener('click', () => {
    state.error = ''
    state.notice = ''
    render()
  })
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((node) =>
    node.addEventListener('click', async () => {
      if (state.busy) return
      const nextPage = node.dataset.nav || 'servers'
      if (state.page === nextPage) return
      state.loginDraft = undefined
      state.page = nextPage
      state.editingServerId = ''
      state.serverNameInput = ''
      state.error = ''
      state.notice = ''
      if (state.page === 'packages' && state.storage) state.storage.selectedServerId = ''
      render()
      if (state.page === 'packages') await refreshStorage({ state, playerInvoke, render })
    }),
  )
  bindServerEvents({ state, playerInvoke, remoteApi, selectedServer, refreshPlayerSession, render })
  bindMapEvents({ state, playerInvoke, remoteApi, selectedServer, render })
  bindLoginEvents({ state, remoteApi, selectedServer, refreshRecentMap, render })
}
