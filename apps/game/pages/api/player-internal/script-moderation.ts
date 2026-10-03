import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminActionContext } from '../../../server/local-player-identity'
import { moderationRuntimeIdentity } from '../../../server/moderation-runtime-authorization'
import { moderationCommandSchema, scriptModerationService } from '../../../server/script-moderation-service'
import { applyPlayerAdminSecurityHeaders } from '../../../server/player-admin-authorization'
import { PlayerAdminRequestError } from '../../../server/player-admin-errors'
import { moderationError } from '@box/schema/api/js/moderation-error'

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  applyPlayerAdminSecurityHeaders(res)
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).json(moderationError(404, '地图管理服务不存在'))
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json(moderationError(405, '仅支持 POST 请求', 'MODERATION_PARAMS_INVALID'))
  }
  const runtime = moderationRuntimeIdentity(req)
  if (!runtime) return res.status(401).json(moderationError(401, '地图实例鉴权失败'))
  const parsed = moderationCommandSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json(moderationError(400, '脚本管理参数无效'))
  if (runtime.mapId !== parsed.data.mapId)
    return res.status(403).json(moderationError(403, '地图实例权限范围不匹配'))
  try {
    return res.status(200).json(await scriptModerationService.execute(parsed.data, createAdminActionContext(req), runtime.mode, runtime))
  } catch (error) {
    if (error instanceof PlayerAdminRequestError) {
      if (error.retryAfterSeconds) res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return res.status(error.status).json(moderationError(error.status, error.message))
    }
    console.error('Script moderation failed:', error instanceof Error ? error.message : String(error))
    return res.status(503).json(moderationError(503, '地图管理服务暂时不可用'))
  }
}
