import type { NextApiRequest, NextApiResponse } from 'next';
import { registerPlayer } from '../../../server/local-player-identity';
import { authorizePlayerAuthRequest } from '../../../server/player-auth-security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (!authorizePlayerAuthRequest(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }
  try {
    return res.status(201).json({ player: await registerPlayer(req, res, req.body || {}) });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'IP_BANNED') return res.status(403).json({ message: '当前 IP 地址已被封禁' });
    if (message === 'DEVICE_BANNED') return res.status(403).json({ message: '当前设备已被封禁' });
    return res.status(400).json({ message });
  }
}
