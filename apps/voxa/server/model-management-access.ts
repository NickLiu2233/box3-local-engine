import { timingSafeEqual } from 'node:crypto';

import type { NextApiRequest, NextApiResponse } from 'next';

type RuntimeIdentity = {
  creatorAccess?: unknown;
  creatorPermissions?: unknown;
};

type RuntimeIdentityResponse = {
  identity?: RuntimeIdentity;
};

function playerServiceURL() {
  return String(process.env.BOX_PLAYER_SERVICE_INTERNAL_URL || '').replace(/\/$/, '');
}

function permissionSecret() {
  return String(process.env.PERMISSION_TOKEN_SECRET || '');
}

function equalSecrets(left: string, right: string) {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);
  return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
}

function requestProtocol(req: NextApiRequest) {
  const forwarded = req.headers['x-forwarded-proto'];
  return Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim() || 'http';
}

function copySessionCookies(response: Response, res: NextApiResponse) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.() || [];
  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
  else {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) res.setHeader('Set-Cookie', setCookie);
  }
}

export function canManageVoxaModels(identity: RuntimeIdentity) {
  return identity.creatorAccess === true
    && Array.isArray(identity.creatorPermissions)
    && identity.creatorPermissions.includes('models.manage');
}

/**
 * Game runtimes use the shared deployment secret for the two internal model
 * creation paths. Browser writes must instead carry a real player session
 * with the explicit models.manage creator capability.
 */
export function isTrustedVoxaInternalRequest(req: NextApiRequest) {
  const authorization = req.headers.authorization;
  const supplied = Array.isArray(authorization) ? authorization[0] : authorization || '';
  const match = /^Bearer (.+)$/.exec(supplied);
  const secret = permissionSecret();
  return Boolean(match && secret && equalSecrets(match[1], secret));
}

export type VoxaModelManagementAccess = 'allowed' | 'unauthenticated' | 'denied' | 'unavailable';

export async function resolveVoxaModelManagement(
  req: NextApiRequest,
  res: NextApiResponse,
) : Promise<VoxaModelManagementAccess> {
  if (isTrustedVoxaInternalRequest(req)) return 'allowed';

  const serviceURL = playerServiceURL();
  const secret = permissionSecret();
  if (!serviceURL || !secret) {
    return 'unavailable';
  }

  try {
    const response = await fetch(`${serviceURL}/api/player-internal/runtime-identity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        Cookie: String(req.headers.cookie || ''),
        'X-Box-Player-IP': req.socket.remoteAddress || '',
        'X-Box-Player-Proto': requestProtocol(req),
        'X-Box-Player-User-Agent': String(req.headers['user-agent'] || '').slice(0, 512),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    copySessionCookies(response, res);
    const data = await response.json().catch(() => ({})) as RuntimeIdentityResponse;
    if (response.status === 401) {
      return 'unauthenticated';
    }
    if (!response.ok) {
      return 'unavailable';
    }
    return canManageVoxaModels(data.identity || {}) ? 'allowed' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function requireVoxaModelManagement(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const access = await resolveVoxaModelManagement(req, res);
  if (access === 'allowed') return true;
  if (access === 'unauthenticated') {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先登录后再使用 VOXA' });
  } else if (access === 'denied') {
    res.status(403).json({ code: 'CREATOR_PERMISSION_DENIED', message: '当前账号没有管理模型的权限' });
  } else {
    res.status(503).json({ code: 'PLAYER_SERVICE_UNAVAILABLE', message: '无法验证模型管理权限' });
  }
  return false;
}
