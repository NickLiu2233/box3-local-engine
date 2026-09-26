import type { NextApiRequest, NextApiResponse } from 'next'

import {
  getPlayResourceCacheSettings,
  updatePlayResourceCacheSettings,
} from '../../../server/play-resource-cache'
import { allowPlayLibraryAdmin } from '../../../server/play-admin-security'

/** Internal Play endpoint used by Player Admin's authenticated proxy. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).end()
  }
  if (!allowPlayLibraryAdmin(req, res)) return
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ resourceCache: getPlayResourceCacheSettings() })
    }
    return res.status(200).json({
      resourceCache: updatePlayResourceCacheSettings(req.body?.enabled),
    })
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message })
  }
}
