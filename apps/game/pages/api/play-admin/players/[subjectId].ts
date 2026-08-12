import type { NextApiRequest, NextApiResponse } from 'next';
import { allowPlayAdmin } from '../../../../server/play-admin-security';
import {
  deleteManagedPlayer,
  getManagedPlayerDetails,
  revokeManagedPlayerSessions,
  updateManagedPlayer,
} from '../../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (!allowPlayAdmin(req, res)) return;
  const subjectId = Array.isArray(req.query.subjectId)
    ? req.query.subjectId[0]
    : req.query.subjectId || '';
  if (!/^[0-9a-f]{32}$/i.test(subjectId)) {
    return res.status(400).json({ message: '玩家身份无效' });
  }
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await getManagedPlayerDetails(subjectId));
    }
    if (req.method === 'PATCH') {
      return res.status(200).json({
        player: await updateManagedPlayer(subjectId, req.body || {}),
      });
    }
    if (req.method === 'POST') {
      if (req.body?.action !== 'revoke-sessions') {
        return res.status(400).json({ message: '不支持的玩家操作' });
      }
      return res.status(200).json(await revokeManagedPlayerSessions(subjectId));
    }
    if (req.method === 'DELETE') {
      await deleteManagedPlayer(subjectId);
      return res.status(200).json({ deleted: true });
    }
    res.setHeader('Allow', 'GET, PATCH, POST, DELETE');
    return res.status(405).end();
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
