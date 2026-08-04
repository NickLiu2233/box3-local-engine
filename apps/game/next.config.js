const isLocalDev =
  !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const CDNPath = process.env.STATIC_CDN_PATH;
const path = require('path');
const playRuntimeHost =
  process.env.BOX_PLAY_RUNTIME_HOST ||
  process.env.BOX_SERVER_HOST ||
  '127.0.0.1';
const editRuntimeHost =
  process.env.BOX_EDIT_RUNTIME_HOST ||
  process.env.BOX_EDIT_SERVER_HOST ||
  '127.0.0.1';
const playRuntimePort =
  process.env.BOX_PLAY_RUNTIME_PORT ||
  process.env.BOX_SERVER_PORT ||
  '9966';
const editRuntimePort =
  process.env.BOX_EDIT_RUNTIME_PORT ||
  process.env.BOX_EDIT_SERVER_PORT ||
  '9967';
const localPlayRuntime =
  process.env.BOX_INTERNAL_PLAY_RUNTIME ||
  `http://${playRuntimeHost}:${playRuntimePort}`;
const localEditRuntime =
  process.env.BOX_INTERNAL_EDIT_RUNTIME ||
  `http://${editRuntimeHost}:${editRuntimePort}`;

// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const config = {
  productionBrowserSourceMaps: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  assetPrefix: (!isLocalDev && CDNPath) || '',
  experimental: {
    // Runtime assets can be much larger than ordinary page responses. Keep
    // the single-origin proxy from dropping slow map downloads at Next's
    // 30-second default.
    proxyTimeout: 300_000,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/runtime/play',
          has: [{ type: 'header', key: 'upgrade', value: 'websocket' }],
          destination: localPlayRuntime,
        },
        {
          source: '/runtime/play/:path*',
          has: [{ type: 'header', key: 'upgrade', value: 'websocket' }],
          destination: `${localPlayRuntime}/:path*`,
        },
        {
          source: '/runtime/edit',
          has: [{ type: 'header', key: 'upgrade', value: 'websocket' }],
          destination: localEditRuntime,
        },
        {
          source: '/runtime/play/:path*',
          destination: `${localPlayRuntime}/:path*`,
        },
        {
          source: '/runtime/edit/:path*',
          destination: `${localEditRuntime}/:path*`,
        },
        {
          source: '/',
          has: [{ type: 'header', key: 'upgrade', value: 'websocket' }],
          destination: localPlayRuntime,
        },
        {
          source: '/api/session',
          destination: `${localPlayRuntime}/api/session`,
        },
        {
          source: '/api/server-info',
          destination: `${localPlayRuntime}/api/server-info`,
        },
        {
          source: '/block/:path*',
          destination: `${localPlayRuntime}/block/:path*`,
        },
        {
          source: '/engine/:path*',
          destination: `${localPlayRuntime}/engine/:path*`,
        },
        {
          source: '/avatar/:path*',
          destination: `${localPlayRuntime}/avatar/:path*`,
        },
        {
          source: '/tmp/:path*',
          destination: `${localPlayRuntime}/tmp/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  headers() {
    return [
      {
        source: '/:path*',
        // 添加安全性 header 启用内存监控相关的 API
        headers: [
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          }
        ],
      },
      {
        source: '/api/config/play/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/api/getMapInfo',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/api/createSession',
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST,OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*"
          },
        ],
      }
    ]
  },
  images: {
    domains: ['static.box.game', 'static.createra.fun'],
    //https://stackoverflow.com/questions/65487914/error-image-optimization-using-next-js-default-loader-is-not-compatible-with-n
    ...(process.env.NEXT_PUBLIC_EXPORT_MODE === 'true' && {
      loader: 'akamai',
      path: '',
    })
  },

  transpilePackages: [
    '@box-local/build-system',
    '@box-local/env',
    '@box-local/apis',
    'webgpu-utils',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },

  // TODO GameClient 通过 useEffect 初始化但没有提供 unmount，这里不能打开
  reactStrictMode: false,

  webpack: (...args) => {
    const getWebpackConfig = require('./webpack');
    return getWebpackConfig(...args);
  },

};

module.exports = config;
