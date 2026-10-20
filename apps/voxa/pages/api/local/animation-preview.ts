import type { NextApiRequest, NextApiResponse } from 'next';
import { setLocalCors } from '../../../server/local-cors';
import { requireVoxaModelAccess } from '../../../server/model-management-access';
import { packageAnimationPreview } from '../../../server/animation-preview';

export const config = { api: { bodyParser: { sizeLimit: '34mb' }, responseLimit: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end();
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await requireVoxaModelAccess(req, res, ['projects.edit', 'scene.capture', 'models.manage']))) return;
  try {
    const archive = await packageAnimationPreview(req.body);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="animation-preview.zip"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(archive);
  } catch (error) {
    return res.status(400).json({ code: 'VOXA_ANIMATION_PREVIEW_FAILED', message: error instanceof Error ? error.message : String(error) });
  }
}
