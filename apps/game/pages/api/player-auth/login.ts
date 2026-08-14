import type { NextApiRequest, NextApiResponse } from 'next';
import {
  checkAuthRateLimit,
  recordAuthRateLimitAttempt,
  resetAuthRateLimit,
} from '../../../server/auth-rate-limit';
import { requestClientAddress } from '../../../server/client-address';
import { loginPlayer } from '../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const address = requestClientAddress(req);
  const limit = checkAuthRateLimit('login', address);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    return res.status(429).json({ message: '登录失败次数过多，请稍后再试' });
  }
  try {
    const player = await loginPlayer(req, res, req.body || {});
    resetAuthRateLimit('login', address);
    return res.status(200).json({ player });
  } catch (error) {
    recordAuthRateLimitAttempt('login', address);
    return res.status(401).json({ message: (error as Error).message });
  }
}
