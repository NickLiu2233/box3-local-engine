import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminActionContext, isInternalIdentityRequest } from '../../../server/local-player-identity'
import { moderationCommandSchema, scriptModerationService } from '../../../server/script-moderation-service'
import { sendPlayerAdminApiError, applyPlayerAdminSecurityHeaders } from '../../../server/player-admin-authorization'

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  applyPlayerAdminSecurityHeaders(res)
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end()
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  if (!isInternalIdentityRequest(req)) return res.status(401).json({ message: '内部鉴权失败' })
  const parsed = moderationCommandSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: '脚本管理参数无效' })
  try {
    return res.status(200).json(await scriptModerationService.execute(parsed.data, createAdminActionContext(req)))
  } catch (error) {
    return sendPlayerAdminApiError(res, error, 'Script moderation failed')
  }
}
