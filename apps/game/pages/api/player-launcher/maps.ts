import type { NextApiRequest, NextApiResponse } from 'next'

import { requestPlayerServiceIp, resolvePlayerServiceIdentity, PlayerAuthenticationRequiredError } from '../../../server/player-service-client'
import { getPlayerLauncherWorlds } from '../../../server/player-launcher-worlds'

export function createPlayerLauncherMapsHandler(dependencies = {
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
