import type { NextApiRequest, NextApiResponse } from 'next';

import { deletePlayWorld, updatePlayWorld } from '../../../../server/play-admin';
import { allowPlayLibraryAdmin } from '../../../../server/play-admin-security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).end();
  }
  if (!allowPlayLibraryAdmin(req, res)) return;
  try {
    if (req.method === 'PATCH') {
      return res.status(200).json({ world: updatePlayWorld(String(req.query.id || ''), req.body || {}) });
    }
    deletePlayWorld(String(req.query.id || ''));
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
