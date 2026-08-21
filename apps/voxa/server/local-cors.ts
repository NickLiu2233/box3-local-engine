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

function originForRequestHost(req: NextApiRequest) {
  const host = req.headers.host;
  if (!host || Array.isArray(host)) return undefined;

  // VOXA is often opened directly through a LAN address or a reverse proxy.
  // In those cases the browser origin and the incoming Host are the same,
  // but the host is intentionally not known when the container is built.
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(',')[0]?.trim();
  const scheme = protocol === 'https' ? 'https' : 'http';

  try {
    return new URL(`${scheme}://${host}`).origin;
  } catch {
    return undefined;
  }
}

export function setLocalCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (!origin) return true;
  if (Array.isArray(origin)) return false;
  const sameVoxaHost = origin === originForRequestHost(req);
  if (!sameVoxaHost && !isAllowedOrigin(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  return true;
}
