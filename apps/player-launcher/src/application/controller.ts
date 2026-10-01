import { normalizeServerAddress } from '../../shared/server-address'
import type { PlayerLauncherState, PlayerServer, RemoteApi, PlayerInvoke } from '../types'

interface ControllerOptions {
  state: PlayerLauncherState
  remoteApi: RemoteApi
  invoke: PlayerInvoke
  isDesktopLauncher: () => boolean
  selectedServer: () => PlayerServer | null
}

export function createLauncherController({
  state,
  remoteApi,
  invoke,
  isDesktopLauncher,
  selectedServer,
}: ControllerOptions) {
  const previewServers: PlayerServer[] = []
  async function refreshPlayerSession(server: PlayerServer | null = selectedServer()): Promise<void> {
    state.player = null
    state.worlds = []
    state.recentWorld = undefined
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
      state.loginDraft = undefined
    }
    try {
      const { data, response, error: apiError } = await remoteApi.getMaps(server.endpoint)
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
        throw new Error(apiError?.message || `读取可玩地图失败（HTTP ${response.status}）`)
      }
      state.worlds = Array.isArray(data?.worlds) ? data.worlds : []
      state.mapsError = ''
      await refreshRecentMap(server)
    } catch (error) {
      state.mapsError = error.message || '读取可玩地图失败。'
    }
  }

  async function refreshRecentMap(server: PlayerServer): Promise<void> {
    if (!isDesktopLauncher()) return
    try {
      const recent = (await invoke('recent_map', { serverId: server.id })) as
        | { permanentMapId: string; name: string; releaseVersion: string }
        | null
      const world = recent && state.worlds.find((item) => item.permanentMapId === recent.permanentMapId)
      if (world) state.recentWorld = { serverId: server.id, mapId: world.id, name: world.name, version: world.version || recent.releaseVersion }
    } catch {
      state.recentWorld = undefined
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
      const endpoint = normalizeServerAddress(String(payload.endpoint || ''))
      const parsed = new URL(endpoint)
      try {
        await remoteApi.verifyServer(endpoint)
      } catch (error) {
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

  return { refreshPlayerSession, refreshRecentMap, playerInvoke }
}
