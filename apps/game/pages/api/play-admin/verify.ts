import type { NextApiRequest, NextApiResponse } from 'next';
import { allowPlayAdmin } from '../../../server/play-admin-security';
import { authorizePlayerAdmin } from '../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    const actor = await authorizePlayerAdmin(req, res, 'players.view');
    if (!actor) return;
    return res.status(200).json({
      verified: true,
      actor: {
        displayName: actor.actorDisplayName,
        role: actor.actorRole,
        subjectId: actor.subjectId,
        credential: actor.actor === 'server-owner' ? 'owner-token' : 'account',
        permissions: actor.actorPermissions || [],
      },
    });
  }
  if (!allowPlayAdmin(req, res)) return;
  return res.status(200).json({ verified: true, actor: { displayName: '服主密钥', role: 'owner', credential: 'owner-token' } });
}
