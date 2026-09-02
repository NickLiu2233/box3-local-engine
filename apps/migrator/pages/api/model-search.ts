import type { NextApiRequest, NextApiResponse } from 'next'
import { searchModels } from '../../lib/engine-api'

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  const modelName = String(req.body?.modelName || '').trim()
  const modelType = Number(req.body?.modelType || 0)
  const mapId = Number(req.body?.mapId || 0)
  if (!modelName) return res.status(400).json({ message: '请输入模型名称' })
  if (modelType !== 1 && modelType !== 2 && modelType !== 3) {
    return res.status(400).json({ message: '模型库类型无效' })
  }
  if (modelType === 3 && (!Number.isSafeInteger(mapId) || mapId <= 0)) {
    return res.status(400).json({ message: '共享模型库需要填写地图 ID' })
  }
  try {
    const result = await searchModels({
      modelName,
      modelType,
      mapId: modelType === 3 ? mapId : undefined,
      mode: req.body?.mode === 'play' ? 'play' : 'edit',
    })
    return res.status(200).json({ rows: result.rows || [], count: result.count || 0 })
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message || '模型搜索失败' })
  }
}
