import type { NextApiRequest, NextApiResponse } from 'next';
import { allowPlayAdmin } from '../../../../server/play-admin-security';
import { getPlayerAdminOverview } from '../../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  if (!allowPlayAdmin(req, res)) return;
  try {
    return res.status(200).json(await getPlayerAdminOverview());
  } catch (error) {
    return res.status(503).json({ message: (error as Error).message });
  }
}
