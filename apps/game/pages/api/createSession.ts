import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

import { getRealIP } from '@box/utils/ip';
import { PrefetchCachesType } from '@box/content-server/content-fetch';

import { getServerConfig } from '../../configs/server';
import { getSharedLogger } from '../../server/logger';
import { getCreateraInstance } from '../../server/request';
import { localhostRegex } from 'src/utils/url-helpers';
import {
  PlayerAuthenticationRequiredError,
  PlayerLoginURLNotConfiguredError,
  requirePlayerLoginURL,
  resolvePlayerServiceIdentity,
} from '../../server/player-service-client';
import { prepareLocalRuntimeSession } from '../../server/local-runtime-session';

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
  if (process.env.BOX_DEPLOYMENT_MODE === 'player-service') {
    return res.status(404).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  const { origin } = req.headers;

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).end();
  }

  const { mode, contentId, containerName, fingerPrint, serverId } = req.body || {};
  if (mode !== 'play' && mode !== 'edit') {
    return res.status(400).json({ message: 'Invalid session mode' });
  }

  if (process.env.BOX_DEPLOYMENT_MODE === 'play' && mode !== 'play') {
    return res.status(404).end();
  }
  if (
    typeof containerName !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(containerName) ||
    (typeof fingerPrint !== 'undefined' &&
      (typeof fingerPrint !== 'string' || fingerPrint.length > 512)) ||
    (typeof serverId !== 'undefined' &&
      (typeof serverId !== 'string' || serverId.length > 128)) ||
    !(['string', 'number'].includes(typeof contentId))
  ) {
    return res.status(400).json({ message: 'Invalid session parameters' });
  }

  try {
    const data = await getSessionData(
      req,
      res,
      mode,
      contentId,
      fingerPrint,
      serverId,
      containerName,
    );

    if (!data) {
      return res.status(202).json({
        code: 'RUNTIME_STARTING',
        message: '地图运行时正在迁移或预烘焙，请稍候',
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
    if (err instanceof PlayerAuthenticationRequiredError) {
      const from = process.env.BOX_DEPLOYMENT_MODE === 'creator' ? 'creator' : 'play';
      try {
        return res.status(401).json({
          code: 'AUTH_REQUIRED',
          message: '请先登录账号',
          loginUrl: requirePlayerLoginURL(from),
        });
      } catch (loginError) {
        if (loginError instanceof PlayerLoginURLNotConfiguredError) {
          return res.status(503).json({
            code: loginError.code,
            message: loginError.message,
          });
        }
        return res.status(503).json({
          code: 'LOGIN_URL_INVALID',
          message: (loginError as Error).message,
        });
      }
    }
    const sharedLogger = await getSharedLogger();
    const sessionError = err as {
      code?: string | number;
      message?: string;
      response?: { status?: number };
    };
    if (sessionError?.code === 21005004) {
      sharedLogger.info(
        `Container creation in progress for contentId: ${contentId}. Client to retry. Error code: 21005004. Message: ${
          sessionError.message || 'unknown error'
        }`,
      );
      return res.status(202).json({
        message: 'Container is being created, please try again shortly.',
        code: 'CONTAINER_CREATING',
      });
    } else {
      const status = sessionError?.response?.status;
      const responseCode = (err as {
        response?: { data?: { code?: string; message?: string } };
      })?.response?.data?.code;
      if (status === 403 && responseCode) {
        return res.status(403).json({
          code: responseCode,
          message:
            (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || '无权加入该私有房间',
        });
      }
      sharedLogger.error(
        `createSession failed: code=${sessionError?.code || 'unknown'} status=${
          sessionError?.response?.status || 'unknown'
        } message=${sessionError?.message || 'unknown error'}`,
      );
      return res.status(400).json({ message: 'An error occurred' });
    }
  }
};

async function getSessionData(
  req: NextApiRequest,
  res: NextApiResponse,
  mode: 'play' | 'edit',
  contentId,
  fingerPrint: string = '',
  serverId: string = '',
  containerName: string = '',
) {
  const ServerConfig = await getServerConfig();
  const configuredTimeout = Number(process.env.BOX_CREATE_SESSION_TIMEOUT_MS);
  const createSessionTimeout =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : ServerConfig.isLocalGameServer
      ? 120_000
      : 20_000;
  let teamId = '';
  let refererServerId = '';
  let runtimeAuth = req.headers.auth || '';
  let runtimeFingerPrint = fingerPrint;
  let authenticatedSubjectId = '';
  let privateRoomId = '';

  const requestReferer = req.headers.referer;
  if (requestReferer) {
    try {
      const url = new URL(requestReferer);
      teamId = url.searchParams.get('teamId') || '';
      refererServerId = url.searchParams.get('refererServerId') || '';
    } catch {
      console.warn(`Failed to parse request referer: ${requestReferer}`);
    }
  }

  let httpServerUrl: string;
  let socketServerUrl: string;
  if (ServerConfig.isLocalGameServer === true) {
    if (
      (process.env.BOX_DEPLOYMENT_MODE === 'play' ||
        process.env.BOX_DEPLOYMENT_MODE === 'creator') &&
      process.env.BOX_PLAYER_SERVICE_INTERNAL_URL
    ) {
      const resolved = await resolvePlayerServiceIdentity(
        req,
        res,
        getRealIP(req, ServerConfig.trustProxy) || '',
      );
      const identity = resolved.identity;
      runtimeAuth = resolved.assertion;
      runtimeFingerPrint = identity.subjectId;
      authenticatedSubjectId = identity.subjectId;
    }
    if (mode === 'play' && serverId && serverId !== 'public') {
      const controlURL = process.env.BOX_PLAY_TELEPORT_CONTROL_URL || '';
      const internalToken = process.env.BOX_TELEPORT_INTERNAL_TOKEN || '';
      if (!controlURL || !internalToken) {
        throw new Error('本地传送房间服务未配置');
      }
      if (!authenticatedSubjectId) {
        throw new PlayerAuthenticationRequiredError();
      }
      await axios.post(
        `${controlURL.replace(/\/$/, '')}/authorize`,
        {
          // Teleport allocation returns the target world's local play route
          // as playHash. The internal control service resolves this route and
          // verifies it against the room's permanent target map ID.
          targetMapReference: containerName,
          serverId,
          subjectId: authenticatedSubjectId,
        },
        {
          headers: { 'x-box-teleport-token': internalToken },
          timeout: 10_000,
        },
      );
      privateRoomId = serverId;
    }
    const localRuntimeURL = mode === 'edit'
      ? ServerConfig.localEditServerURL
      : ServerConfig.localGameServerURL;
    const runtimeMapPath = `${encodeURIComponent(containerName)}${
      privateRoomId
        ? `/__room/${encodeURIComponent(privateRoomId)}`
        : ''
    }`;
    httpServerUrl = process.env.BOX_DEPLOYMENT_MODE === 'creator' ||
      (mode === 'play' && process.env.BOX_PLAY_LIBRARY_PATH)
      ? `${localRuntimeURL.replace(/\/$/, '')}/${runtimeMapPath}`
      : localRuntimeURL;
    if (
      process.env.BOX_DEPLOYMENT_MODE === 'creator' ||
      (mode === 'play' && process.env.BOX_PLAY_LIBRARY_PATH)
    ) {
      const runtime = await prepareLocalRuntimeSession(
        httpServerUrl,
        undefined,
        req.headers['x-box-runtime-restart'] === '1',
      );
      if (!runtime.ready) return undefined;
    }
    // 本地就直接把 http server url 处理成 socket server url
    socketServerUrl = httpServerUrl.replace('http', 'ws');
  } else {
    const createraInstance = await getCreateraInstance();
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
      ip: getRealIP(req, ServerConfig.trustProxy),
      reqUrl: req.headers.referer || '',
      fingerPrint: runtimeFingerPrint,
      cookie: req.headers ? req.headers.cookie || '' : '',
      auth: runtimeAuth,
    },
    {
      headers: {
        'Authorization': ServerConfig.BACKEND_AUTH_CODE,
        // 透传用户的 Host 给 GameServer，作为判断 Region 等信息的依据
        'X-Forwarded-Host': req.headers.host,
      },
      timeout: createSessionTimeout,
    },
  );
  const json = data.data;
  if (json.data) {
    const deploymentMode = process.env.BOX_DEPLOYMENT_MODE;
    if (deploymentMode === 'creator') {
      const forwardedProto = ServerConfig.trustProxy
        ? Array.isArray(req.headers['x-forwarded-proto'])
          ? req.headers['x-forwarded-proto'][0]
          : req.headers['x-forwarded-proto']
        : undefined;
      const protocol = forwardedProto === 'https' ? 'wss' : 'ws';
      const requestHost = req.headers.host || '127.0.0.1:3000';
      const roomPath = privateRoomId
        ? `/__room/${encodeURIComponent(privateRoomId)}`
        : '';
      json.data.socketServerUrl = `${protocol}://${requestHost}/runtime/${mode}/${encodeURIComponent(containerName)}${roomPath}`;
    } else if (deploymentMode === 'play') {
      const runtimePath = process.env.BOX_PLAY_LIBRARY_PATH && mode === 'play'
        ? `/runtime/play/${encodeURIComponent(containerName)}${
            privateRoomId
              ? `/__room/${encodeURIComponent(privateRoomId)}`
              : ''
          }`
        : `/runtime/${mode}`;
      if (ServerConfig.serverPublicUrl) {
        const publicURL = ServerConfig.serverPublicUrl.replace(/\/$/, '');
        json.data.socketServerUrl = `${publicURL.replace(/^http/, 'ws')}${runtimePath}`;
      } else {
        const forwardedProto = ServerConfig.trustProxy
          ? Array.isArray(req.headers['x-forwarded-proto'])
            ? req.headers['x-forwarded-proto'][0]
            : req.headers['x-forwarded-proto']
          : undefined;
        const protocol = forwardedProto === 'https' ? 'wss' : 'ws';
        const host = req.headers.host || '127.0.0.1:3000';
        json.data.socketServerUrl = `${protocol}://${host}${runtimePath}`;
      }
    } else {
      json.data.socketServerUrl = socketServerUrl;
    }
  }

  return json.data;
}
