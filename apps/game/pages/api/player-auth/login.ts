import type { NextApiRequest, NextApiResponse } from 'next';
import {
  clearSuccessfulPlayerLoginRateLimits,
  consumePlayerLoginRateLimit,
} from '../../../server/auth-rate-limit';
import { loginPlayer, PlayerBannedError } from '../../../server/local-player-identity';
import {
  authorizePlayerAuthRequest,
  playerAuthClientAddress,
} from '../../../server/player-auth-security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (!authorizePlayerAuthRequest(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }
  const address = playerAuthClientAddress(req);
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const limit = await consumePlayerLoginRateLimit(address, username);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    return res.status(429).json({ message: '登录失败次数过多，请稍后再试' });
  }
  try {
    const player = await loginPlayer(req, res, req.body || {});
    await clearSuccessfulPlayerLoginRateLimits(address, username);
    return res.status(200).json({ player });
  } catch (error) {
    if (error instanceof PlayerBannedError) {
      return res.status(403).json({
        message: '该玩家已被封禁',
        banReason: error.reason,
        bannedUntil: error.bannedUntil,
      });
    }
    const message = (error as Error).message;
    if (message === 'IP_BANNED') return res.status(403).json({ message: '当前 IP 地址已被封禁' });
    if (message === 'DEVICE_BANNED') return res.status(403).json({ message: '当前设备已被封禁' });
    return res.status(401).json({ message });
  }
}
