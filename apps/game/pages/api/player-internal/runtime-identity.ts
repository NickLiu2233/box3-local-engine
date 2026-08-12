import type { NextApiRequest, NextApiResponse } from 'next';

import {
  createRuntimeIdentityAssertion,
  isInternalIdentityRequest,
  resolvePlayerIdentity,
} from '../../../server/local-player-identity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.BOX_DEPLOYMENT_MODE !== 'player-service') return res.status(404).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  if (!isInternalIdentityRequest(req)) {
    return res.status(401).json({ message: '玩家身份服务内部鉴权失败' });
  }
  try {
    const identity = await resolvePlayerIdentity(req, res);
    if (identity.status === 'banned') {
      return res.status(403).json({ message: 'PLAYER_BANNED' });
    }
    return res.status(200).json({
      identity,
      assertion: createRuntimeIdentityAssertion(identity),
    });
  } catch (error) {
    if ((error as Error).message === 'AUTH_REQUIRED') {
      return res.status(401).json({ message: 'AUTH_REQUIRED' });
    }
    return res.status(503).json({ message: (error as Error).message });
  }
}
