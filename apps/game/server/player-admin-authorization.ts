import type { NextApiRequest, NextApiResponse } from 'next';

import type { LocalPlayerRole } from '@box-local/utils/local-player-identity';
import {
  createAdminActionContext,
  resolvePlayerIdentity,
  type AdminActionContext,
} from './local-player-identity';
import { allowPlayAdmin } from './play-admin-security';

export type PlayerAdminPermission = 'read' | 'moderate' | 'owner';
export type PlayerAdminActor = AdminActionContext & {
  actor: string;
  actorDisplayName: string;
  actorRole: LocalPlayerRole | 'owner';
  subjectId: string;
};

const permissionRoles: Record<PlayerAdminPermission, LocalPlayerRole[]> = {
  read: ['moderator', 'admin'],
  moderate: ['moderator', 'admin'],
  owner: ['admin'],
};

export function roleHasPlayerAdminPermission(
  role: LocalPlayerRole,
  permission: PlayerAdminPermission,
) {
  return permissionRoles[permission].includes(role);
}

/**
 * Single authorization seam for the player administration module.
 * The server-owner bearer token bootstraps the first administrator; afterwards
 * registered moderator/admin accounts can use their normal signed-in session.
 */
export async function authorizePlayerAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  permission: PlayerAdminPermission = 'read',
): Promise<PlayerAdminActor | null> {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') {
    res.status(404).end();
    return null;
  }

  if (req.headers.authorization) {
    if (!allowPlayAdmin(req, res)) return null;
    return {
      ...createAdminActionContext(req),
      actor: 'server-owner',
      actorDisplayName: '服主密钥',
      actorRole: 'owner',
      subjectId: '',
    };
  }

  try {
    const identity = await resolvePlayerIdentity(req, res);
    if (!roleHasPlayerAdminPermission(identity.role, permission)) {
      res.status(403).json({ message: permission === 'owner' ? '此操作仅限服主账号' : '当前账号没有玩家管理权限' });
      return null;
    }
    return {
      ...createAdminActionContext(req),
      actor: `player:${identity.subjectId}`,
      actorDisplayName: identity.displayName,
      actorRole: identity.role,
      subjectId: identity.subjectId,
    };
  } catch (error) {
    const message = (error as Error).message;
    res.status(message === 'AUTH_REQUIRED' ? 401 : 503).json({
      message: message === 'AUTH_REQUIRED' ? '请先登录管理员账号，或使用服主密钥验证' : message,
    });
    return null;
  }
}
