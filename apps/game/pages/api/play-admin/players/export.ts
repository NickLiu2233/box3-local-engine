import type { NextApiRequest, NextApiResponse } from 'next';

import { exportManagedPlayersCsv } from '../../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../../server/player-admin-authorization';

function queryValue(req: NextApiRequest, name: string) {
  const value = req.query[name];
  return Array.isArray(value) ? value[0] : value || '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  if (!await authorizePlayerAdmin(req, res, 'players.export')) return;
  try {
    const result = await exportManagedPlayersCsv({
      search: queryValue(req, 'search'),
      identity: queryValue(req, 'identity') as 'all' | 'user' | 'banned',
      role: queryValue(req, 'role') as 'all' | 'player' | 'moderator' | 'admin',
      online: queryValue(req, 'online') as 'all' | 'online' | 'offline',
      sort: queryValue(req, 'sort') as 'lastSeen' | 'registered' | 'displayName' | 'loginCount',
    });
    const suffix = result.truncated ? '-first-10000' : '';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="players${suffix}.csv"`);
    res.setHeader('X-BOX-Exported-Rows', String(result.exported));
    res.setHeader('X-BOX-Total-Rows', String(result.total));
    return res.status(200).send(result.csv);
  } catch (error) {
    return res.status(503).json({ message: (error as Error).message });
  }
}
