import type { NextApiRequest, NextApiResponse } from 'next';

import {
  authorizePlayerAdmin,
  sendPlayerAdminApiError,
} from '../../../../server/player-admin-authorization';
import {
  createPlayerAdminPermissionGroup,
  listPlayerAdminPermissionGroups,
} from '../../../../server/player-admin-identity';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }
  const actor = await authorizePlayerAdmin(req, res, 'owner');
  if (!actor) return;
  const identity = {
    id: actor.subjectId,
    username: actor.actor,
    displayName: actor.actorDisplayName,
    role: actor.actorRole,
    permissions: actor.actorPermissions,
    status: 'active' as const,
    credential: actor.credential,
  };
  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        groups: await listPlayerAdminPermissionGroups(identity),
      });
    }
    return res.status(201).json({
      group: await createPlayerAdminPermissionGroup(req.body || {}, identity, req),
    });
  } catch (error) {
    return sendPlayerAdminApiError(res, error, 'Permission group operation failed');
  }
}
