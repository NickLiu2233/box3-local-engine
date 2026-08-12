import type { NextApiRequest, NextApiResponse } from 'next';
import { logoutPlayer } from '../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  await logoutPlayer(req, res);
  return res.status(200).json({ loggedOut: true });
}
