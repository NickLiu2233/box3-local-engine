import type { NextApiRequest, NextApiResponse } from 'next'

import { requestPlayerServiceIp, resolvePlayerServiceIdentity, PlayerAuthenticationRequiredError } from '../../../server/player-service-client'
import { getPlayLauncherAccessSettings, getPlayerLauncherWorlds } from '../../../server/play-launcher-access'

/** Map discovery is gated separately from the existing browser resource cache. */
export function createPlayerLauncherMapsHandler(dependencies = {
  readSettings: getPlayLauncherAccessSettings,
  getWorlds: getPlayerLauncherWorlds,
  resolveIdentity: resolvePlayerServiceIdentity,
  getPlayerIp: requestPlayerServiceIp,
}) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store')
    if (process.env.BOX_DEPLOYMENT_MODE !== 'play') return res.status(404).end()
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).end()
    }

    let enabled: boolean
    try {
      enabled = dependencies.readSettings().enabled
    } catch {
      return res.status(503).json({ message: '无法读取玩家启动器开放状态' })
    }
    if (!enabled) {
      return res.status(403).json({
        code: 'PLAYER_LAUNCHER_RESOURCES_DISABLED',
        message: '该服务器未开放玩家启动器资源访问',
      })
    }

    try {
      await dependencies.resolveIdentity(req, res, dependencies.getPlayerIp(req))
    } catch (error) {
      if (error instanceof PlayerAuthenticationRequiredError) {
        return res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先登录后查看可游玩的地图' })
      }
      return res.status(503).json({ message: '暂时无法验证玩家登录状态' })
    }

    const worlds = dependencies.getWorlds()
      .map(({ id, permanentMapId, publicId, name, author, description, cover, loadingCover, version }) => ({
        id,
        permanentMapId,
        publicId,
        name,
        author,
        description,
        cover,
        loadingCover,
        version,
      }))
    return res.status(200).json({ worlds })
  }
}

export default createPlayerLauncherMapsHandler()
