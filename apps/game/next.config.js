const isLocalDev =
  !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const CDNPath = process.env.STATIC_CDN_PATH;
const path = require('path');

// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const config = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  assetPrefix: (!isLocalDev && CDNPath) || '',
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

  // TODO 暂时用不到，app router 不支持，后续有用了补充
  // exportPathMap: async (defaultPathMap, { dev }) => {
  //   if (!dev){
  //     return {
  //       '/404': { page: '/404' },
  //       '/export-p': { page: '/export-p' },
  //     }
  //   }
  //   return {}
  // },
  webpack: (...args) => {
    const getWebpackConfig = require('./webpack');
    return getWebpackConfig(...args);
  },

};

module.exports = config;
