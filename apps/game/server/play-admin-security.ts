import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

export function isPlayAdminEnabled() {
  const mode = process.env.BOX_DEPLOYMENT_MODE;
  return (process.env.BOX_PLAY_ADMIN_TOKEN || '').length >= 16 && (
    mode === 'player-service' ||
    (mode === 'play' && Boolean(process.env.BOX_PLAY_LIBRARY_PATH))
  );
}

function requestAddress(req: NextApiRequest) {
  if (process.env.BOX_TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(',')[0]
      ?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || 'unknown';
}

function bearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

function tokensMatch(provided: string, expected: string) {
  const providedDigest = crypto.createHash('sha256').update(provided).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

export function allowPlayAdmin(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isPlayAdminEnabled()) {
    res.status(404).json({ message: '服主管理功能未开启' });
    return false;
  }

  const address = requestAddress(req);
  const now = Date.now();
  const current = failures.get(address);
  if (current && current.resetAt > now && current.count >= MAX_FAILURES) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({ message: '验证失败次数过多，请稍后再试' });
    return false;
  }

  const expected = process.env.BOX_PLAY_ADMIN_TOKEN || '';
  if (!tokensMatch(bearerToken(req), expected)) {
    const active = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + WINDOW_MS };
    active.count += 1;
    failures.set(address, active);
    res.status(401).json({ message: '服主密钥错误' });
    return false;
  }

  failures.delete(address);
  return true;
}

export function allowPlayLibraryAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (
    process.env.BOX_DEPLOYMENT_MODE !== 'play' ||
    !process.env.BOX_PLAY_LIBRARY_PATH
  ) {
    res.status(404).json({ message: '游玩地图库管理功能未开启' });
    return false;
  }
  return allowPlayAdmin(req, res);
}
