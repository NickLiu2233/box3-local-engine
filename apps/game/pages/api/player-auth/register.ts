import type { NextApiRequest, NextApiResponse } from 'next';
import {
  checkAuthRateLimit,
  recordAuthRateLimitAttempt,
} from '../../../server/auth-rate-limit';
import { requestClientAddress } from '../../../server/client-address';
import { registerPlayer } from '../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const address = requestClientAddress(req);
  const limit = checkAuthRateLimit('registration', address);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    return res.status(429).json({ message: '该网络注册次数过多，请稍后再试' });
  }
  // Registration is intentionally counted whether it succeeds or fails, so
  // invalid payloads cannot be used to bypass abuse protection.
  recordAuthRateLimitAttempt('registration', address);
  try {
    return res.status(201).json({ player: await registerPlayer(req, res, req.body || {}) });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
