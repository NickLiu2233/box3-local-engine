import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { PortalConfig } from './config';
import { AuthProxy } from './auth';
import { Http, HttpError, StaticFiles } from './http';
import prefixServer from '../../../internals/deployment-routing/server.cjs';
prefixServer.install();

/** 对外只需 new PortalServer(config).listen()，也可把 handle 接入现有 Node 服务。 */
export class PortalServer {
    public readonly server = createServer((request, response) => {
        void this.handle(request, response);
    });
    private readonly config:PortalConfig;
    private readonly auth:AuthProxy;
    private readonly files:StaticFiles;
    public constructor(config:PortalConfig) {
        this.config = config;
        this.auth = new AuthProxy(config);
        this.files = new StaticFiles(config.publicDirectory);
    }
    public listen():Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(this.config.port, this.config.host, () => {
                this.server.off('error', reject);
                resolve();
            });
        });
    }
    public close():Promise<void> {
        return new Promise((resolve, reject) =>
            this.server.close((error) => (error ? reject(error) : resolve())),
        );
    }
    public async handle(request:IncomingMessage, response:ServerResponse):Promise<void> {
        const basePath = this.config.publicURL?.pathname.replace(/\/$/, '') || '';
        const peerPaths = [this.config.playURL, this.config.creatorURL]
            .filter(
                (url):url is URL => Boolean(url) && url!.origin === this.config.publicURL?.origin,
            )
            .map((url) => url.pathname.replace(/\/$/, ''));
        Object.defineProperty(response, '__boxPrefixConfig', { value: { basePath, peerPaths } });
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Referrer-Policy', 'same-origin');
        try {
            const url = new URL(request.url || '/', 'http://localhost');
            if (
                basePath &&
                (url.pathname === basePath || url.pathname.startsWith(basePath + '/'))
            ) {
                url.pathname = url.pathname.slice(basePath.length) || '/';
            }
            // 健康检查与账号/上游解耦，避免上游故障造成门户反复重启。
            if (request.method === 'GET' && url.pathname === '/api/health-check') {
                return Http.json(response, 200, { status: 'ok', service: 'player-auth-portal' });
            }
            if (await this.auth.handle(request, response, url)) {
                return;
            }
            if (request.method === 'GET' && (await this.files.serve(response, url.pathname))) {
                return;
            }
            Http.error(response, 404, 'NOT_FOUND', '页面不存在');
        } catch (error) {
            if (error instanceof HttpError) {
                Http.json(
                    response,
                    error.status,
                    { code: error.code, message: error.message },
                    error.headers,
                );
            } else {
                Http.error(response, 500, 'INTERNAL_ERROR', '服务暂时不可用');
            }
        }
    }
}
