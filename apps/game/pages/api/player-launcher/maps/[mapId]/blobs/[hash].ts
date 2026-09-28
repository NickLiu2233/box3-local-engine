import fs from 'fs'
import type { NextApiRequest, NextApiResponse } from 'next'

import { PlayerAuthenticationRequiredError, requestPlayerServiceIp, resolvePlayerServiceIdentity } from '../../../../../../server/player-service-client'
import { getPlayLauncherAccessSettings, getPlayerLauncherWorlds } from '../../../../../../server/play-launcher-access'
import { getPlayerLauncherBlobPath, verifyPlayerLauncherDownloadTicket } from '../../../../../../server/player-launcher-map-packages'

export const config = { api: { responseLimit: false } }

export function createPlayerLauncherBlobHandler(dependencies = {
  readSettings: getPlayLauncherAccessSettings,
  getWorlds: getPlayerLauncherWorlds,
  getBlob: getPlayerLauncherBlobPath,
  resolveIdentity: resolvePlayerServiceIdentity,
  getPlayerIp: requestPlayerServiceIp,
}) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (process.env.BOX_DEPLOYMENT_MODE !== 'play') return res.status(404).end()
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).end()
    }
    let enabled: boolean
    try { enabled = dependencies.readSettings().enabled } catch {
      return res.status(503).json({ message: '无法读取玩家启动器开放状态' })
    }
    if (!enabled) return res.status(403).json({ code: 'PLAYER_LAUNCHER_RESOURCES_DISABLED', message: '该服务器未开放玩家启动器资源访问' })
    let identity
    try {
      ({ identity } = await dependencies.resolveIdentity(req, res, dependencies.getPlayerIp(req)))
    } catch (error) {
      if (error instanceof PlayerAuthenticationRequiredError) return res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先登录后下载地图资源' })
      return res.status(503).json({ message: '暂时无法验证玩家登录状态' })
    }
    const mapId = Array.isArray(req.query.mapId) ? req.query.mapId[0] : req.query.mapId
    const hash = Array.isArray(req.query.hash) ? req.query.hash[0] : req.query.hash
    const digest = Array.isArray(req.query.digest) ? req.query.digest[0] : req.query.digest
    const ticket = Array.isArray(req.query.ticket) ? req.query.ticket[0] : req.query.ticket
    const world = mapId && dependencies.getWorlds().find((entry) => entry.id === mapId || entry.publicId === mapId)
    if (!mapId || !hash || !digest || !ticket || !world) {
      return res.status(404).json({ message: '资源不存在或当前账号无权下载' })
    }
    try {
      const result = dependencies.getBlob(world.id, hash)
      if (result.descriptor.manifestDigest !== digest) return res.status(409).json({ code: 'MAP_PACKAGE_UPDATED', message: '地图资源已更新，请重新获取资源清单' })
      if (!verifyPlayerLauncherDownloadTicket(ticket, {
        subjectId: identity.subjectId,
        permanentMapId: result.descriptor.permanentMapId,
        manifestDigest: result.descriptor.manifestDigest,
      })) return res.status(403).json({ code: 'DOWNLOAD_TICKET_INVALID', message: '地图下载授权已失效，请重新准备资源' })
      const stat = fs.statSync(result.path)
      const rangeHeader = req.headers.range
      const range = Array.isArray(rangeHeader) ? rangeHeader[0] : rangeHeader
      let start = 0
      let status = 200
      if (range) {
        const match = /^bytes=(\d+)-$/.exec(range)
        if (!match) {
          res.setHeader('Content-Range', `bytes */${stat.size}`)
          return res.status(416).end()
        }
        start = Number(match[1])
        if (!Number.isSafeInteger(start) || start >= stat.size) {
          res.setHeader('Content-Range', `bytes */${stat.size}`)
          return res.status(416).end()
        }
        status = 206
        res.setHeader('Content-Range', `bytes ${start}-${stat.size - 1}/${stat.size}`)
      }
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Type', result.asset.contentType)
      res.setHeader('Content-Length', String(stat.size - start))
      const stream = fs.createReadStream(result.path, { start })
      stream.on('error', () => {
        if (!res.headersSent) res.status(503).json({ message: '读取地图资源失败' })
        else res.end()
      })
      res.status(status)
      stream.pipe(res)
      return undefined
    } catch {
      return res.status(404).json({ message: '资源不存在或不属于该地图' })
    }
  }
}

export default createPlayerLauncherBlobHandler()
