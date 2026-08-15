import type { NextApiRequest, NextApiResponse } from 'next';

import { cleanupExpiredPlayerSessions } from '../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const context = await authorizePlayerAdmin(req, res, 'owner');
  if (!context) return;
  try {
    if (req.body?.action === 'cleanup-expired-sessions') {
      return res.status(200).json(await cleanupExpiredPlayerSessions(context));
    }
    return res.status(400).json({ message: '不支持的维护操作' });
  } catch (error) {
    return res.status(503).json({ message: (error as Error).message });
  }
}
