import type { NextApiRequest, NextApiResponse } from 'next';

import {
  authorizePlayerAdmin,
  sendPlayerAdminApiError,
} from '../../../../server/player-admin-authorization';
import {
  deletePlayerAdminPermissionGroup,
  updatePlayerAdminPermissionGroup,
} from '../../../../server/player-admin-identity';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['PATCH', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'PATCH, DELETE');
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
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id || '';
  try {
    if (req.method === 'PATCH') {
      return res.status(200).json({
        group: await updatePlayerAdminPermissionGroup(id, req.body || {}, identity, req),
      });
    }
    await deletePlayerAdminPermissionGroup(id, identity, req);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return sendPlayerAdminApiError(res, error, 'Permission group update failed');
  }
}
