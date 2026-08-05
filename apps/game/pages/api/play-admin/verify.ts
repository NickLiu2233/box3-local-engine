import type { NextApiRequest, NextApiResponse } from 'next';
import { allowPlayAdmin } from '../../../server/play-admin-security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (!allowPlayAdmin(req, res)) return;
  return res.status(200).json({ verified: true });
}
