import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

import { getRealIP } from '@box-local/utils/ip';
import { PrefetchCachesType } from '@box-local/content-server/content-fetch';

import { getServerConfig } from '../../configs/server';
import { getSharedLogger } from '../../server/logger';
import { getCreateraInstance } from '../../server/request';
import { localhostRegex } from 'src/utils/url-helpers';

export type CreateSessionResult =
  | RedirectData
  | {
      data: GameSession;
    };

export interface RedirectData {
  redirect: string;
}

export interface GameSession {
  admin: boolean;
  // session id
  sessionId: string;
  // websockets
  socketServerUrl: string;
  maxSockets: number;
  prefetchCaches: PrefetchCachesType;
  prefetchHashes: string[];
  configuredAudioHashes?: string[];
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    body: { mode, contentId, fingerPrint, serverId },
    headers: { origin },
  } = req;

  // 放行localhost发起的请求
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

  try {
    const data = await getSessionData(
      req,
      mode,
      contentId,
      fingerPrint,
      serverId,
    );

    if (!data) {
      return res.status(202).json({
        message: `cannot get metadata of game ${contentId}, try to resume it`,
      });
    }

    if (data.redirect) {
      return res.redirect(400, data.redirect);
    } else {
      res.status(200).json({
        config: data,
      });
    }
  } catch (err) {
    const sharedLogger = await getSharedLogger();
    if (err && err.code === 21005004) {
      sharedLogger.info(
        `Container creation in progress for contentId: ${contentId}. Client to retry. Error code: 21005004. Message: ${
          err.message || JSON.stringify(err)
        }`,
      );
      return res.status(202).json({
        message: 'Container is being created, please try again shortly.',
        code: 'CONTAINER_CREATING',
      });
    } else {
      sharedLogger.error(JSON.stringify(err));
      return res.status(400).json({ message: 'An error occurred' });
    }
  }
};

async function getSessionData(
  req: NextApiRequest,
  mode: 'play' | 'edit',
  contentId,
  fingerPrint: string,
  serverId: string = '',
) {
  const ServerConfig = await getServerConfig();
  const createraInstance = await getCreateraInstance();

  let teamId = '';
  let refererServerId = '';

  try {
    // rust项目发起的请求没有referer
    const url = new URL(req.headers.referer || '');

    teamId = url.searchParams.get('teamId') || '';
    refererServerId = url.searchParams.get('refererServerId') || '';
  } catch (err) {
    console.warn('Failed to parse url, referer', req.headers.referer);
  }
  console.log(`create session on `, contentId, mode, serverId, fingerPrint);

  let httpServerUrl: string;
  let socketServerUrl: string;
  if (ServerConfig.isLocalGameServer === true) {
    httpServerUrl =
      mode === 'edit'
        ? ServerConfig.localEditServerURL
        : ServerConfig.localGameServerURL;
    // 本地就直接把 http server url 处理成 socket server url
    socketServerUrl = httpServerUrl.replace('http', 'ws');
  } else {
    const containerInfo = await createraInstance.containerAllocate(
      {
        mapId: contentId,
        mode,
        serverId,
        teamId,
        refererServerId,
      },
      {
        cookie: req.headers ? req.headers.cookie || '' : '',
        Authorization: req.headers?.auth || '',
      },
    );

    httpServerUrl = containerInfo.httpServerUrl;
    socketServerUrl = containerInfo.socketServerUrl;
  }

  const data = await axios.post(
    httpServerUrl + '/createSession',
    {
      ip: getRealIP(req),
      reqUrl: req.headers.referer || '',
      fingerPrint,
      cookie: req.headers ? req.headers.cookie || '' : '',
      auth: req.headers.auth || '',
    },
    {
      headers: {
        'Authorization': ServerConfig.BACKEND_AUTH_CODE,
        // 透传用户的 Host 给 GameServer，作为判断 Region 等信息的依据
        'X-Forwarded-Host': req.headers.host,
      },
      timeout: 20000,
    },
  );
  const json = data.data;
  if (json.data) {
    json.data.socketServerUrl = socketServerUrl;
  }

  return json.data;
}
