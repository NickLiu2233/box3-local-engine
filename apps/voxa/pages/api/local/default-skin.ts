import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getDefaultSkin,
  setDefaultSkin,
} from '../../../server/local-voxa-store';
import { setLocalCors } from '../../../server/local-cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!setLocalCors(req, res)) return res.status(403).end('仅允许本机访问');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const rawMapId = Array.isArray(req.query.mapId) ? req.query.mapId[0] : req.query.mapId;
  const mapId = Number(rawMapId ?? req.body?.mapId ?? 0);
  if (!Number.isFinite(mapId) || mapId < 0) {
    return res.status(400).json({ message: 'Invalid map ID' });
  }

  if (req.method === 'GET') {
    return res.status(200).json(getDefaultSkin(mapId));
  }
  if (req.method === 'PUT') {
    const skinId = Number(req.body?.skinId || 0);
    const success = await setDefaultSkin(mapId, skinId);
    return success
      ? res.status(200).json(true)
      : res.status(404).json({ message: 'Skin not found' });
  }
  return res.status(405).end();
}
