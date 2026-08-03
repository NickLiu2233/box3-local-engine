import { addHttpAnalytics } from '@box-local/analytics/http';
import { BoxApiClient } from '@box-local/box-api-client';
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
import { GameSessionData, UserDetailSchema } from '@box-local/schema/session/schema';
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
import { apis } from './apis';
import { BLOCK_INFO_RES } from './assets/block_info';
import { BackendClientRPCNode } from './backend-rpc-client-node';
import { EditServer, startEditServer } from './edit/edit-server';
import { GameServer } from './index';
import { RabbitMQ } from './mq/rabbitMQ';
import { NetLogServer } from './net-log/server';
import { PlayServer, startPlayServer } from './play/play-server';
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
  let server: EditServer | PlayServer;
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
    server = await startEditServer({
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
    game = server.state.game;
  } else {
    server = await startPlayServer({
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
    game = server.state.game;
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

  // install some handlers to poll when the container needs to save or ping the backend
  if (serverConfig.containerName) {
    const server_name = serverConfig.containerName;
    brpc.analytics.addEvent({
      name: 'game-server-startup',
      server_name,
    });
    let prevCpuUsage = process.cpuUsage();
    let prevMeasureTime = new Date().valueOf();
    let prevUpBandwidth = 0;
    let prevDownBandwitdh = 0;
    let prevFrameskips = game.state.clock.frameSkip;
    spec.httpEvent.sub((req) => {
      addHttpAnalytics(server_name, brpc.analytics, req);
    });
    setInterval(() => {
      brpc.analytics.addEvent({
        name: 'player-counts',
        server_name,
        extra: game.state.connectionSet.length.toString(),
      });
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      const now = new Date().valueOf();
      const dt = (now - prevMeasureTime) * 1000;
      brpc.analytics.addTop({
        server_name,
        rss: memoryUsage.rss,
        heap_total: memoryUsage.heapTotal,
        heap_used: memoryUsage.heapUsed,
        external: memoryUsage.external,
        time_user: cpuUsage.user,
        time_system: cpuUsage.system,
        cpu_user: (cpuUsage.user - prevCpuUsage.user) / dt,
        cpu_system: (cpuUsage.system - prevCpuUsage.system) / dt,
      });
      prevMeasureTime = now;
      prevCpuUsage = cpuUsage;

      let upBandwitdh = 0;
      let downBandwitdh = 0;
      game.server.bandwidth.forEach((bw) => {
        for (const id in bw) {
          const { sent, received } = bw[id];
          for (const m in sent) {
            upBandwitdh += sent[m].bytes;
          }
          for (const m in received) {
            downBandwitdh += received[m].bytes;
          }
        }
      });
      const frameskips = game.state.clock.frameSkip - prevFrameskips;
      spec.frameskipsManager.push(frameskips);
      brpc.analytics.addEngine({
        server_name,
        up_bandwidth: upBandwitdh - prevUpBandwidth,
        down_bandwidth: downBandwitdh - prevDownBandwitdh,
        clock: game.state.clock.clock,
        tick: game.state.clock.tick,
        frameskips,
        entities: game.state.entity.entities.length,
        connections: game.state.connectionSet.length,
        chats: 0,
        bodies: game.state.bodies.length,
        contacts: game.state.contact.length,
        particles: game.state.particles.entities.length,
        players: game.state.players.length,
        player_inputs: game.state.playerInputs.length,
        server_players: game.state.serverPlayers.length,

        // ipfs logs
        ipfs_up: game.state.perf.ipfsWriteBytes,
        ipfs_down: game.state.perf.ipfsReadBytes,
        ipfs_error: game.state.perf.ipfsMiss,

        // number of lines logged
        script_log: game.state.perf.scriptLogLines,
        script_error: game.state.perf.scriptErrors,

        // sql stats
        sql_queries: game.state.perf.sqlQueries,
        sql_rows: game.state.perf.sqlRows,
        sql_errors: game.state.perf.sqlErrors,

        // closed sockets
        socket_closed: game.state.perf.socketClosed,

        // ping stats
        min_ping: game.state.perf.minPing,
        max_ping: game.state.perf.maxPing,
        avg_ping:
          game.state.perf.avgPing / Math.max(1, game.state.perf.pingCount),

        // tick stats
        min_tick: game.state.perf.minTickTime,
        max_tick: game.state.perf.maxTickTime,
        avg_tick:
          game.state.perf.avgTickTime /
          Math.max(1, game.state.perf.tickCounter),
      });
      game.state.perf.maxPing =
        game.state.perf.pingCount =
        game.state.perf.avgPing =
        game.state.perf.maxTickTime =
        game.state.perf.avgTickTime =
        game.state.perf.tickCounter =
          0;
      game.state.perf.minPing = game.state.perf.minTickTime = Infinity;
      prevUpBandwidth = upBandwitdh;
      prevDownBandwitdh = downBandwitdh;
      prevFrameskips = game.state.clock.frameSkip;
    }, 60 * 1000);
    spec.logger.info('Setting up container status polling.');
    let zeroPlayerTime = game.state.clock.clock;
    game.onTick.sub(async () => {
      if (game.state.connectionSet.length === 0) {
        const now = game.state.clock.clock;
        if (!zeroPlayerTime) {
          zeroPlayerTime = now;
        } else if (now - zeroPlayerTime > serverConfig.maxZeroPlayerTime) {
          zeroPlayerTime = now;
          spec.logger.info(`No players, suspend game ${server_name}.`);
          if (server instanceof EditServer) {
            try {
              await server.replica.saveProject();
            } catch (e) {
              spec.logger.error(e, 'Saving game failed.');
            }
            spec.logger.info(`Game saved on ${server_name}.`);
          }
          apis.createra
            .containerDeleteByName({ containerName: server_name })
            .then((res) => {
              spec.logger.info(
                `Delete container ${server_name} result: ${res}`,
              );
            })
            .catch((e) => {
              spec.logger.error(e, 'Delete container failed.');
            });
          brpc.analytics.addEvent({
            name: 'game-server-suspend',
            server_name: server_name,
          });
        }
      } else {
        zeroPlayerTime = 0;
      }
    });
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
    let userData = UserDetailSchema.clone(UserDetailSchema.identity);
    // 这里只要有cookie就会走下去，无论是否是鉴权的cookie
    if ((cookie || token) && serverConfig.method !== 'local') {
      spec.logger.info(`verify cookie ${cookie} , ${token}`);
      try {
        // 创建 Box API 客户端实例
        const apiClient = new BoxApiClient({
          baseUrl: serverConfig.INTRANET_BOX_API_URL || 'http://localhost:3003',
        });

        // 如果有 cookie，则设置 Cookie
        if (cookie) {
          apiClient.setCookie(cookie);
        }

        // 调用 getMyProfile 获取用户信息
        const profileData = await apiClient.users.getMyProfile();

        // 映射 API 响应数据到 UserDetail 结构
        // 只设置需要的必要字段，其它字段保持默认值
        userData.id = profileData.userId.toString();
        userData.displayname = profileData.displayName;
        userData.permission = profileData.permission;

        if (profileData.boxId) {
          userData.username = profileData.boxId;
        }
        if (profileData.language) {
          userData.language = profileData.language;
        }

        if (profileData.avatarUrl) {
          userData.avatar_hash = profileData.avatarUrl;
        }
      } catch (e) {
        spec.logger.info(`Verify cookie failed: ${e}`);
        userData.id = '';
      }
    }
    if (userData.id) {
      spec.logger.info('User login: %s', userData.displayname);

      // check user id ban
      if (game.state.banned[userData.id]) {
        spec.logger.info(
          `Banned user ${userData.id} @ ${ipAddress}, sending to ${serverConfig.banRedirect} for punishment.`,
        );
        return redirect(serverConfig.banRedirect);
      }
    } else if (login === 'admin') {
      // fake admin login
      const adminId = (Math.random() * 99999) | 0;
      const adminName = 'admin' + adminId;
      spec.logger.info('Creating fake admin account = ' + adminId);
      userData = getFakeUser(adminName, adminId);
      userData.permission |= DB.UserPermission.gameAdmin;
    } else {
      // guest login
      spec.logger.info(`Guest log in.`);
      UserDetailSchema.free(userData);
      userData = getFakeUser('guest');
    }

    // editor specific authentication
    if (server instanceof EditServer) {
      // check for permission token
      if (reqUrl) {
        const query = url.parse(reqUrl, true).query;
        if (query.p && userData.id) {
          spec.logger.info('editor: redeeming query token');
          await server.replica.redeemToken(userData.id, '' + query.p);
        }
      }

      if (userData.permission & DB.UserPermission.gameAdmin) {
        // check for game admin overide
        spec.logger.info('editor: admin access');
        server.state.replica.adminUsers[userData.id] = true;
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
          name: process.env.BOX_SERVER_NAME || 'BOX Dedicated Server',
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
