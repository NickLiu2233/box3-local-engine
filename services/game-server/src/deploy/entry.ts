import http from 'http';
import url from 'url';

import { apis } from '../apis';
import { VBMigration } from './vb-migartion';
import { ServerRuntimeConfig } from '../../config/server';
import { rootLogger } from '../utils/logger';

let logger = rootLogger.child({ caller: 'deploy-server' });

export const startDeployServer = async (config: ServerRuntimeConfig) => {
  console.log(
    'deploy game server.  node' + process.version,
    'image version: ',
    config.containerImageVersion,
    'appId:',
    config.APP_ID,
  );

  const vbMigration = new VBMigration({
    logger: logger.child({ caller: 'vb-migration' }),
    createraURL: config.CREATERA_BACKEND_SERVER_URL,
    maxContentServerConnections: config.MAX_CONTENT_SERVER_CONNECTIONS,
    ossCdnURL: config.OSS_CDN_URL,
    contentServerURL: config.CONTENT_SERVER_URL,
  });
  apis.createra
    .containerInsertImageHash({
      appId: config.APP_ID || '',
      engineVersion: config.containerImageVersion,
    })
    .then((res) => {
      console.log('update success', res);
    })
    .catch((error) => {
      logger.error('update image hash error!');
      throw new Error(JSON.stringify(error));
    });

  const httpHandler = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    if (!req.url) {
      res.writeHead(400);
      return res.end(`url cannot be empty`);
    }
    const httpRoutes = {
      '/api/health-check': async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(`{status:"good"}`);
      },
      '/api/vb-migration': (
        req: http.IncomingMessage,
        res: http.ServerResponse,
      ) => {
        let chunks: string = '';

        return new Promise<void>(async (resolve) => {
          req.on('data', (chunk) => {
            chunks += chunk;
          });

          req.on('end', async () => {
            const migration = await vbMigration.migrateList({
              requestStr: chunks,
            });

            if (!migration.isSuccess) {
              logger.error(`Migrate VB list error, ${migration.errorMsg}`);
            }

            // 总是正常返回数据，后端通过isSuccess判断是否成功
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(migration));
          });

          resolve();
        });
      },
    };
    const { pathname } = url.parse(req.url);
    if (pathname) {
      const routeHandler = httpRoutes[pathname];
      if (routeHandler) {
        return await routeHandler(req, res);
      }
    }
    logger.warn('bad route');
    res.writeHead(404);
    res.end('resource not found');
  };

  const httpServer = http.createServer(httpHandler);

  httpServer.listen(config.port);

  logger.info(`server listening on ${config.port}`);
};
