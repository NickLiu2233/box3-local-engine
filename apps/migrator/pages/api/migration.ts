import type { NextApiRequest, NextApiResponse } from 'next'
import { getMigration, startMigration } from '../../lib/migration-jobs'

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return res.status(202).json({
      job: startMigration({
        hash: req.body?.hash ? String(req.body.hash) : undefined,
        mapId: req.body?.mapId ? Number(req.body.mapId) : undefined,
        mode: req.body?.mode === 'play' ? 'play' : 'edit',
        projectName: typeof req.body?.projectName === 'string' ? req.body.projectName : undefined,
      }),
    })
  }
  if (req.method === 'GET') {
    const job = getMigration(String(req.query.id || ''))
    return job
      ? res.status(200).json({ job })
      : res.status(404).json({ message: '迁移任务不存在，迁移器服务可能已经重启，请重新开始' })
  }
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end()
}
