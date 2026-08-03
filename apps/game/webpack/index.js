const { dirname, join } = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackBar = require('webpackbar');

function getWebpackConfig(config,
  { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) {
  const isProd = config.mode === 'production';
  const isPlayerBuild = process.env.BOX_PLAYER_BUILD === 'true';

  const plugins = [
    new WebpackBar({
      name: config.name
    }),
    new webpack.IgnorePlugin({ resourceRegExp: new RegExp(/assets\/server/) }),
  ];

  if (!isPlayerBuild) {
    plugins.push(new CopyWebpackPlugin({
      patterns: [
        {
          from: join(
            dirname(require.resolve('monaco-editor/package.json')),
            'min/vs',
          ),
          to: join(__dirname, '../.next/static/vs'),
          // Terser skip this file for minimization
          info: { minimized: true },
        },
      ],
    }));
  } else {
    const playerOnlyRoot = join(__dirname, '../src/player-only');
    plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^src\/entry\/editor-page$/,
        join(playerOnlyRoot, 'editor-page.tsx'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^src\/entry\/admin-client$/,
        join(playerOnlyRoot, 'admin-client.ts'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /^src\/entry\/admin-ui$/,
        join(playerOnlyRoot, 'admin-ui.ts'),
      ),
    );
  }

  if (isProd) {
    plugins.push(
      new webpack.NormalModuleReplacementPlugin(/regl\.js$/, './regl.min.js'),
    );
  }
  const rules = [
    {
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      type: 'asset/source',
      use: ['glslify-loader'],
    },
    {
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgo: false,
          },
        },
      ],
    },
    {
      // 处理 Script API 的类型文件，用于在编辑器提供代码提示
      test: /\.dts$/i,
      type: 'asset/source'
    },
    {
      test: /\.wgsl$/i,
      type: 'asset/source',
    },
    {
      test: /\.(ttf|otf|woff|woff2)/,
      type: 'asset/resource',
    },
    {
      test: /\.gl(b|tf)$/i,
      type: 'asset/resource',
    }
  ];
  config.resolve = {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      ...(isPlayerBuild
        ? {
            'src/entry/editor-page': join(
              __dirname,
              '../src/player-only/editor-page.tsx',
            ),
            'src/entry/admin-client': join(
              __dirname,
              '../src/player-only/admin-client.ts',
            ),
            'src/entry/admin-ui': join(
              __dirname,
              '../src/player-only/admin-ui.ts',
            ),
          }
        : {}),
    },
    fallback: {
      ...config.resolve?.fallback,
      "fs": false
    }
  }
  config.plugins.push(...plugins);
  config.module.rules.push(...rules);
  return config;
}

module.exports = getWebpackConfig;
