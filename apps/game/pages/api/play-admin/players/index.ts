import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createManagedPlayer,
  listManagedPlayers,
} from '../../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  try {
    if (req.method === 'POST') {
      const context = await authorizePlayerAdmin(req, res, 'players.create');
      if (!context) return;
      return res.status(201).json({
        player: await createManagedPlayer(
          { ...(req.body || {}), role: 'player', adminPermissions: [] },
          context,
        ),
      });
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).end();
    }
    if (!await authorizePlayerAdmin(req, res, 'players.view')) return;
    const queryValue = (name: string) => {
      const value = req.query[name];
      return Array.isArray(value) ? value[0] : value;
    };
    return res.status(200).json(await listManagedPlayers({
      search: queryValue('search') || '',
      page: Number(queryValue('page')) || 1,
      pageSize: Number(queryValue('pageSize')) || 30,
      identity: queryValue('identity') as 'all' | 'user' | 'banned',
      role: 'player',
      online: queryValue('online') as 'all' | 'online' | 'offline',
      sort: queryValue('sort') as 'lastSeen' | 'registered' | 'displayName' | 'loginCount',
    }));
  } catch (error) {
    return res.status(req.method === 'POST' ? 400 : 503).json({ message: (error as Error).message });
  }
}
