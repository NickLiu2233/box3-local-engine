import type { NextApiRequest, NextApiResponse } from 'next';
import { currentPlayer } from '../../../server/local-player-identity';
import { authorizePlayerAuthRequest } from '../../../server/player-auth-security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (!authorizePlayerAuthRequest(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).end();
  }
  try {
    return res.status(200).json(await currentPlayer(req, res));
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'IP_BANNED') return res.status(403).json({ message: '当前 IP 地址已被封禁' });
    if (message === 'DEVICE_BANNED') return res.status(403).json({ message: '当前设备已被封禁' });
    return res.status(503).json({ message });
  }
}
