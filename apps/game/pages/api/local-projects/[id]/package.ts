import type { NextApiRequest, NextApiResponse } from 'next';
import { getLocalProjectManager } from '../../../../server/local-project-manager';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.BOX_DEPLOYMENT_MODE === 'play') {
    return res.status(404).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const version = req.body?.version;
  if (!id || typeof version !== 'string') {
    return res.status(400).json({ message: 'Project ID and release version are required' });
  }
  try {
    const manager = getLocalProjectManager();
    return res.status(201).json({
      distribution: manager.packageProject(`${id}@${version}`, undefined, {
        includeImages: true,
      }),
    });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}
