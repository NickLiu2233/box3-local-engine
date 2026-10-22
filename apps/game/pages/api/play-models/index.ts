import type { NextApiRequest, NextApiResponse } from 'next'
import { listPlayModels } from '../../../server/play-models'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play' || !process.env.BOX_PLAY_LIBRARY_PATH)
    return res.status(404).end()
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ models: listPlayModels(true) })
}
