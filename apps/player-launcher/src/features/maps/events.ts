import { prepareMapLaunch } from './launch-flow'
import { canUseMapResourceCache } from '../../../shared/server-address'
import type { PlayerAccountEventOptions } from '../player/account-events'

export function bindMapEvents({
  state,
  playerInvoke,
  remoteApi,
  selectedServer,
  render,
}: PlayerAccountEventOptions): void {
  document.querySelectorAll<HTMLElement>('[data-action="prepare-map"]').forEach((node) =>
    node.addEventListener('click', async () => {
      const server = selectedServer()
      const mapId = node.dataset.mapId || ''
      if (!server || !mapId || state.busy || !state.serverBootstrap?.signingKey) return
      const accessId = state.worlds.find((world) => world.id === mapId)?.publicId || mapId
      if (state.activeGame?.serverId === server.id && state.activeGame.mapId === accessId) {
        if (await playerInvoke('focus_game', { serverId: server.id, mapId: accessId })) return
        state.activeGame = null
      }
      state.busy = true
      state.preparingMapId = mapId
      state.launchStage = '正在连接服务器…'
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
          onStage: (value) => {
            stage = value
            state.launchStage = value
            render()
          },
        })
        stage = '检查当前账号的地图进入权限'
        const maps = await remoteApi.getMaps(server.endpoint, { includeCovers: false })
        if (
          !maps.response.ok ||
          !maps.data?.worlds?.some((world) => world.id === mapId || world.publicId === mapId)
        ) {
          throw new Error('当前账号暂时不能进入这张地图。')
        }
        const mapName =
          state.worlds.find((world) => world.id === mapId || world.publicId === mapId)?.name ||
          descriptor.accessId
        stage = '安全启动地图窗口'
        state.launchStage = '正在打开游戏…'
        render()
        try {
          await remoteApi.launchMap(server.id, descriptor, bootstrap.signingKey, mapName, launchTicket)
        } catch (error) {
          const message = typeof error === 'string' ? error : error?.message || String(error ?? '')
          throw new Error(
            message ? `安全启动地图失败：${message}` : '安全启动地图失败（本机命令未返回错误说明）',
          )
        }
        state.notice =
          canUseMapResourceCache(server.endpoint)
            ? `“${mapName}”已验证，游戏将通过本机缓存静态资源…`
        : `“${mapName}”已验证并启动。当前连接为 HTTP，资源按需在线加载，不启用地图预下载缓存。`
      } catch (error) {
        const message = typeof error === 'string' ? error : error?.message
        const details = message || (error == null ? '' : String(error))
        state.error =
          details && details !== '地图启动准备失败，请稍后重试。'
            ? details
            : `${stage}阶段失败（没有收到详细错误信息）。`
      } finally {
        state.busy = false
        state.preparingMapId = ''
        state.launchStage = ''
        render()
      }
    }),
  )
}
