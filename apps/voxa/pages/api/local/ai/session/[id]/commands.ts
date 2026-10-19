import type { NextApiRequest, NextApiResponse } from 'next';
import {
  enqueueVoxaAiCommand,
  getVoxaAiSession,
  listVoxaAiCommands,
} from '../../../../../../server/ai-control-session';
import { requireVoxaAutomationAccess, requireVoxaModelAccess, resolveVoxaRuntimeIdentity } from '../../../../../../server/model-management-access';
import { setLocalCors } from '../../../../../../server/local-cors';

function value(input: string | string[] | undefined) {
  return String(Array.isArray(input) ? input[0] : input || '').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end('仅允许本机访问');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!(await requireVoxaModelAccess(req, res, ['projects.edit', 'scene.capture', 'models.manage']))) return;
  const identity = await resolveVoxaRuntimeIdentity(req, res);
  if (!identity?.subjectId) return res.status(401).json({ code: 'AUTH_REQUIRED', message: '无法确认 VOXA 操作者身份' });
  const id = value(req.query.id);
  try {
    const session = getVoxaAiSession(id, identity.subjectId);
    if (!session) return res.status(404).json({ code: 'VOXA_SESSION_NOT_FOUND', message: 'VOXA 自动化会话不存在' });
    if (!(await requireVoxaAutomationAccess(req, res, session.mode))) return;
    if (req.method === 'POST') {
      const command = req.body?.command || req.body;
      if (!command || typeof command !== 'object' || typeof command.requestId !== 'string' || typeof command.type !== 'string') {
        return res.status(400).json({ code: 'INVALID_VOXA_COMMAND', message: 'VOXA 命令格式无效' });
      }
      return res.status(202).json(enqueueVoxaAiCommand(id, identity.subjectId, command));
    }
    if (req.method === 'GET') {
      const cursor = Math.max(0, Number(req.query.cursor || 0) || 0);
      return res.status(200).json(listVoxaAiCommands(id, identity.subjectId, cursor));
    }
    return res.status(405).end();
  } catch (error) {
    return res.status(409).json({ code: 'VOXA_SESSION_ERROR', message: error instanceof Error ? error.message : String(error) });
  }
}
