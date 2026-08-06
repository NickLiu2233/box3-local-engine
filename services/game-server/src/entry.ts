import fs from 'fs';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import ip from 'ip';
import { AddressInfo } from 'net';
import path from 'path';
import url from 'url';

import axios from 'axios';
import { MockBuildCache } from '@box-local/build-system/build-cache-mock';
import { BuildSystem } from '@box-local/build-system/build-system';
import type { RetrievedGroupProjectMetaData } from '@box-local/build-system/group-project/index';
import { createDefaultPermissions } from '@box-local/build-system/permissions/permission-init';
import { PrebakeCacheSchema } from '@box-local/build-system/project/prebake-schema';
import { storeProject } from '@box-local/build-system/project/project-serialize';
import { prebakeMap } from '@box-local/build-system/tasks/prebake';
import { CachingContentServer } from '@box-local/content-server/caching-content-server';
import { ContentSplitter } from '@box-local/content-server/content-split';
import { createContentRouter } from '@box-local/content-server/content-host';
import { FileSystemContentServer } from '@box-local/content-server/file-system-store-node';
import { GoIPFSStore } from '@box-local/content-server/ipfs-http-store-node';
import { ObjectStoreService } from '@box-local/content-server/object-store-service';
import { MuSystemScheduler } from '@box-local/mudb/scheduler/system';
import { MuReadStream, MuWriteStream } from '@box-local/mudb/stream';
import { GroupProjectStore } from '@box-local/schema/group-project/rda';
import { PermissionRDA } from '@box-local/schema/permissions/permission-rda';
import {
  ExtraProjectInfoSchema,
  HotProjectSchema,
} from '@box-local/schema/project/hot-schema';
import { ProjectRDA } from '@box-local/schema/project/project-rda';
import { ProjectAction } from '@box-local/schema/replica/replica-schema';
import {
  SchemaTraceEntry,
  traceMathSchemas,
  traceSchema,
  trapDoubleFree,
} from '@box-local/schema/utils/trace-schema';
import { consoleSink } from '@box-local/utils/console-sink';
import { EventBus } from '@box-local/utils/event';
import { filterSink } from '@box-local/utils/filter-sink';
import { NodeFetch } from '@box-local/utils/http-fetch/node';
import { getRealIP } from '@box-local/utils/ip';
import { Logger } from '@box-local/utils/logger';
import { clearMemoryPool } from '@box-local/utils/pool';
import { prettySink } from '@box-local/utils/pretty-log-sink';
import { BackendSocket } from '../backendSocket';
import { ServerRuntimeConfig } from '../config/server';
import { apis } from './apis';
import { BLOCK_INFO_RES } from './assets/block_info';
import { BackendClientRPCNode } from './backend-rpc-client-node';
import { createGameServer, HttpRoutes } from './createServer';
import { GameServerStateSchema } from './game-server-schema';
import { checkAndUpdateDefaultScreenId } from './game-ui/util';
import {
  getGroupProjectBySocket,
  getGroupProjectMetaData,
  getPlayDataFromBackend,
  subscribeGroupProjectSocket,
} from './group-project';
import { migrateVoxelModels } from './migrate-voxel-models';
import { RabbitMQ } from './mq/rabbitMQ';
import { getExtraProject } from './project/project-extra';
import { createDefaultProject } from './project/project-init';
import {
  getLocalExtraProjectStateHash,
  persistLocalProjectState,
} from './project/local-project-state';
import { BuildSystemRemote } from './service/build-system-remote';
import {
  applyServerPermissions,
  getServerPermissionsFromPrebake,
} from './utils/convert-createra-permission';
import { FrameskipsManager } from './utils/frameskips-manager';
import { LOGGER_HOST_UUID, rootLogger } from './utils/logger';
import { Ivm2ScriptServer } from './utils/script-server/ivm2/ivm2-script-socket-server';
import { IvmpScriptSocketServer } from './utils/script-server/ivmp/ivmp-script-socket-server';
import { LocalScriptSocketServer } from './utils/script-server/local-script-socket';
import { ScriptServer } from './utils/script-server/type';

export async function startServer(spec: ServerRuntimeConfig) {
  const isLocal = spec.method === 'local';
  const httpsConfig =
    spec.httpsCert && spec.httpsKey
      ? {
          cert: spec.httpsCert,
          key: spec.httpsKey,
        }
      : undefined;

  const isHttps = spec.isHttps && !!httpsConfig;
  const isDevelopment = spec.env === 'development';
  const startTime = Date.now();

  // create logger
  const legacyLogger = new Logger(
    filterSink(
      !spec.debug ? consoleSink : prettySink,
      spec.LOG_LEVEL,
      spec.logPrefixRegex,
    ),
    ['server'],
    LOGGER_HOST_UUID,
  );

  const logger = rootLogger;

  // install error handler
  process.on('unhandledRejection', (reason) => {
    if (reason instanceof Error) {
      logger.error(reason, 'Unhandled rejection.');
    } else {
      logger.error(new Error(JSON.stringify(reason)), 'Unhandled rejection.');
    }
  });

  process.on('uncaughtException', (err) => {
    logger.error(err, 'Uncaught error.');
  });

  // print a start up message
  if (isDevelopment) {
    logger.warn('Server in development mode.');
  } else {
    logger.info('Server in production mode.');
  }

  // ip address
  const address = ip.address();
  // TODO: 移除直接赋值操作
  if (!spec.permissionTokenSecret) {
    // Local/private deployments must not share a predictable signing secret.
    // A host can provide PERMISSION_TOKEN_SECRET for a stable value.
    spec.permissionTokenSecret = crypto.randomBytes(32).toString('hex');
    logger.warn('PERMISSION_TOKEN_SECRET is unset; generated an ephemeral secret.');
  }

  // log container name
  logger.info(`container = ${spec.containerName}`);

  // install schema tracing handlers
  const traces: SchemaTraceEntry[] = [];
  if (spec.traceAlloc || spec.traceDoubleFree) {
    logger.debug('Tracing enabled.');
    traceMathSchemas(traces);
    traceSchema('server-state', GameServerStateSchema, traces);
    traceSchema('rda-state', ProjectRDA.stateSchema, traces);
    traceSchema('rda-store', ProjectRDA.storeSchema, traces);
    traceSchema('rda-action', ProjectRDA.actionSchema, traces);
    traceSchema('permission-state', PermissionRDA.stateSchema, traces);
    traceSchema('permission-store', PermissionRDA.storeSchema, traces);
    traceSchema('permission-action', PermissionRDA.actionSchema, traces);
  }
  if (spec.traceDoubleFree) {
    logger.debug('Throw on double free enabled.');
    trapDoubleFree(traces);
  }

  // create content server
  const localContentServer = new FileSystemContentServer(
    path.join(spec.storagePath, 'blobs'),
  );
  const localContentWithVoxa = {
    init: () => localContentServer.init(),
    store: (content: Uint8Array) => localContentServer.store(content),
    retrieve: async (hash: string) => {
      const local = await localContentServer.retrieve(hash);
      if (local) return local;

      const voxaURL =
        process.env.VOXA_INTERNAL_URL || process.env.VOXA_URL;
      if (!voxaURL) return undefined;
      try {
        const response = await axios.get(
          `${voxaURL.replace(/\/$/, '')}/api/local/blobs/${hash}`,
          { responseType: 'arraybuffer', timeout: 30_000 },
        );
        return new Uint8Array(response.data);
      } catch (error) {
        logger.debug(`local VOXA blob not found: ${hash}: ${String(error)}`);
        return undefined;
      }
    },
  };
  const contentServer = isLocal
    ? new ContentSplitter(
        new CachingContentServer(logger, localContentWithVoxa),
      )
    : new ContentSplitter(
        new CachingContentServer(
          logger,
          new GoIPFSStore({
            logger,
            uri: spec.CONTENT_SERVER_URL,
            pin: spec.mode === 'edit' && !isDevelopment,
            maxConcurrency: spec.MAX_CONTENT_SERVER_CONNECTIONS,
          }),
        ),
      );
  await contentServer.init();

  const ossContentServer = isLocal
    ? localContentServer
    : new ObjectStoreService({
        logger,
        uri: spec.INTRANET_CREATERA_BACKEND_SERVER_URL,
        maxConcurrency: spec.MAX_CONTENT_SERVER_CONNECTIONS,
        cdnPath: spec.OSS_CDN_URL,
      });
  await ossContentServer.init();

  // set up backend rpc server
  const brpc = new BackendClientRPCNode(
    spec.INTRANET_BACKEND_SERVER_URL,
    spec.BACKEND_AUTH_CODE,
    legacyLogger,
    isLocal,
  );

  // set up mq server
  const mqServer = new RabbitMQ(spec.RABBITMQ_HOST_URL);
  if (
    spec.paidAccess &&
    spec.RABBITMQ_HOST_URL &&
    process.env.NODE_ENV !== 'development'
  ) {
    try {
      await mqServer.connect();
    } catch (error) {
      logger.error(error, 'Failed to connect to RabbitMQ server.');
    }
  }

  // initialize build system
  logger.info('Initializing build cache.');
  let buildSystem: BuildSystemRemote;
  const bsURL = spec.BUILD_SERVER_URL;
  let nextLocalUid = 1;
  const nextUidListUsingGet = isLocal
    ? async ({ num }: { num: number }) =>
        Array.from({ length: num }, () => `local-${nextLocalUid++}`)
    : apis.groupProject.nextUidListUsingGet;

  if (bsURL) {
    buildSystem = new BuildSystemRemote(
      new NodeFetch(bsURL),
      contentServer,
      ossContentServer,
      nextUidListUsingGet,
      logger.child({ caller: 'build' }),
    );
  } else {
    const buildCache = new MockBuildCache();
    buildSystem = new BuildSystem(
      buildCache,
      contentServer,
      ossContentServer,
      nextUidListUsingGet,
      logger.child({
        caller: 'build-system',
      }),
      false,
    ) as any;
  }

  // create basic http routes
  logger.info('Adding /healthCheck route.');
  const httpRoutes: HttpRoutes = {
    '/api/health-check': async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        runtime: 'ready',
        storage: spec.dataStorageDriver || 'legacy',
      }));
    },
  };
  if (isLocal) {
    const storagePath = process.env.STORAGE_PATH || '';
    const privateBlobManifest = path.join(storagePath, 'private-blobs.json');
    let deniedHashes = new Set<string>();
    if (spec.mode === 'play' && fs.existsSync(privateBlobManifest)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(privateBlobManifest, 'utf8'));
        if (Array.isArray(parsed?.hashes)) {
          deniedHashes = new Set(
            parsed.hashes.filter(
              (hash: unknown): hash is string => typeof hash === 'string',
            ),
          );
        }
      } catch (error) {
        throw new Error(
          `invalid private blob manifest: ${(error as Error).message}`,
        );
      }
    }
    const allowedOrigins = new Set(
      (process.env.BOX_RESOURCE_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
    const contentRouter = createContentRouter(contentServer, {
      allowedOrigins,
      deniedHashes,
      readOnly: spec.mode === 'play',
    });
    httpRoutes['/block'] = async (req, res) => {
      await contentRouter(req, res);
    };
  }

  // load resources
  let contentId = spec.contentId;
  let prebake = PrebakeCacheSchema.identity;
  let scriptServer: ScriptServer;
  let storageMode = spec.storageMode;

  const mapIdString = contentId.toString();

  let groupProjectPendingActions: ProjectAction[][] = [];
  let groupProjectStore: GroupProjectStore | undefined;

  // 创建socket
  const backendSocket = new BackendSocket({
    logger: legacyLogger,
    enabled: !isLocal,
  });

  // init project and set up script server
  await Promise.all(
    [
      async () => {
        // initialize project
        logger.info('Loading project...');

        let hash = spec.hash;
        let userId = spec.userId || 0;
        let authorId = 0;

        // migrate group project
        if (!isLocal && spec.mode === 'edit') {
          let retryCount = 0;
          const maxRetries = 10;
          const retryDelay = 5000; // 5 seconds in milliseconds

          while (retryCount < maxRetries) {
            try {
              await apis.groupProject.migrationUsingGet({
                mapId: mapIdString,
              });
              logger.info('Migration group success!!!!');
              break; // Exit loop on success
            } catch (err) {
              retryCount++;
              if (retryCount >= maxRetries) {
                logger.error(
                  err,
                  `Migration group failed after ${maxRetries} retries. Giving up.`,
                );
                throw err; // Re-throw the error after max retries
              }
              logger.error(
                err,
                `Migration group failed. Retrying attempt ${retryCount}/${maxRetries}...`,
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }

        if (!isLocal && spec.contentId) {
          const containerHash = await apis.createra.getMapHash({
            mapId: contentId.toString(),
            mode: spec.mode,
          });
          hash = containerHash || hash;
        }

        if (!hash) {
          logger.info('Creating default permissions.');
          // if no hash is specified then we create a default debug project
          const projectHash = await createDefaultProject({
            userId,
            buildSystem,
            logger: legacyLogger,
            debugScripts: spec.script ? spec.script.split(',') : [],
            contentServer,
          });
          hash = await createDefaultPermissions({
            userId,
            projectHash,
            buildSystem,
            contentServer,
            logger,
          });
        } else if (spec.mode === 'edit') {
          // special case:  check if input hash is a project hash (ie it comes from a template)
          // if so, then we need to create a default set of permissions for the project
          const json = await buildSystem.retrieveJSON(hash);
          if (!(json.type === 'permission' || json.type === 'permissions')) {
            logger.info('Initializing permissions for user id = ' + userId);
            hash = await createDefaultPermissions({
              userId,
              projectHash: hash,
              buildSystem,
              contentServer,
              logger,
            });
          }
        }

        // Editable projects persist their latest root hash. Published play
        // worlds are intentionally mounted read-only and must never be mutated.
        if (isLocal && spec.mode === 'edit') {
          persistLocalProjectState(hash);
        }

        // get the prebake hash for this project
        logger.info('Permission hash =' + hash);

        // 扩展地图migration脚本
        if (spec.groupId && spec.mode === 'edit') {
          try {
            await apis.createra.migrationUsingGet({ mapId: contentId });
            logger.info('Migration script success.');
          } catch (err) {
            logger.error(err, 'Migration script failed.');
          }
        }

        // get extra project info
        const persistedExtraProjectHash =
          isLocal && spec.mode === 'play'
            ? getLocalExtraProjectStateHash()
            : '';
        let extraProject;
        if (persistedExtraProjectHash) {
          const persistedExtraProject = await contentServer.retrieve(
            persistedExtraProjectHash,
          );
          if (!persistedExtraProject) {
            throw new Error(
              `published model metadata is missing: ${persistedExtraProjectHash}`,
            );
          }
          extraProject = ExtraProjectInfoSchema.patch(
            ExtraProjectInfoSchema.identity,
            new MuReadStream(persistedExtraProject),
          );
          logger.info(
            `Loading published extraProject hash =${persistedExtraProjectHash}`,
          );
        } else {
          extraProject = await getExtraProject(
            contentId,
            spec.mode,
            logger,
          );
        }
        const stream = new MuWriteStream(1);
        ExtraProjectInfoSchema.diff(
          ExtraProjectInfoSchema.identity,
          extraProject,
          stream,
        );
        const extraProjectHash = await contentServer.store(stream.bytes());
        stream.destroy();

        if (isLocal && spec.mode === 'edit') {
          persistLocalProjectState(hash, extraProjectHash);
        }

        // get extra project hash
        logger.info('Loading extraProject hash =' + extraProjectHash);

        let groupProjectMetaData: RetrievedGroupProjectMetaData | undefined;

        /**
         * 获取共享数据
         * - edit
         *   - 有其他可用容器时，获取其他容器的数据（groupProjectStore）
         *   - 否则请求后端，获取哈希数据（groupProjectMetaData）
         * - play
         *   - 直接请求后端，获取哈希数据（groupProjectMetaData）
         */
        if (isLocal) {
          groupProjectMetaData = undefined;
        } else if (spec.mode === 'edit') {
          subscribeGroupProjectSocket(backendSocket, contentId, spec.serverId);

          const res = await getGroupProjectBySocket({
            backendSocket,
            logger,
            bs: buildSystem,
          });

          groupProjectMetaData = res.metaData;
          groupProjectStore = res.store;
          groupProjectPendingActions = res.pendingActions;
        } else {
          groupProjectMetaData = await getGroupProjectMetaData({
            mapId: mapIdString,
            mode: spec.mode,
          });
        }
        if (groupProjectMetaData) {
          logger.info(
            `Has groupProject metaData ${JSON.stringify(groupProjectMetaData)}`,
          );
        }

        const dataFromBackend = isLocal
          ? undefined
          : await getPlayDataFromBackend({
              mapId: mapIdString,
              mode: spec.mode,
              groupProjectMetaData,
            });

        try {
          const prebakeHash = await buildSystem.build(
            'prebakeMap',
            hash,
            BLOCK_INFO_RES.blockInfo,
            HotProjectSchema.identity.version,
            PermissionRDA.stateSchema.identity.version,
            ProjectRDA.stateSchema.identity.version,
            extraProjectHash,
            groupProjectMetaData,
            dataFromBackend,
          );
          logger.info('Loading prebake hash = ' + prebakeHash);
          const engineBytes = await contentServer.retrieve(prebakeHash);
          if (!engineBytes) {
            throw new Error('error loading prebake info');
          }
          prebake = PrebakeCacheSchema.patch(
            PrebakeCacheSchema.identity,
            new MuReadStream(engineBytes),
          );
        } catch (e) {
          logger.error(e, 'PREBAKE IMAGE CORRUPTED, ATTEMPTIGN REBUILD');
          (<any>buildSystem).contentServer = contentServer;
          const prebakeHash = await prebakeMap(
            buildSystem,
            hash,
            BLOCK_INFO_RES.blockInfo,
            HotProjectSchema.identity.version,
            PermissionRDA.stateSchema.identity.version,
            ProjectRDA.stateSchema.identity.version,
            extraProjectHash,
            groupProjectMetaData,
            dataFromBackend,
          );
          logger.info('Recovery prebake hash = ' + prebakeHash);
          const engineBytes = await contentServer.retrieve(prebakeHash);
          if (!engineBytes) {
            throw new Error('error loading prebake info');
          }
          prebake = PrebakeCacheSchema.patch(
            PrebakeCacheSchema.identity,
            new MuReadStream(engineBytes),
          );
        }
        if (!isLocal) {
          await checkAndUpdateDefaultScreenId(prebake, {
            logger,
            mapId: mapIdString,
            mode: spec.mode,
          });
        }

        if (!isLocal && spec.mode === 'edit') {
          // migration
          // 将权限数据转换成java接口入参
          try {
            const params = getServerPermissionsFromPrebake(
              prebake,
              contentId.toString(),
            );
            logger.info('Migration params: %o', params);
            const result =
              await apis.createra.collaborationMigrationUsingPost(params);
            logger.info('Migration result: %o', result);
          } catch (err) {
            logger.error(err, 'Migration failed.');
          }

          // pull
          try {
            const remoteData = await apis.createra.getCollaborationUsingGet({
              mapId: contentId.toString(),
            });
            if (remoteData) {
              applyServerPermissions(remoteData, prebake);
            }
            logger.info('Pull result: %o', remoteData);
          } catch (err) {
            logger.error(err, 'Pull remote failed.');
          }

          // migrate models
          // 这里会重新生成extraProjectInfo
          await migrateVoxelModels(
            prebake,
            buildSystem,
            contentId,
            spec.mode,
            logger,
          );

          // 旧地图迁移/复制地图可能会导致同样的模型名字生成了新的模型ID
          // 在编辑模式下重新根据extraProject中的模型名字重置entityTree中的模型ID
          Object.keys(prebake.coldProject.entitiesTree).forEach((id) => {
            const node = prebake.coldProject.entitiesTree[id];
            if (!node.value) {
              return;
            }
            const meshInfo =
              prebake.extraProjectInfo.meshAssets[node.value.mesh];
            if (!meshInfo) {
              return;
            }
            node.value.meshId = meshInfo.modelId;
          });

          // 重新生成projectHash
          prebake.projectHash = (
            await storeProject(buildSystem, prebake.coldProject)
          ).projectHash;
        }

        // 使用数据库的作者ID覆盖作品文件里面的owner
        prebake.permissions.owner = (authorId || userId).toString();

        logger.info('Project loaded.');
        storageMode = storageMode || prebake.coldProject.storageMode;
      },
      async () => {
        // set up script server
        switch (spec.vm) {
          case 'local':
            scriptServer = new LocalScriptSocketServer(MuSystemScheduler);
            break;
          case 'ivm2':
            const ivm2Script = fs.readFileSync(
              path.resolve(__dirname, './assets/isolate/ivm2-script-entry.js'),
              { encoding: 'utf8' },
            );

            scriptServer = new Ivm2ScriptServer(
              ivm2Script,
              spec.scriptHeapSizeMB,
              spec.scriptTimeout,
            );
            break;
          case 'ivmp':
          default:
            scriptServer = new IvmpScriptSocketServer(
              logger.child({
                caller: 'script-server',
              }),
              LOGGER_HOST_UUID,
              rootLogger.level,
              spec.scriptTimeout,
              spec.SCRIPT_MEMORY_LIMIT,
            );
            break;
        }
      },
    ].map((f) => f()),
  );

  // try to migrate database
  if (storageMode === 'pg') {
    prebake.coldProject.storageMode = storageMode = 'sqlite';
  }
  // create http server
  const httpEvent = new EventBus<http.IncomingMessage>();
  const httpHandler = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    logger.debug(`${getRealIP(req)} ${req.method} - ${req.url}`);
    if (spec.containerName) {
      httpEvent.notify(req);
    }
    if (!req.url) {
      res.writeHead(400);
      return res.end(`url cannot be empty`);
    }
    const { pathname } = url.parse(req.url);
    if (pathname) {
      const routeHandler = httpRoutes[pathname];
      if (routeHandler) {
        return await routeHandler(req, res);
      }
    }
    if (httpRoutes['/block'] && /^\/block/.test(pathname!)) {
      return httpRoutes['/block'](req, res);
    }
    if (
      isLocal &&
      /^\/(engine|avatar|tmp)\//.test(pathname || '')
    ) {
      const hash = path.basename(pathname!).split('.')[0];
      const content = await ossContentServer.retrieve(hash);
      if (!content) {
        res.writeHead(404);
        return res.end('content not found');
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(content);
    }

    logger.warn('Bad route.');
    res.writeHead(404);
    res.end('resource not found');
  };
  const httpServer = isHttps
    ? https.createServer(httpsConfig!, httpHandler)
    : http.createServer(httpHandler);

  // links
  const frameskipsManager = new FrameskipsManager(3);

  // launcher can run in 3 modes:
  //
  //  * proxy: where we proxy against a running game server.  host a locally modified client that fakes out the running game instance
  //  * local: where we run a local development mode version of the game server.  all processes hosted in browser
  //  * web: where the server we run is hosted remotely.  this can be further refined into 2 more categories:
  //      + development: used for testing the game server.  enables debug options and allows for testing user roles
  //      + production: used in production
  //
  logger.info('Creating GameServer.');

  let gameServer = await createGameServer({
    logger: logger,
    legacyLogger: legacyLogger,
    contentServer,
    ossContentServer,
    buildSystem,
    traces,
    brpc,
    mqServer,
    scriptServer: scriptServer!,
    prebake,
    httpRoutes,
    httpServer,
    httpEvent,
    frameskipsManager,
    serverConfig: spec,
    backendSocket,
    pendingActions: groupProjectPendingActions,
    groupStore: groupProjectStore,
  });
  logger.info('GameServer created.');

  // start listening
  if (spec.method === 'local') {
    httpServer.listen(
      spec.port,
      spec.hostIP || '127.0.0.1',
      spec.playerLimit * 10,
    );
  } else {
    httpServer.listen(spec.port, spec.playerLimit * 10);
  }
  logger.info('HTTP server address: ', httpServer.address());
  const realPort = spec.port || (<AddressInfo>httpServer.address()).port;
  let serverName = `${spec.mode}/${spec.method}`;
  if (spec.method === 'local') {
    serverName = 'local';
  }
  logger.info(`${serverName} server listening on ${realPort}`);

  // server address
  logger.info(
    `Server address: ${isHttps ? 'https' : 'http'}://${address}:${realPort}`,
  );

  // print out all http routes
  logger.info(`HTTP routes: ${Object.keys(httpRoutes).join(', ')}`);
  logger.info(
    `Total startup time = ${((Date.now() - startTime) / 1000).toFixed(
      2,
    )} seconds`,
  );

  if (gameServer && !isLocal) {
    const updateMetadata = () => {
      apis.createra
        .containerUpdateMetaData({
          name: spec.containerName,
          ip: spec.hostIP,
          port: realPort,
          players: Object.keys(gameServer!.net.protocol.clients).length,
          id: spec.serverId,
        })
        .then((res) => {
          logger.debug('Update metadata success: %s', res);
        })
        .catch((err) => {
          if (process.env.NODE_ENV !== 'development') {
            logger.error(
              new Error(JSON.stringify(err)),
              'Update metadata error.',
            );
          }
        });
    };
    updateMetadata();
    setInterval(updateMetadata, 10 * 1000);
  }

  // clear memory pool after 1s
  setTimeout(() => {
    clearMemoryPool();
  }, 1000);
}
