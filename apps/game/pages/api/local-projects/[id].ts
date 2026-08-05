import type { NextApiRequest, NextApiResponse } from 'next';
import { getLocalProjectManager } from '../../../server/local-project-manager';
import { allowCreatorApi } from '../../../server/creator-api-security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCreatorApi(req, res)) return;
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ message: 'Project ID is required' });
  try {
    const manager = getLocalProjectManager();
    if (req.method === 'PATCH') return res.status(200).json({ project: manager.updateProject(id, req.body || {}) });
    if (req.method === 'DELETE') {
      manager.deleteProject(id);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).end();
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
