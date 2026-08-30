import type { NextApiRequest, NextApiResponse } from 'next';

import {
  authorizePlayerAdmin,
  sendPlayerAdminApiError,
} from '../../../server/player-admin-authorization';
import { logoutPlayerAdmin } from '../../../server/player-admin-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (!(await authorizePlayerAdmin(req, res))) return;
  try {
    await logoutPlayerAdmin(req, res);
    return res.status(200).json({ loggedOut: true });
  } catch (error) {
    return sendPlayerAdminApiError(res, error, 'Player admin logout failed');
  }
}
