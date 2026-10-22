import fs from 'node:fs'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getPlayModel, playModelFile } from '../../../server/play-models'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'play' || !process.env.BOX_PLAY_LIBRARY_PATH)
    return res.status(404).end()
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  try {
    if (!getPlayModel(id, true)) return res.status(404).end()
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', 'application/vnd.box.voxaplay+json')
    const stream = fs.createReadStream(playModelFile(id))
    stream.on('error', () => res.destroy())
    return stream.pipe(res)
  } catch {
    return res.status(404).end()
  }
}
