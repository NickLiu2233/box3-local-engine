import type { NextApiRequest, NextApiResponse } from 'next';
import { allowAuthenticatedCreatorApi } from '../../../../../../../../server/creator-api-security';

const projectManager = require('../../../../../../../../../local-engine/src/project-manager.js') as {
  updateProjectScript(id: string, side: string, entry: string, content: string): { entry: string; side: string; revision: string; hash: string };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'PUT') { res.setHeader('Allow', 'PUT'); return res.status(405).end(); }
  if (!await allowAuthenticatedCreatorApi(req, res, 'projects.edit')) return;
  const projectId = String(Array.isArray(req.query.projectId) ? req.query.projectId[0] : req.query.projectId || '');
  const side = String(Array.isArray(req.query.side) ? req.query.side[0] : req.query.side || '');
  const entry = String(Array.isArray(req.query.entry) ? req.query.entry[0] : req.query.entry || '');
  const content = typeof req.body?.content === 'string' ? req.body.content : null;
  if (content === null) return res.status(422).json({ code: 'SCRIPT_CONTENT_REQUIRED', message: 'content 必须是字符串' });
  try {
    return res.status(200).json(projectManager.updateProjectScript(projectId, side, entry, content));
  } catch (error) {
    return res.status(422).json({ code: 'SCRIPT_WRITE_FAILED', message: error instanceof Error ? error.message : String(error) });
  }
}
