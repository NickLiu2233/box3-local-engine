import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createIdentityBan,
  deleteManagedPlayer,
  getManagedPlayerDetails,
  resetManagedPlayerPassword,
  revokeManagedPlayerSessions,
  revokeManagedPlayerSession,
  revokeIdentityBan,
  updateManagedPlayer,
} from '../../../../server/local-player-identity';
import { authorizePlayerAdmin } from '../../../../server/player-admin-authorization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (!['GET', 'PATCH', 'POST', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PATCH, POST, DELETE');
    return res.status(405).end();
  }

  const body = req.body || {};
  const patchRequirements = [] as Array<'players.manage' | 'players.ban'>;
  if (
    ['status', 'banReason', 'bannedUntil'].some((field) =>
      Object.prototype.hasOwnProperty.call(body, field))
  ) {
    patchRequirements.push('players.ban');
  }
  if (
    ['displayName', 'adminNote', 'tags', 'boxId'].some((field) =>
      Object.prototype.hasOwnProperty.call(body, field))
  ) {
    patchRequirements.push('players.manage');
  }
  const requirement = req.method === 'GET'
    ? 'players.view'
    : req.method === 'PATCH'
      ? patchRequirements.length ? patchRequirements : 'players.manage'
      : body.action === 'reset-password'
        ? 'passwords.reset'
        : body.action === 'revoke-sessions' || body.action === 'revoke-session'
          ? 'sessions.manage'
          : body.action === 'ban-ip' || body.action === 'ban-device' || body.action === 'unban-source'
            ? 'identity-bans.manage'
            : 'players.manage';
  const context = req.method === 'DELETE'
    ? await authorizePlayerAdmin(req, res, 'owner')
    : await authorizePlayerAdmin(req, res, requirement);
  if (!context) return;

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
      if (
        Object.prototype.hasOwnProperty.call(body, 'role') ||
        Object.prototype.hasOwnProperty.call(body, 'adminPermissions')
      ) {
        return res.status(400).json({ message: '玩家账号不能授予后台权限' });
      }
      if (Object.prototype.hasOwnProperty.call(body, 'avatar')) {
        return res.status(400).json({ message: '玩家头像上传功能已停用' });
      }
      if (!patchRequirements.length) {
        return res.status(400).json({ message: '没有可更新的玩家字段' });
      }
      return res.status(200).json({
        player: await updateManagedPlayer(subjectId, req.body || {}, context),
      });
    }
    if (req.method === 'POST') {
      if (req.body?.action === 'revoke-sessions') {
        return res.status(200).json(await revokeManagedPlayerSessions(subjectId, context));
      }
      if (req.body?.action === 'revoke-session') {
        return res.status(200).json(await revokeManagedPlayerSession(subjectId, String(req.body.sessionId || ''), context));
      }
      if (req.body?.action === 'reset-password') {
        return res.status(200).json(await resetManagedPlayerPassword(subjectId, req.body?.password, context));
      }
      if (req.body?.action === 'ban-ip' || req.body?.action === 'ban-device') {
        return res.status(200).json(await createIdentityBan(subjectId, {
          kind: req.body.action === 'ban-ip' ? 'ip' : 'device',
          value: req.body.value,
          reason: req.body.reason,
          bannedUntil: req.body.bannedUntil,
        }, context));
      }
      if (req.body?.action === 'unban-source') {
        return res.status(200).json(await revokeIdentityBan(subjectId, req.body.banId, context));
      }
      return res.status(400).json({ message: '不支持的玩家操作' });
    }
    if (req.method === 'DELETE') {
      await deleteManagedPlayer(subjectId, context);
      return res.status(200).json({ deleted: true });
    }
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
