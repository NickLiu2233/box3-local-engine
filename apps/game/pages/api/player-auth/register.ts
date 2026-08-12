import type { NextApiRequest, NextApiResponse } from 'next';
import { registerPlayer } from '../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  try {
    return res.status(201).json({ player: await registerPlayer(req, res, req.body || {}) });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
