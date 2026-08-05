import type { NextApiRequest, NextApiResponse } from 'next';

import { createPlayBundle } from '../../../../../server/play-admin';
import { allowPlayAdmin } from '../../../../../server/play-admin-security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  if (!allowPlayAdmin(req, res)) return;
  try {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Cache-Control', 'no-store');
    const { archive, filename } = createPlayBundle(String(req.query.id || ''));
    res.setHeader('Content-Disposition', `attachment; filename="world.boxplay"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    archive.on('error', (error) => res.destroy(error));
    archive.pipe(res);
    archive.finalize();
  } catch (error) {
    if (!res.headersSent) return res.status(400).json({ message: (error as Error).message });
    res.destroy(error as Error);
  }
}
