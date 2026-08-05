import type { NextApiRequest, NextApiResponse } from 'next';

const localOriginPattern =
  /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i;

export function setLocalCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (!origin) return true;
  if (!localOriginPattern.test(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  return true;
}
