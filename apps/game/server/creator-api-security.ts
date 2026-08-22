import type { NextApiRequest, NextApiResponse } from 'next';
import { hasAuthenticatedPlayer } from './player-service-client';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function hostnameOf(value: string | undefined) {
  if (!value) return '';
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return '';
  }
}

function isPrivateOrLoopbackHost(host: string) {
  const normalized = host.toLowerCase();
  if (LOOPBACK_HOSTS.has(normalized)) return true;

  const parts = normalized.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const octets = parts.map(Number);
    if (octets.some((octet) => octet > 255)) return false;
    return (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 169 && octets[1] === 254)
    );
  }

  // IPv6 loopback, unique-local (fc00::/7), and link-local (fe80::/10).
  return (
    normalized === '::1' ||
    /^f[cd][0-9a-f:]*$/i.test(normalized) ||
    /^fe[89ab][0-9a-f:]*$/i.test(normalized)
  );
}

function allowedCreatorHosts() {
  const configured = (process.env.BOX_CREATOR_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => hostnameOf(host.trim()))
    .filter(isPrivateOrLoopbackHost);
  return new Set([...LOOPBACK_HOSTS, ...configured]);
}

/**
 * Creator APIs can mutate and export editable projects. Keep them unavailable
 * in every other product and reject browser cross-site requests. The
 * deployment manager writes the configured public host into
 * BOX_CREATOR_ALLOWED_HOSTS; this guard remains defense in depth for both
 * local-only and LAN deployments.
 */
export function allowCreatorApi(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'creator') {
    res.status(404).end();
    return false;
  }

  const requestHost = hostnameOf(req.headers.host);
  if (!allowedCreatorHosts().has(requestHost)) {
    res.status(403).json({ message: 'Creator API is only available on an allowed host' });
    return false;
  }

  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite === 'cross-site') {
    res.status(403).json({ message: 'Cross-site creator requests are not allowed' });
    return false;
  }

  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        res.status(403).json({ message: 'Creator request origin does not match' });
        return false;
      }
    } catch {
      res.status(403).json({ message: 'Invalid creator request origin' });
      return false;
    }
  }

  return true;
}

export async function allowAuthenticatedCreatorApi(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!allowCreatorApi(req, res)) return false;
  const authenticated = await hasAuthenticatedPlayer(
    req.headers.cookie || '',
    req.socket.remoteAddress || '',
    String(req.headers['user-agent'] || ''),
  );
  if (!authenticated) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先注册或登录账号' });
    return false;
  }
  return true;
}
