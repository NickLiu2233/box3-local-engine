// clone 后直接 npm run dev 即可预览。仅真实联调需要 .env；默认模拟不接触玩家数据。
import { context } from 'esbuild'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { root, targets } from './build.mjs'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { createAuthPortalServer, configFromEnvironment } = require('../server')
const { createMockPlayerService } = require('./mock-player-service.cjs')
process.chdir(root)
if (existsSync('.env')) process.loadEnvFile('.env')
const live = process.argv.includes('--live')
const builds = await Promise.all(targets.map(target => context(target)))
await Promise.all(builds.map(build => build.rebuild()))
await Promise.all(builds.map(build => build.watch()))
let upstream
let config
const listen = (server, port, host) => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(port, host, resolve)
})
if (live) {
  // 明确 opt-in，避免开发者的已有环境变量意外连接到真实服务。
  config = configFromEnvironment()
} else {
  const apiKey = randomBytes(32).toString('hex')
  upstream = createMockPlayerService(apiKey)
  await listen(upstream, 0, '127.0.0.1')
  config = {
    host: '127.0.0.1', port: Number(process.env.PORTAL_DEV_PORT || 4325),
    playerServiceURL: new URL(`http://127.0.0.1:${upstream.address().port}`),
    publicURL: null, creatorURL: null, playURL: null, apiKey,
    requestTimeoutMs: 10000, trustProxy: false, registrationEnabled: true,
  }
  console.log('本地模拟预览（不连接引擎）：demo / demo-password-123；账号修改只保留到进程退出。')
}
const portal = createAuthPortalServer(config)
await listen(portal, config.port, config.host)
console.log(`页面预览：http://${config.host}:${config.port}；保存源码后刷新浏览器。`)
console.log(live ? '真实联调模式：会操作所配置的 Player Service，请只用测试账号。' : '真实联调：npm run dev:live（需要服主提供 .env）。')
async function stop() {
  await Promise.all(builds.map(build => build.dispose()))
  portal.close()
  upstream?.close()
  process.exit(0)
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
