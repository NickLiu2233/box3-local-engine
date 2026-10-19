import type { NextApiRequest, NextApiResponse } from 'next';
import { completeVoxaAiCommand, getVoxaAiSession } from '../../../../../../../server/ai-control-session';
import { requireVoxaAutomationAccess, requireVoxaModelAccess, resolveVoxaRuntimeIdentity } from '../../../../../../../server/model-management-access';
import { setLocalCors } from '../../../../../../../server/local-cors';

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
  const sessionId = value(req.query.id);
  const requestId = value(req.query.requestId);
  try {
    const session = getVoxaAiSession(sessionId, identity.subjectId);
    if (!session) return res.status(404).json({ code: 'VOXA_SESSION_NOT_FOUND', message: 'VOXA 自动化会话不存在' });
    if (!(await requireVoxaAutomationAccess(req, res, session.mode))) return;
    const command = session.commands.find((item) => item.command.requestId === requestId);
    if (!command) return res.status(404).json({ code: 'VOXA_COMMAND_NOT_FOUND', message: 'VOXA 自动化命令不存在' });
    if (req.method === 'GET') return res.status(200).json(command);
    if (req.method === 'POST') {
      const result = req.body?.ok === false
        ? { ok: false as const, error: String(req.body?.error || 'VOXA 命令执行失败') }
        : { ok: true as const, data: req.body?.data };
      return res.status(200).json(completeVoxaAiCommand(sessionId, identity.subjectId, requestId, result));
    }
    return res.status(405).end();
  } catch (error) {
    return res.status(409).json({ code: 'VOXA_COMMAND_ERROR', message: error instanceof Error ? error.message : String(error) });
  }
}
