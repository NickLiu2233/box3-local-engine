import type { NextApiRequest, NextApiResponse } from 'next';
import { loginPlayer } from '../../../server/local-player-identity';

const failures = new Map<string, { count: number; resetAt: number }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const address = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attempt = failures.get(address);
  if (attempt && attempt.resetAt > now && attempt.count >= 10) {
    res.setHeader('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)));
    return res.status(429).json({ message: '登录失败次数过多，请稍后再试' });
  }
  try {
    const player = await loginPlayer(req, res, req.body || {});
    failures.delete(address);
    return res.status(200).json({ player });
  } catch (error) {
    const active = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 5 * 60_000 };
    active.count += 1;
    failures.set(address, active);
    return res.status(401).json({ message: (error as Error).message });
  }
}
