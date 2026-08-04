import { ProjectBakeCache } from '@box-local/build-system/project/bake';
import { PrebakeCache } from '@box-local/build-system/project/prebake-schema';
import { BuildSystemAPI } from '@box-local/build-system/type';
import { ContentServer } from '@box-local/content-server';
import { MuSystemScheduler } from '@box-local/mudb/scheduler/system';
import { MuServer } from '@box-local/mudb/server';
import { MuWebSocketServer } from '@box-local/mudb/socket/web/server';
import { DB } from '@box-local/schema/backend/database-type';
import type { GroupProjectStore } from '@box-local/schema/group-project/rda';
import type { ProjectAction } from '@box-local/schema/replica/replica-schema';
import { GameSessionData } from '@box-local/schema/session/schema';
import {
  SchemaTraceEntry,
  traceProtocols,
  trapDoubleFree,
} from '@box-local/schema/utils/trace-schema';
import { bodyParse } from '@box-local/utils/backend';
import { EventBus } from '@box-local/utils/event';
import { getRealIP } from '@box-local/utils/ip';
import { Logger as LegacyLogger } from '@box-local/utils/logger';
import * as http from 'http';
import * as https from 'https';
import type { Logger } from 'pino';
import * as url from 'url';
import { type BackendSocket } from '../backendSocket';
import { ServerRuntimeConfig } from '../config/server';
import { BLOCK_INFO_RES } from './assets/block_info';
import { BackendClientRPCNode } from './backend-rpc-client-node';
import type { EditServer } from './edit/edit-server';
import { GameServer } from './index';
import { RabbitMQ } from './mq/rabbitMQ';
import { NetLogServer } from './net-log/server';
import { startPlayServer } from './play/play-server';
import { getFakeUser } from './session/fake';
import { GameSession } from './session/server';
import { ServerSettings } from './settings/server-settings-schema';
import { computeAudioPrefetch } from './sound/server-sound-controller';
import { MockSQL } from './storage/mock-storage';
import { SQLJS } from './storage/sqljs';
import { CommonSQL } from './storage/types';
import { getHashFromContainerName } from './utils/container-name';
import { FrameskipsManager } from './utils/frameskips-manager';
import { rootLogger } from './utils/logger';
import { ScriptServer } from './utils/script-server/type';
import { parsePrebakeVoxelData } from './voxel/voxel-server';

export type HttpRoutes = {
  [route: string]: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => Promise<void>;
};

// This session id is just used for identifying a socket, should not use cookie session id
function genSessionId() {
  return Math.random().toString(36).substr(2);
}
function getLoginStr(x: string): 'guest' | 'user' | 'admin' | '' | 'cookie' {
  const result = x.toLowerCase();
  if (
    result === 'guest' ||
    result === 'user' ||
    result === 'admin' ||
    result === 'cookie'
  ) {
    return result;
  }
  return '';
}

export async function createGameServer(spec: {
  logger: Logger;
  legacyLogger: LegacyLogger;
  contentServer: ContentServer;
  ossContentServer: ContentServer;
  buildSystem: BuildSystemAPI;
  traces: SchemaTraceEntry[];
  brpc: BackendClientRPCNode;
  mqServer: RabbitMQ;
  scriptServer: ScriptServer;
  prebake: PrebakeCache;
  httpRoutes: HttpRoutes;
  httpServer: http.Server | https.Server;
  httpEvent: EventBus<http.IncomingMessage>;
  frameskipsManager: FrameskipsManager;
  serverConfig: ServerRuntimeConfig;
  backendSocket: BackendSocket;
  pendingActions: ProjectAction[][];
  groupStore?: GroupProjectStore;
}) {
  const serverConfig = spec.serverConfig;
  const login = getLoginStr(serverConfig.login);
  // create mu server
  spec.logger.info('Creating MuServer...');
  const skipProtocolValidation =
    process.env.NODE_ENV !== 'development' && serverConfig.method !== 'local';
  const socketServer = new MuWebSocketServer({
    server: spec.httpServer,
    // TODO 改用 debug
  });
  const muServer = new MuServer(
    socketServer,
    void 0, // TODO 改用 debug
    skipProtocolValidation,
  );

  // set up logging protocol
  const netLog = new NetLogServer({
    server: muServer,
    sink: spec.legacyLogger.sink,
    logger: spec.logger,
  });

  // set up sql stuff
  let sql: CommonSQL = new MockSQL();
  switch (serverConfig.storageMode.toLowerCase()) {
    case 'sqlite':
      spec.logger.warn('Using deprecated sqlite3 database.');
      break;
    case 'sqljs':
      sql = new SQLJS();
      await (<SQLJS>sql).init(serverConfig.CDN_PATH);
      break;
    default:
      // do nothing if using mock database
      break;
  }

  const brpc = spec.brpc;

  // set up session server
  const sessionService = new GameSession(
    spec.legacyLogger.create('session'),
    serverConfig.method === 'local',
  );

  // create the game server
  let editServer: EditServer | undefined;
  let game: GameServer;
  const voxels = parsePrebakeVoxelData(
    spec.prebake.coldProject.voxels,
    spec.prebake.voxelBytes,
  );

  // game state上存储的一份配置
  const serverSettings: ServerSettings = {
    // script safety limits
    scriptTimeout: serverConfig.scriptTimeout,
    scriptHeapSizeMB: serverConfig.scriptHeapSizeMB,
    // script api world.url
    gameURL: [
      serverConfig.ARENA_URL,
      serverConfig.mode === 'edit' ? 'e' : 'p',
      getHashFromContainerName(serverConfig.containerName),
    ].join('/'),
    mode: serverConfig.mode,
    env: serverConfig.env,
    playerLimit: serverConfig.playerLimit,
    autoSaveInterval: serverConfig.autoSaveInterval,
    containerName: serverConfig.containerName,
    containerType: serverConfig.containerType,
    teamId: serverConfig.teamId,
    groupId: serverConfig.groupId,
    contentId: serverConfig.contentId,
    serverId: serverConfig.serverId,
    zeroPlayerTimeout: serverConfig.maxZeroPlayerTime,
    permissionTokenSecret: serverConfig.permissionTokenSecret,

    // database limits
    sqlLiteHeapQuota: serverConfig.sqlLiteHeapQuota,
    dbSizeLimit: serverConfig.dbSizeLimit,
    dbChunkSize: serverConfig.dbChunkSize,

    debug: serverConfig.debug,
    teleportAccess: serverConfig.teleportAccess,
    paidAccess: serverConfig.paidAccess,
  };
  if (serverConfig.mode === 'edit') {
    const { startEditServer } = await import('./edit/edit-server');
    editServer = await startEditServer({
      server: muServer,
      scheduler: MuSystemScheduler,
      buildSystem: spec.buildSystem,
      bake: new ProjectBakeCache(
        spec.contentServer,
        spec.buildSystem,
        BLOCK_INFO_RES.blockInfo,
      ),
      contentServer: spec.contentServer,
      ossContentServer: spec.ossContentServer,
      scriptServer: spec.scriptServer,
      logger: spec.logger,
      legacyLogger: spec.legacyLogger,
      session: sessionService,
      projectHash: spec.prebake.projectHash,
      project: spec.prebake.coldProject,
      extraProject: spec.prebake.extraProjectInfo,
      hotProject: spec.prebake.hotProject,
      settings: serverSettings,
      permissionHash: spec.prebake.permissionsHash,
      permissions: spec.prebake.permissions,
      sql,
      voxels,
      brpc,
      mqServer: spec.mqServer,
      contentId: serverConfig.contentId,
      backendSocket: spec.backendSocket,
      pendingActions: spec.pendingActions,
      groupStore: spec.groupStore,
    });
    game = editServer.state.game;
  } else {
    const playServer = await startPlayServer({
      server: muServer,
      scheduler: MuSystemScheduler,
      contentServer: spec.contentServer,
      ossContentServer: spec.ossContentServer,
      scriptServer: spec.scriptServer,
      logger: spec.logger,
      legacyLogger: spec.legacyLogger,
      session: sessionService,
      hotProject: spec.prebake.hotProject,
      voxel: voxels,
      settings: serverSettings,
      sql,
      brpc,
      mqServer: spec.mqServer,
      backendSocket: spec.backendSocket,
      featureFlags: serverConfig.FEATURE_FLAGS || [],
    });
    game = playServer.state.game;
  }

  // install game traces
  if (serverConfig.traceAlloc || serverConfig.traceDoubleFree) {
    spec.logger.debug('Installing game specific traces');
    const traceStart = spec.traces.length;
    traceProtocols(spec.traces, muServer);
    traceProtocols(spec.traces, game.script.muServer);
    if (serverConfig.traceDoubleFree) {
      trapDoubleFree(spec.traces.slice(traceStart));
    }
  }

  async function initUserData(
    ipAddress: string,
    reqUrl: string,
    cookie: string,
    fingerPrint: string,
    token: string,
    host: string,
  ) {
    function redirect(location: string) {
      return { redirect: location };
    }
    // check IP address ban first
    if (game.state.bannedIP[ipAddress]) {
      spec.logger.info(
        `Banned ip address ${ipAddress}, sending to ${serverConfig.banRedirect} for punishment`,
      );
      return redirect(serverConfig.banRedirect);
    }

    // resolve session data for user
    let sessionData: GameSessionData;
    let userData: GameSessionData['user'];
    if (login === 'admin') {
      // fake admin login
      const adminId = (Math.random() * 99999) | 0;
      const adminName = 'admin' + adminId;
      spec.logger.info('Creating fake admin account = ' + adminId);
      userData = getFakeUser(adminName, adminId);
      userData.permission |= DB.UserPermission.gameAdmin;
    } else {
      // guest login
      spec.logger.info(`Guest log in.`);
      userData = getFakeUser('guest');
    }

    // editor specific authentication
    if (editServer) {
      // check for permission token
      if (reqUrl) {
        const query = url.parse(reqUrl, true).query;
        if (query.p && userData.id) {
          spec.logger.info('editor: redeeming query token');
          await editServer.replica.redeemToken(userData.id, '' + query.p);
        }
      }

      if (userData.permission & DB.UserPermission.gameAdmin) {
        // check for game admin overide
        spec.logger.info('editor: admin access');
        editServer.state.replica.adminUsers[userData.id] = true;
      }
    }

    // bind session token
    const sessionId = genSessionId();
    sessionData = await sessionService.bindUserSession(
      userData,
      ipAddress,
      sessionId,
      reqUrl,
      fingerPrint,
      'CN',
    );

    // prepare user configuration
    const admin = sessionData.isAdmin || login === 'admin';
    let prefetchHashes = await game.prefetch();

    const audioPrefetch = computeAudioPrefetch(game.state);

    prefetchHashes = prefetchHashes.concat(audioPrefetch.notConfigured);

    const config = {
      sessionId: sessionData.sessionId,
      admin,
      maxSockets: 3,
      contentId: serverConfig.contentId,
      prefetchHashes,
      configuredAudioHashes: audioPrefetch.configured,
    };
    spec.logger.debug(
      `${admin ? 'admin' : 'user'} ${sessionData.sessionId} data fetched`,
    );

    return {
      data: config,
    };
  }
  const getHeader = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const setPublicCors = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Auth',
    );
    res.setHeader('Vary', 'Origin');
  };

  const getPublicServerURL = (req: http.IncomingMessage) => {
    const configured = process.env.BOX_SERVER_PUBLIC_URL;
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    const host =
      getHeader(req.headers['x-forwarded-host']) || req.headers.host || '';
    const protocol =
      getHeader(req.headers['x-forwarded-proto']) ||
      (serverConfig.isHttps ? 'https' : 'http');
    return `${protocol}://${host}`;
  };

  const createSession = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    direct: boolean,
  ): Promise<void> => {
    if (direct) {
      setPublicCors(req, res);
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('method not allowed');
      return;
    }

    const body = await bodyParse(req);
    const host =
      getHeader(req.headers['x-forwarded-host']) || req.headers.host || '';
    const result = await initUserData(
      body.ip || getRealIP(req) || '',
      body.reqUrl || req.headers.origin || '',
      body.cookie || '',
      body.fingerPrint || '',
      body.auth || '',
      host,
    );

    res.setHeader('Content-Type', 'application/json');
    if (direct && 'data' in result) {
      const publicServerURL = getPublicServerURL(req);
      const socketServerUrl = publicServerURL.replace(/^http/, 'ws');
      res.end(
        JSON.stringify({
          config: {
            ...result.data,
            socketServerUrl,
          },
        }),
      );
      return;
    }
    res.end(JSON.stringify(result));
  };

  spec.httpRoutes['/createSession'] = (req, res) =>
    createSession(req, res, false);

  if (serverConfig.mode === 'play') {
    spec.httpRoutes['/api/server-info'] = async (req, res) => {
      setPublicCors(req, res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method !== 'GET') {
        res.writeHead(405);
        res.end('method not allowed');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          name: process.env.BOX_SERVER_NAME || 'BOX 世界',
          engineVersion: process.env.BOX_ENGINE_VERSION || '0.1.0',
          protocolVersion: 1,
          contentId: serverConfig.contentId,
          maxPlayers: serverConfig.playerLimit,
        }),
      );
      return;
    };
    spec.httpRoutes['/api/session'] = (req, res) =>
      createSession(req, res, true);
  }
  return game;
}
