import type { NextApiRequest, NextApiResponse } from 'next';

import { batchManagePlayers } from '../../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const actor = await authorizePlayerAdmin(req, res, 'moderate');
  if (!actor) return;
  try {
    return res.status(200).json(await batchManagePlayers(
      req.body?.subjectIds,
      req.body?.action,
      req.body || {},
      actor,
    ));
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
