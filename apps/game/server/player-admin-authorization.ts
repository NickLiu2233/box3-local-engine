import type { NextApiRequest, NextApiResponse } from 'next';

import type { LocalPlayerRole } from '@box-local/utils/local-player-identity';
import {
  createAdminActionContext,
  getAssignedPlayerAdminCapabilities,
  resolvePlayerIdentity,
  type AdminActionContext,
} from './local-player-identity';
import {
  effectivePlayerAdminCapabilities,
  roleHasPlayerAdminPermission,
  type PlayerAdminRequirement,
} from '../shared/player-admin-policy';
import { allowPlayAdmin } from './play-admin-security';

export type PlayerAdminActor = AdminActionContext & {
  actor: string;
  actorDisplayName: string;
  actorRole: LocalPlayerRole | 'owner';
  subjectId: string;
};

export { roleHasPlayerAdminPermission } from '../shared/player-admin-policy';

export function actorHasPlayerAdminPermission(
  actor: Pick<PlayerAdminActor, 'actorRole' | 'actorPermissions'>,
  requirement: PlayerAdminRequirement,
) {
  return roleHasPlayerAdminPermission(
    actor.actorRole || 'player',
    requirement,
    actor.actorPermissions || [],
  );
}

/**
 * Single authorization seam for the player administration module.
 * The server-owner bearer token bootstraps the first administrator; afterwards
 * registered moderator/admin accounts can use their normal signed-in session.
 */
export async function authorizePlayerAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
  requirement: PlayerAdminRequirement | PlayerAdminRequirement[] = 'players.view',
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
      actorPermissions: effectivePlayerAdminCapabilities('owner'),
      subjectId: '',
    };
  }

  try {
    const identity = await resolvePlayerIdentity(req, res);
    const assigned = await getAssignedPlayerAdminCapabilities(identity.subjectId);
    const requirements = Array.isArray(requirement) ? requirement : [requirement];
    const denied = requirements.find((item) => !roleHasPlayerAdminPermission(identity.role, item, assigned));
    if (denied) {
      res.status(403).json({
        message: denied === 'owner'
          ? '此操作仅限服主账号或服主密钥'
          : '服主尚未授予当前管理员执行此操作的权限',
      });
      return null;
    }
    const permissions = effectivePlayerAdminCapabilities(identity.role, assigned);
    return {
      ...createAdminActionContext(req),
      actor: `player:${identity.subjectId}`,
      actorDisplayName: identity.displayName,
      actorRole: identity.role,
      actorPermissions: permissions,
      subjectId: identity.subjectId,
    };
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'AUTH_REQUIRED' ? 401
      : message === 'IP_BANNED' || message === 'DEVICE_BANNED' ? 403
        : 503;
    res.status(status).json({
      message: message === 'AUTH_REQUIRED' ? '请先登录管理员账号，或使用服主密钥验证' : message,
    });
    return null;
  }
}
