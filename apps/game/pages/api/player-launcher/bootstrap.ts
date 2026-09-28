import type { NextApiRequest, NextApiResponse } from 'next'

import { getPlayLauncherAccessSettings } from '../../../server/play-launcher-access'
import { getPlayResourceSigningIdentity } from '../../../server/play-resource-cache'

function playerLoginApiUrl() {
  try {
    const configured = new URL(String(process.env.BOX_PLAYER_LOGIN_URL || '').trim())
    if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) return ''
    return new URL('/api/auth/login', configured.origin).toString()
  } catch {
    return ''
  }
}

/** Safe, unauthenticated handshake: disclose no maps or resource URLs here. */
export function createPlayerLauncherBootstrapHandler(
  readSettings: typeof getPlayLauncherAccessSettings = getPlayLauncherAccessSettings,
  readSigningIdentity: typeof getPlayResourceSigningIdentity = getPlayResourceSigningIdentity,
) {
  return function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store')
    if (process.env.BOX_DEPLOYMENT_MODE !== 'play') return res.status(404).end()
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).end()
    }
    try {
      const access = readSettings()
      return res.status(200).json({
        protocolVersion: 1,
        serverName: String(process.env.BOX_PLAYER_LAUNCHER_SERVER_NAME || '').trim(),
        resourceAccessEnabled: access.enabled,
        loginRequired: true,
        loginApiUrl: playerLoginApiUrl(),
        signingKey: access.enabled ? readSigningIdentity() : null,
      })
    } catch {
      return res.status(503).json({ message: '无法读取玩家启动器开放状态' })
    }
  }
}

export default createPlayerLauncherBootstrapHandler()
