import path from 'node:path';
import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  hash: true,
  base: '/player-admin/',
  publicPath: '/player-admin/',
  proxy: {
    '/api': {
      target: process.env.PLAYER_ADMIN_DEV_API_URL || 'http://127.0.0.1:3124',
      changeOrigin: true,
    },
  },
  outputPath: path.resolve(__dirname, '../game/public/player-admin'),
  npmClient: 'pnpm',
  // 静态站点由 Next 入口重定向到 /player-admin/index.html；该路径相对于
  // Umi 的 base 是 /index.html，必须显式注册，否则路由不会挂载任何页面。
  routes: [
    { path: '/', component: '@/pages/index' },
    { path: '/index.html', component: '@/pages/index' },
  ],
  // 图标位于本应用的 public 目录；不要传构建机上的绝对文件路径，
  // 否则浏览器会把它当成无法访问的 HTTP 地址。
  favicons: ['/player-admin/favicon.png'],
  title: '玩家账号管理',
});
