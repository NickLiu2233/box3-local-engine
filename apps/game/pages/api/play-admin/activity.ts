import type { NextApiRequest, NextApiResponse } from 'next';

import { listPlayerAdminActivity } from '../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  if (!await authorizePlayerAdmin(req, res, 'audit.view')) return;
  const queryValue = (name: string) => {
    const value = req.query[name];
    return Array.isArray(value) ? value[0] : value;
  };
  try {
    return res.status(200).json(await listPlayerAdminActivity({
      kind: queryValue('kind') as 'all' | 'login' | 'admin',
      search: queryValue('search') || '',
      page: Number(queryValue('page')) || 1,
      pageSize: Number(queryValue('pageSize')) || 30,
    }));
  } catch (error) {
    return res.status(503).json({ message: (error as Error).message });
  }
}
