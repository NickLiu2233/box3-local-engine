import type { NextApiRequest, NextApiResponse } from 'next';
import { ArenaMode, getArenaServerRenderProps } from 'server/server-render';
import { localhostRegex } from 'src/utils/url-helpers';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  /**
   * see: https://nextjs.org/docs/pages/building-your-application/routing/api-routes#catch-all-api-routes
   */
  const { slug } = req.query;

  const [mode, gameName] = slug;

  if (!validateMode(mode) || typeof gameName !== 'string') {
    return res.status(400).end();
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

  const config = await getArenaServerRenderProps({
    containerName: gameName,
    mode,
    cookie: req.headers.cookie || '',
    browserLanguage: req.headers['accept-language'],
    token: req.headers.authorization,
  });

  return res.status(200).json(config.props);
};

function validateMode(mode: string): mode is ArenaMode {
  return ['edit', 'play'].includes(mode);
}
