import type { PlayerAccountEventOptions } from '../player/account-events'
import { cacheClearedMessage } from './copy'

type StorageOptions = Pick<PlayerAccountEventOptions, 'state' | 'playerInvoke' | 'render'>

export async function refreshStorage({ state, playerInvoke, render }: StorageOptions): Promise<void> {
  state.storage = {
    loading: true,
    error: '',
    rows: state.storage?.rows || [],
    selectedServerId: state.storage?.selectedServerId || '',
    confirmServerId: '',
    confirmMapId: '',
  }
  render()
  try {
    const rows = await Promise.all(
      state.servers.map(async (server) => ({
        serverId: server.id,
        ...(await playerInvoke('cache_status', { serverId: server.id })),
      })),
    )
    state.storage.rows = rows.filter((row) => row.maps?.length || row.httpBytes > 0)
    if (!state.storage.rows.some((row) => row.serverId === state.storage.selectedServerId))
      state.storage.selectedServerId = ''
  } catch (error) {
    state.storage.error = error.message || '暂时无法统计本机缓存。'
  } finally {
    state.storage.loading = false
    render()
  }
}

export function bindStorageEvents(options: StorageOptions): void {
  const { state, playerInvoke, render } = options
  document.querySelectorAll<HTMLElement>('[data-open-storage-server]').forEach((node) =>
    node.addEventListener('click', () => {
      if (!state.storage) return
      state.storage.selectedServerId = node.dataset.openStorageServer || ''
      render()
    }),
  )
  document.querySelector('[data-storage-back]')?.addEventListener('click', () => {
    if (state.storage) {
      state.storage.selectedServerId = ''
      state.storage.confirmServerId = ''
      state.storage.confirmMapId = ''
    }
    render()
  })
  document.querySelectorAll<HTMLElement>('[data-clear-map-cache]').forEach((node) =>
    node.addEventListener('click', () => {
      if (state.storage && !state.busy) {
        state.storage.confirmMapId = node.dataset.clearMapCache || ''
        state.storage.confirmServerId = ''
      }
      render()
    }),
  )
  document.querySelectorAll<HTMLElement>('[data-clear-cache]').forEach((node) =>
    node.addEventListener('click', () => {
      if (state.storage && !state.busy) {
        state.storage.confirmServerId = node.dataset.clearCache || ''
        state.storage.confirmMapId = ''
      }
      render()
    }),
  )
  document.querySelector('[data-cancel-cache]')?.addEventListener('click', () => {
    if (state.storage) {
      state.storage.confirmServerId = ''
      state.storage.confirmMapId = ''
    }
    render()
  })
  document.querySelectorAll<HTMLElement>('[data-confirm-cache]').forEach((node) =>
    node.addEventListener('click', async () => {
      if (state.busy) return
      state.busy = true
      render()
      try {
        await playerInvoke('clear_resource_cache', { serverId: node.dataset.confirmCache })
        const server = state.servers.find((item) => item.id === node.dataset.confirmCache)
        state.notice = server ? cacheClearedMessage(server.endpoint) : '本机缓存已清理。'
      } catch (error) {
        state.error = error.message || '清理缓存失败，请稍后重试。'
      } finally {
        state.busy = false
        await refreshStorage(options)
      }
    }),
  )
  document.querySelectorAll<HTMLElement>('[data-confirm-map-cache]').forEach((node) =>
    node.addEventListener('click', async () => {
      const serverId = state.storage?.selectedServerId
      if (!serverId || state.busy) return
      const mapId = node.dataset.confirmMapCache
      state.busy = true
      render()
      try {
        await playerInvoke('clear_map_cache', { serverId, mapId })
        state.notice = '这张地图的缓存已清理，下次进入时会重新准备资源。'
      } catch (error) {
        state.error = error.message || '清理地图缓存失败，请稍后重试。'
      } finally {
        state.busy = false
        await refreshStorage(options)
      }
    }),
  )
}
