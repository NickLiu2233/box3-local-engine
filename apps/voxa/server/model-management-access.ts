import { timingSafeEqual } from 'node:crypto';

import type { NextApiRequest, NextApiResponse } from 'next';

type RuntimeIdentity = {
  subjectId?: string;
  creatorAccess?: unknown;
  creatorPermissions?: unknown;
};

export type VoxaCreatorCapability =
  | 'projects.create'
  | 'projects.read'
  | 'projects.edit'
  | 'projects.export'
  | 'projects.delete'
  | 'scene.capture'
  | 'models.manage';

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
  return canAccessVoxaModels(identity, 'models.manage');
}

export function canAccessVoxaModels(
  identity: RuntimeIdentity,
  capability: VoxaCreatorCapability | readonly VoxaCreatorCapability[],
) {
  const required = Array.isArray(capability) ? capability : [capability];
  const permissions = identity.creatorPermissions;
  if (identity.creatorAccess !== true || !Array.isArray(permissions)) return false;
  return required.some((item) => {
    if (item === 'projects.create' || item === 'projects.edit') {
      return permissions.includes('projects.edit') || permissions.includes('models.manage');
    }
    if (item === 'projects.read') {
      return permissions.includes('projects.read')
        || permissions.includes('projects.edit')
        || permissions.includes('models.manage');
    }
    if (item === 'scene.capture') {
      return permissions.includes('scene.capture')
        || permissions.includes('projects.edit')
        || permissions.includes('models.manage');
    }
    if (item === 'projects.export') {
      return permissions.includes('projects.export') || permissions.includes('models.manage');
    }
    return permissions.includes('models.manage');
  });
}

export function canAccessVoxaCli(
  identity: RuntimeIdentity & { creatorCliPermissions?: unknown },
  capability: VoxaCreatorCapability | readonly VoxaCreatorCapability[],
) {
  const required = Array.isArray(capability) ? capability : [capability];
  const permissions = Array.isArray(identity.creatorCliPermissions)
    ? identity.creatorCliPermissions.map(String)
    : [];
  if (identity.creatorAccess !== true) return false;
  return required.some((item) => {
    if (item === 'projects.create') return permissions.includes('voxa.project.create');
    if (item === 'projects.read') {
      return permissions.includes('voxa.project.edit')
        || permissions.includes('voxa.project.read');
    }
    if (item === 'projects.edit') return permissions.includes('voxa.project.edit');
    if (item === 'projects.export') {
      return permissions.includes('voxa.project.edit')
        || permissions.includes('voxa.project.export');
    }
    if (item === 'projects.delete') {
      return permissions.includes('voxa.project.delete')
        || permissions.includes('voxa.project.export');
    }
    if (item === 'scene.capture') {
      return permissions.includes('voxa.project.edit')
        || permissions.includes('voxa.scene.capture');
    }
    return permissions.some((permission) =>
      permission === 'voxa.project.create'
      || permission === 'voxa.project.edit'
      || permission === 'voxa.project.delete',
    );
  });
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

export async function resolveVoxaRuntimeIdentity(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (isTrustedVoxaInternalRequest(req)) return { subjectId: 'internal' } as RuntimeIdentity;
  const serviceURL = playerServiceURL();
  const secret = permissionSecret();
  if (!serviceURL || !secret) return undefined;
  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  try {
    const response = await fetch(`${serviceURL}/api/player-internal/runtime-identity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        Cookie: String(req.headers.cookie || ''),
        'X-Box-Creator-Authorization': authorization || '',
        'X-Box-Player-IP': req.socket.remoteAddress || '',
        'X-Box-Player-Proto': requestProtocol(req),
        'X-Box-Player-User-Agent': String(req.headers['user-agent'] || '').slice(0, 512),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    copySessionCookies(response, res);
    if (!response.ok) return undefined;
    const data = await response.json().catch(() => ({})) as RuntimeIdentityResponse;
    return data.identity as RuntimeIdentity | undefined;
  } catch {
    return undefined;
  }
}

export async function resolveVoxaModelAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  capability: VoxaCreatorCapability | readonly VoxaCreatorCapability[],
) : Promise<VoxaModelManagementAccess> {
  if (isTrustedVoxaInternalRequest(req)) return 'allowed';

  const serviceURL = playerServiceURL();
  const secret = permissionSecret();
  if (!serviceURL || !secret) {
    return 'unavailable';
  }

  try {
    const cliAuthorization = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const response = await fetch(`${serviceURL}/api/player-internal/runtime-identity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        Cookie: String(req.headers.cookie || ''),
        'X-Box-Player-IP': req.socket.remoteAddress || '',
        'X-Box-Player-Proto': requestProtocol(req),
        'X-Box-Player-User-Agent': String(req.headers['user-agent'] || '').slice(0, 512),
        ...(cliAuthorization?.startsWith('Bearer ')
          ? { 'X-Box-Creator-Authorization': cliAuthorization }
          : {}),
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
    const identity = (data.identity || {}) as RuntimeIdentity & { creatorCliPermissions?: unknown };
    const isCli = Boolean(cliAuthorization?.startsWith('Bearer '));
    return (isCli ? canAccessVoxaCli(identity, capability) : canAccessVoxaModels(identity, capability))
      ? 'allowed'
      : 'denied';
  } catch {
    return 'unavailable';
  }
}

export function resolveVoxaModelManagement(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return resolveVoxaModelAccess(req, res, 'models.manage');
}

export async function requireVoxaModelAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  capability: VoxaCreatorCapability | readonly VoxaCreatorCapability[],
) {
  const access = await resolveVoxaModelAccess(req, res, capability);
  if (access === 'allowed') return true;
  if (access === 'unauthenticated') {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先登录后再访问 VOXA 资源' });
  } else if (access === 'denied') {
    res.status(403).json({ code: 'CREATOR_PERMISSION_DENIED', message: '当前账号没有访问此 VOXA 资源的创作权限' });
  } else {
    res.status(503).json({ code: 'PLAYER_SERVICE_UNAVAILABLE', message: '无法验证 VOXA 资源访问权限' });
  }
  return false;
}

function hasVoxaCliAuthorization(req: NextApiRequest) {
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  return Boolean(authorization?.startsWith('Bearer '));
}

/**
 * Re-checks the permission required by an already-created automation session.
 * A capture token must never be able to reuse an edit session belonging to the
 * same subject, while a normal browser editor may use its model-management
 * capability instead of a CLI scope.
 */
export async function requireVoxaAutomationAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  mode: 'edit' | 'capture',
) {
  if (hasVoxaCliAuthorization(req)) {
    return requireVoxaModelAccess(
      req,
      res,
      mode === 'edit' ? 'projects.edit' : ['projects.edit', 'scene.capture'],
    );
  }
  return requireVoxaModelAccess(
    req,
    res,
    mode === 'edit' ? ['projects.edit', 'models.manage'] : ['scene.capture', 'models.manage'],
  );
}

export async function requireVoxaModelManagement(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return requireVoxaModelAccess(req, res, 'models.manage');
}
