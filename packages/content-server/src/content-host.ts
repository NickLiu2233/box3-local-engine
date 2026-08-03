import http from 'http';
import mime from 'mime';
import { ContentServer } from './index';

type Route = (
  pathname: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<void | undefined | {}>;

interface Router {
  [basePath: string]: Route;
}

function log(...args: any[]) {}

function log_error(...args: any[]) {
  console.error(...args);
}

function error(res: http.ServerResponse, code: number, reason: string) {
  log_error(`${code} error: "${reason}"`);
  let publicReason = reason;
  if (499 < code && code < 600) {
    publicReason = 'Internal Server Error';
  }
  res.writeHead(code, publicReason);
  res.end();
}

function bad_method(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  method: string,
): boolean {
  if (req.method == method) {
    return false;
  }
  error(res, 405, `this route must be called with method: ${method}`);
  return true;
}

export function createContentRouter(contentServer: ContentServer) {
  const endpointRegex = /^\/block\/?/;
  const argRegex = /^\/\w+\/(\w+)\/?/;
  const getArg = (pathname) => {
    const match = argRegex.exec(pathname);
    if (match == null || match == undefined) {
      return null;
    }
    return match[1];
  };

  const router: Router = {
    store: async (pathname, req, res) => {
      log(`in store`);
      if (bad_method(req, res, 'POST')) {
        return;
      }
      return new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        req.on('data', (chunk) => {
          if (typeof chunk === 'string') {
            error(res, 500, `got string instead of buffer in store`);
            resolve();
            return;
          }
          buffers.push(chunk);
        });
        req.on('end', async () => {
          const data = Buffer.concat(buffers);
          try {
            const hash = await contentServer.store(data);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.end(hash);
            log(`store success`);
            resolve();
          } catch (e) {
            error(res, 500, e.toString());
            resolve();
          }
        });
      });
    },

    retrieve: async (pathname, req, res) => {
      log('in retrieve');
      if (bad_method(req, res, 'GET')) {
        return;
      }
      const arg = getArg(pathname);
      if (arg == null) {
        error(res, 400, `bad arg: "${pathname}"`);
        return;
      }
      const buffer = await contentServer.retrieve(arg);
      if (buffer == undefined) {
        return error(res, 404, `nothing with that hash found`);
      }
      log(`retrieve success`);
      log(buffer.toString());
      const type = mime.getType(pathname);
      if (type) {
        res.setHeader('Content-Type', type);
      }
      res.end(buffer);
    },
  };

  return async (req, res) => {
    // TODO if in production, restrict POST CORS
    res.setHeader(
      'Access-Control-Allow-Origin',
      (req.headers && req.headers.origin) || '*',
    );
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method == 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    if (!req.url) {
      return error(res, 400, `no endpoint, empty url`);
    }
    try {
      const pathname = req.url;
      if (!pathname) {
        return error(res, 400, `bad url ${req.url}`);
      }
      if (!endpointRegex.test(pathname)) {
        return error(res, 404, `unrecognized endpoint ${req.url}`);
      }
      const { method } = req;
      let action: string;
      if (method === 'GET') {
        action = 'retrieve';
      } else if (method === 'POST') {
        action = 'store';
      } else {
        return error(
          res,
          405,
          `Method ${method} not allowed of url ${req.url}`,
        );
      }
      router[action](pathname, req, res).catch((e) => {
        return error(res, 500, e.toString());
      });
    } catch (e) {
      return error(res, 500, e.toString());
    }
  };
}
