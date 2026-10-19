import type { NextApiRequest, NextApiResponse } from 'next';
import { getVoxaAiSession } from '../../../../server/ai-control-session';
import { ensureVoxaWebSocketServer, issueVoxaSocketTicket } from '../../../../server/ai-control-websocket';
import { requireVoxaAutomationAccess, requireVoxaModelAccess, resolveVoxaRuntimeIdentity } from '../../../../server/model-management-access';
import { setLocalCors } from '../../../../server/local-cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end();
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireVoxaModelAccess(req, res, ['projects.edit', 'scene.capture', 'models.manage']))) return;
  const identity = await resolveVoxaRuntimeIdentity(req, res);
  if (!identity?.subjectId) return res.status(401).json({ code: 'AUTH_REQUIRED' });
  const role = req.body?.role;
  if (role !== 'editor' && role !== 'controller') return res.status(400).json({ code: 'INVALID_VOXA_SOCKET_ROLE' });
  let projectId = String(req.body?.projectId || '').trim();
  const sessionId = String(req.body?.sessionId || '').trim();
  if (role === 'controller') {
    const session = getVoxaAiSession(sessionId, identity.subjectId);
    if (!session) return res.status(404).json({ code: 'VOXA_SESSION_NOT_FOUND' });
    if (!(await requireVoxaAutomationAccess(req, res, session.mode))) return;
    projectId = session.projectId;
  }
  if (!projectId || projectId.length > 128) return res.status(400).json({ code: 'INVALID_PROJECT_ID' });
  await ensureVoxaWebSocketServer();
  const ticket = issueVoxaSocketTicket({ role, projectId, sessionId, ownerSubjectId: identity.subjectId, origin: String(req.headers.origin || '') });
  return res.status(201).json({ ticket, socketPath: `${process.env.BOX_APP_BASE_PATH || ''}/api/local/ai/socket` });
}
