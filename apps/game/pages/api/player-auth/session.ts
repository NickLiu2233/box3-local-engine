import type { NextApiRequest, NextApiResponse } from 'next';
import { currentPlayer } from '../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  try {
    return res.status(200).json(await currentPlayer(req, res));
  } catch (error) {
    return res.status(503).json({ message: (error as Error).message });
  }
}
