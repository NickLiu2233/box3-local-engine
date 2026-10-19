import type { NextApiRequest, NextApiResponse } from 'next';
import { closeVoxaAiSession } from '../../../../../server/ai-control-session';
import { requireVoxaModelAccess, resolveVoxaRuntimeIdentity } from '../../../../../server/model-management-access';
import { setLocalCors } from '../../../../../server/local-cors';

function value(input: string | string[] | undefined) {
  return String(Array.isArray(input) ? input[0] : input || '').trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end('仅允许本机访问');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'DELETE') return res.status(405).end();
  if (!(await requireVoxaModelAccess(req, res, ['projects.edit', 'scene.capture', 'models.manage']))) return;
  const identity = await resolveVoxaRuntimeIdentity(req, res);
  if (!identity?.subjectId) return res.status(401).json({ code: 'AUTH_REQUIRED', message: '无法确认 VOXA 操作者身份' });
  const id = value(req.query.id);
  const closed = closeVoxaAiSession(id, identity.subjectId);
  return res.status(closed ? 200 : 404).json({ closed });
}
