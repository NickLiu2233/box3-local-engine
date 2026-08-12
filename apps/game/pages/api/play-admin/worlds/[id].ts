import type { NextApiRequest, NextApiResponse } from 'next';

import { deletePlayWorld } from '../../../../server/play-admin';
import { allowPlayLibraryAdmin } from '../../../../server/play-admin-security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).end();
  }
  if (!allowPlayLibraryAdmin(req, res)) return;
  try {
    deletePlayWorld(String(req.query.id || ''));
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
