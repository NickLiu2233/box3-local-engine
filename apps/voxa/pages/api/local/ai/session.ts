import type { NextApiRequest, NextApiResponse } from 'next';
import {
  closeVoxaAiSession,
  createVoxaAiSession,
  listVoxaAiSessions,
} from '../../../../server/ai-control-session';
import {
  requireVoxaAutomationAccess,
  requireVoxaModelAccess,
  resolveVoxaRuntimeIdentity,
} from '../../../../server/model-management-access';
import { setLocalCors } from '../../../../server/local-cors';

function value(input: string | string[] | undefined) {
  return String(Array.isArray(input) ? input[0] : input || '').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end('仅允许本机访问');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const requestedMode = String(req.body?.mode || 'edit').trim();
  if (requestedMode !== 'edit' && requestedMode !== 'capture') {
    return res.status(400).json({ code: 'INVALID_VOXA_SESSION_MODE', message: 'VOXA 会话模式无效' });
  }
  if (req.method === 'POST') {
    if (!(await requireVoxaAutomationAccess(req, res, requestedMode))) return;
  } else if (!(await requireVoxaModelAccess(req, res, ['projects.edit', 'scene.capture', 'models.manage']))) return;
  const identity = await resolveVoxaRuntimeIdentity(req, res);
  const ownerSubjectId = identity?.subjectId;
  if (!ownerSubjectId) return res.status(401).json({ code: 'AUTH_REQUIRED', message: '无法确认 VOXA 操作者身份' });
  const projectId = value(req.query.projectId) || String(req.body?.projectId || '').trim();
  const sessionId = value(req.query.id) || String(req.body?.id || '').trim();
  if (req.method === 'POST') {
    if (!projectId || projectId.length > 128) return res.status(400).json({ code: 'INVALID_PROJECT_ID', message: 'VOXA 工程 ID 无效' });
    return res.status(201).json(createVoxaAiSession(projectId, ownerSubjectId, requestedMode));
  }
  if (req.method === 'GET') {
    if (!projectId || projectId.length > 128) return res.status(400).json({ code: 'INVALID_PROJECT_ID', message: 'VOXA 工程 ID 无效' });
    return res.status(200).json({ sessions: listVoxaAiSessions(projectId, ownerSubjectId) });
  }
  if (req.method === 'DELETE') {
    return res.status(closeVoxaAiSession(sessionId, ownerSubjectId) ? 200 : 404).json({ closed: true });
  }
  if (!projectId || projectId.length > 128) return res.status(400).json({ code: 'INVALID_PROJECT_ID', message: 'VOXA 工程 ID 无效' });
  return res.status(405).end();
}
