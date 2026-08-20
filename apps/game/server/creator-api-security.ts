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

function allowedCreatorHosts() {
  const configured = (process.env.BOX_CREATOR_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => hostnameOf(host.trim()))
    .filter(Boolean);
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
