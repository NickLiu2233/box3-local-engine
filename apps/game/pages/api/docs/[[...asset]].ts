import fs from 'node:fs';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

// The production build copies these assets beside the standalone server.
// Resolving from cwd avoids webpack turning require.resolve() into a module id.
const swaggerRoot = path.join(process.cwd(), 'node_modules/swagger-ui-dist');

const apiDocsEnabled = () =>
  process.env.NODE_ENV !== 'production' ||
  process.env.APP_ENV === 'development' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'development';

const assets: Record<string, { file: string; type: string }> = {
  'swagger-ui.css': {
    file: 'swagger-ui.css',
    type: 'text/css; charset=utf-8',
  },
  'swagger-ui-bundle.js': {
    file: 'swagger-ui-bundle.js',
    type: 'application/javascript; charset=utf-8',
  },
  'swagger-ui-standalone-preset.js': {
    file: 'swagger-ui-standalone-preset.js',
    type: 'application/javascript; charset=utf-8',
  },
};

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BOX3 Local Engine API</title>
    <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
    <style>html{box-sizing:border-box;overflow-y:scroll}*,*:before,*:after{box-sizing:inherit}body{margin:0;background:#fafafa}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/swagger-ui-bundle.js"></script>
    <script src="/api/docs/swagger-ui-standalone-preset.js"></script>
    <script src="/api/docs/initializer.js"></script>
  </body>
</html>`;

const initializer = `window.addEventListener('load', function () {
  window.ui = SwaggerUIBundle({
    url: '/api/openapi',
    dom_id: '#swagger-ui',
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    persistAuthorization: false,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout',
    requestInterceptor: function (request) {
      var entry = document.cookie.split('; ').find(function (item) {
        return item.indexOf('box_local_admin_csrf=') === 0;
      });
      if (entry && !/^(GET|HEAD|OPTIONS)$/i.test(request.method || 'GET')) {
        request.headers['X-Box-Admin-Csrf'] = decodeURIComponent(entry.split('=').slice(1).join('='));
      }
      return request;
    }
  });
});`;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!apiDocsEnabled()) return res.status(404).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
  );
  const value = Array.isArray(req.query.asset) ? req.query.asset.join('/') : req.query.asset;
  if (!value) return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  if (value === 'initializer.js') {
    return res
      .status(200)
      .setHeader('Content-Type', 'application/javascript; charset=utf-8')
      .send(initializer);
  }
  const asset = assets[value];
  if (!asset) return res.status(404).end();
  res.setHeader('Content-Type', asset.type);
  fs.createReadStream(path.join(swaggerRoot, asset.file)).pipe(res);
}
