import type { NextApiRequest, NextApiResponse } from 'next';

const localOriginPattern =
  /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i;

function configuredOrigins() {
  return [process.env.BOX_VOXA_PUBLIC_URL, process.env.BOX_VOXA_ALLOWED_ORIGINS]
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        return [new URL(value).origin];
      } catch {
        return [];
      }
    });
}

function isAllowedOrigin(origin: string) {
  if (localOriginPattern.test(origin)) return true;
  return configuredOrigins().includes(origin);
}

export function setLocalCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (!origin) return true;
  if (Array.isArray(origin) || !isAllowedOrigin(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  return true;
}
