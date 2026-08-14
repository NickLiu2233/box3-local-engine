import type { NextApiRequest, NextApiResponse } from 'next';
import {
  deleteManagedPlayer,
  getManagedPlayerDetails,
  resetManagedPlayerPassword,
  revokeManagedPlayerSessions,
  revokeManagedPlayerSession,
  updateManagedPlayer,
} from '../../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  const subjectId = Array.isArray(req.query.subjectId)
    ? req.query.subjectId[0]
    : req.query.subjectId || '';
  if (!/^[0-9a-f]{32}$/i.test(subjectId)) {
    return res.status(400).json({ message: '玩家身份无效' });
  }
  try {
    if (req.method === 'GET') {
      if (!await authorizePlayerAdmin(req, res, 'read')) return;
      return res.status(200).json(await getManagedPlayerDetails(subjectId));
    }
    if (req.method === 'PATCH') {
      const permission = req.body && Object.prototype.hasOwnProperty.call(req.body, 'role') ? 'owner' : 'moderate';
      const context = await authorizePlayerAdmin(req, res, permission);
      if (!context) return;
      const target = await getManagedPlayerDetails(subjectId);
      if (context.actorRole === 'moderator' && target.player.role !== 'player') {
        return res.status(403).json({ message: '管理员不能修改其他管理角色' });
      }
      if (context.subjectId === subjectId && req.body?.role && req.body.role !== target.player.role) {
        return res.status(400).json({ message: '不能修改当前正在操作的服主账号角色' });
      }
      if (context.subjectId === subjectId && req.body?.status === 'banned') {
        return res.status(400).json({ message: '不能封禁当前正在操作的管理员账号' });
      }
      return res.status(200).json({
        player: await updateManagedPlayer(subjectId, req.body || {}, context),
      });
    }
    if (req.method === 'POST') {
      const ownerOnly = req.body?.action === 'reset-password';
      const context = await authorizePlayerAdmin(req, res, ownerOnly ? 'owner' : 'moderate');
      if (!context) return;
      const target = await getManagedPlayerDetails(subjectId);
      if (context.actorRole === 'moderator' && target.player.role !== 'player') {
        return res.status(403).json({ message: '管理员不能管理其他管理角色' });
      }
      if (req.body?.action === 'revoke-sessions') {
        if (context.subjectId === subjectId) return res.status(400).json({ message: '不能强制当前管理员账号下线' });
        return res.status(200).json(await revokeManagedPlayerSessions(subjectId, context));
      }
      if (req.body?.action === 'revoke-session') {
        return res.status(200).json(await revokeManagedPlayerSession(subjectId, String(req.body.sessionId || ''), context));
      }
      if (req.body?.action === 'reset-password') {
        if (context.subjectId === subjectId) return res.status(400).json({ message: '请通过账号设置修改自己的密码' });
        return res.status(200).json(await resetManagedPlayerPassword(subjectId, req.body?.password, context));
      }
      return res.status(400).json({ message: '不支持的玩家操作' });
    }
    if (req.method === 'DELETE') {
      const context = await authorizePlayerAdmin(req, res, 'owner');
      if (!context) return;
      if (context.subjectId === subjectId) return res.status(400).json({ message: '不能删除当前正在操作的服主账号' });
      await deleteManagedPlayer(subjectId, context);
      return res.status(200).json({ deleted: true });
    }
    res.setHeader('Allow', 'GET, PATCH, POST, DELETE');
    return res.status(405).end();
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
