import type { NextApiRequest, NextApiResponse } from 'next';
import { localhostRegex } from 'src/utils/url-helpers';
import { getMapContentInfo } from 'server/map-info';
import { getServerConfig } from 'configs/server';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { hash, mode } = req.query;

  if (typeof hash !== 'string' || (mode !== 'play' && mode !== 'edit')) {
    return res.status(400).end();
  }

  if (process.env.BOX_DEPLOYMENT_MODE === 'play' && mode !== 'play') {
    return res.status(404).end();
  }

  // 放行localhost发起的请求
  const { origin } = req.headers;
  if (origin && localhostRegex.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // 放行预检请求
  if (req.method?.toUpperCase() === 'OPTIONS') {
    res.setHeader('Content-Length', '0');
    res.writeHead(204);
    res.end();
    return;
  }

  const serverConfig = await getServerConfig();
  const token = req.headers.authorization || req.headers.cookie || '';
  if (!token && !serverConfig.isLocalGameServer) {
    return res.status(400).end();
  }

  const mapInfo = await getMapContentInfo(mode, hash, token);

  return res.status(200).json(mapInfo);
};
