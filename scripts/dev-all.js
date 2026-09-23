'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn, spawnSync } = require('child_process')

const repoRoot = path.resolve(__dirname, '..')
const children = new Set()
const isWindows = process.platform === 'win32'
const args = new Set(process.argv.slice(2))
const creatorOnly = args.has('--creator-only')
const gameRoot = path.join(repoRoot, 'apps/game')
const baseGameTsconfig = path.join(gameRoot, 'tsconfig.json')

if (fs.existsSync(path.join(repoRoot, '.env')) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(path.join(repoRoot, '.env'))
}

function randomSecret(existing, fallbackLength = 32) {
  return existing || crypto.randomBytes(fallbackLength).toString('hex')
}

function databaseURL() {
  // `rush dev --infra` starts the disposable development PostgreSQL profile.
  // A Desktop-generated .env can still contain BOX_DATABASE_URL for its
  // managed-postgres container, whose hostname and credentials are not valid
  // from source processes. Prefer the infra profile's local connection so
  // development services and the database they just started always match.
  if (args.has('--infra')) {
    const username = process.env.BOX_POSTGRES_USER || 'box'
    const password = process.env.BOX_POSTGRES_PASSWORD || 'local-box-change-me'
    const database = process.env.BOX_POSTGRES_DB || 'box'
    const port = process.env.BOX_POSTGRES_HOST_PORT || '5432'
    return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`
  }
  if (process.env.BOX_DATABASE_URL) return process.env.BOX_DATABASE_URL
  const password = process.env.BOX_POSTGRES_PASSWORD || 'local-box-change-me'
  return `postgresql://box:${encodeURIComponent(password)}@127.0.0.1:5432/box`
}

const sharedEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PERMISSION_TOKEN_SECRET: randomSecret(process.env.PERMISSION_TOKEN_SECRET),
  BOX_TELEPORT_INTERNAL_TOKEN: randomSecret(process.env.BOX_TELEPORT_INTERNAL_TOKEN),
  BOX_PLAYER_AUTH_API_KEY: randomSecret(process.env.BOX_PLAYER_AUTH_API_KEY, 16),
  BOX_DATABASE_URL: databaseURL(),
  BOX_DATABASE_SCHEMA: process.env.BOX_DATABASE_SCHEMA || 'box_engine',
  BOX_IDENTITY_DATABASE_SCHEMA: process.env.BOX_IDENTITY_DATABASE_SCHEMA || 'box_identity',
  BOX_PLAYER_SERVICE_INTERNAL_URL: 'http://127.0.0.1:3124',
  BOX_PLAYER_SERVICE_PUBLIC_URL: 'http://127.0.0.1:3124',
  BOX_CREATOR_PUBLIC_URL: 'http://127.0.0.1:3127',
  BOX_PLAY_PUBLIC_URL: 'http://127.0.0.1:3121',
  BOX_VOXA_PUBLIC_URL: 'http://127.0.0.1:3123',
  BOX_VOXA_ALLOWED_ORIGINS: 'http://127.0.0.1:3123,http://127.0.0.1:3127',
  // Match the production Compose split: Creator uses the internal URL for
  // server-side model API proxying and the public URL for browser embeds.
  VOXA_INTERNAL_URL: 'http://127.0.0.1:3123',
  VOXA_URL: 'http://127.0.0.1:3123',
  BOX_PLAYER_LOGIN_URL: 'http://127.0.0.1:3125',
  BOX_PLAYER_AUTH_ALLOWED_ORIGINS: 'http://127.0.0.1:3125',
  BOX_AUTH_PORTAL_PUBLIC_URL: 'http://127.0.0.1:3125',
  BOX_RESOURCE_ALLOWED_ORIGINS: 'http://127.0.0.1:3123,http://127.0.0.1:3127',
}

function prefixLines(prefix) {
  let buffered = ''
  return (chunk) => {
    buffered += chunk.toString()
    const lines = buffered.split(/\r?\n/)
    buffered = lines.pop() || ''
    for (const line of lines) console.log(`[${prefix}] ${line}`)
  }
}

function start(name, command, commandArgs, options = {}) {
  const child = spawn(command, commandArgs, {
    cwd: options.cwd || repoRoot,
    env: { ...sharedEnv, ...(options.env || {}) },
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  children.add(child)
  child.stdout.on('data', prefixLines(name))
  child.stderr.on('data', prefixLines(name))
  child.once('exit', (code, signal) => {
    children.delete(child)
    if (!shuttingDown && code !== 0) {
      console.error(`[${name}] exited with ${signal || `code ${code}`}; stopping dev stack`)
      shutdown(code || 1)
    }
  })
  return child
}

function stopChild(child) {
  if (child.exitCode !== null || child.signalCode) return
  if (isWindows) child.kill()
  else child.kill('SIGTERM')
}

let shuttingDown = false
function cleanupDevArtifacts() {
  for (const name of ['player-service', 'creator', 'play']) {
    fs.rmSync(path.join(gameRoot, `.tsconfig.dev-${name}.json`), { force: true })
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) stopChild(child)
  setTimeout(() => {
    cleanupDevArtifacts()
    process.exit(code)
  }, 250)
}

function startInfrastructure() {
  if (!args.has('--infra')) return
  const result = spawnSync(
    'docker',
    ['compose', '--profile', 'infra', 'up', '-d', 'postgres', 'redis'],
    { cwd: repoRoot, env: sharedEnv, stdio: 'inherit' },
  )
  if (result.error?.code === 'ENOENT') {
    throw new Error(
      '未找到 Docker。请安装并启动 Docker Desktop，或直接使用 rush dev 连接已有基础服务',
    )
  }
  if (result.status !== 0) throw new Error('PostgreSQL/Redis 基础服务启动失败')
}

function prepareGameTsconfigs() {
  const source = fs.readFileSync(baseGameTsconfig)
  for (const name of ['player-service', 'creator', 'play']) {
    fs.writeFileSync(path.join(gameRoot, `.tsconfig.dev-${name}.json`), source)
  }
}

try {
  startInfrastructure()

  const localEngineRoot = path.join(repoRoot, 'apps/local-engine')
  const voxaRoot = path.join(repoRoot, 'apps/voxa')
  const portalRoot = path.join(repoRoot, 'examples/player-auth-portal')
  prepareGameTsconfigs()

  // Player Service uses the same Next source as Creator/Play, but an isolated
  // Next output directory prevents three dev servers from corrupting .next.
  start(
    'player-service',
    process.execPath,
    ['-r', 'ts-node/register', 'server/dev-server/index.ts', '--http', '--port', '3124'],
    {
      cwd: gameRoot,
      env: {
        BOX_DEPLOYMENT_MODE: 'player-service',
        BOX_WEB_HOST: '127.0.0.1',
        NEXT_PUBLIC_APP_ENV: 'development',
        NEXT_PUBLIC_APP_EDITION: 'createra',
        NEXT_PUBLIC_APP_REGION: 'cn',
        NEXT_DIST_DIR: '.next-player-service',
        NEXT_TSCONFIG_PATH: '.tsconfig.dev-player-service.json',
      },
    },
  )

  start('creator', process.execPath, [path.join(localEngineRoot, 'src/launcher.js'), '--creator'], {
    env: {
      BOX_WEB_PORT: '3127',
      BOX_PLAY_RUNTIME_PORT: '9966',
      BOX_EDIT_RUNTIME_PORT: '9967',
      NEXT_DIST_DIR: '.next-creator',
      NEXT_TSCONFIG_PATH: '.tsconfig.dev-creator.json',
      BOX_DEPLOYMENT_MODE: 'creator',
    },
  })

  if (!creatorOnly) {
    start('play', process.execPath, [path.join(localEngineRoot, 'src/launcher.js'), '--play'], {
      env: {
        BOX_WEB_PORT: '3121',
        BOX_PLAY_RUNTIME_PORT: '9971',
        BOX_EDIT_RUNTIME_PORT: '9972',
        BOX_PLAY_LIBRARY_PATH: path.join(localEngineRoot, 'play-worlds'),
        NEXT_DIST_DIR: '.next-play',
        NEXT_TSCONFIG_PATH: '.tsconfig.dev-play.json',
        BOX_DEPLOYMENT_MODE: 'play',
      },
    })
  }

  const nextExecutable = path.join(voxaRoot, 'node_modules/.bin', isWindows ? 'next.cmd' : 'next')
  start('voxa', nextExecutable, ['dev', '-p', '3123'], {
    cwd: voxaRoot,
    env: {
      BOX_PLAYER_SERVICE_INTERNAL_URL: 'http://127.0.0.1:3124',
      NEXT_DIST_DIR: '.next-voxa',
      PORT: '3123',
    },
  })

  start('auth-portal', process.execPath, ['server.js'], {
    cwd: portalRoot,
    env: {
      AUTH_DEMO_HOST: '127.0.0.1',
      AUTH_DEMO_PORT: '3125',
      AUTH_DEMO_PLAYER_SERVICE_URL: 'http://127.0.0.1:3124',
      AUTH_DEMO_PUBLIC_URL: 'http://127.0.0.1:3125',
      AUTH_DEMO_CREATOR_URL: 'http://127.0.0.1:3127',
      AUTH_DEMO_PLAY_URL: 'http://127.0.0.1:3121',
      AUTH_DEMO_API_KEY: sharedEnv.BOX_PLAYER_AUTH_API_KEY,
      AUTH_DEMO_REGISTRATION_ENABLED: 'true',
    },
  })

  console.log('\n开发服务已启动：')
  console.log('  Creator        http://127.0.0.1:3127/')
  if (!creatorOnly) console.log('  Play           http://127.0.0.1:3121/')
  console.log('  VOXA           http://127.0.0.1:3123/')
  console.log('  Player Service http://127.0.0.1:3124/')
  console.log('  Auth Portal    http://127.0.0.1:3125/')
  console.log(
    '\n按 Ctrl-C 停止源码服务。默认不会启动或停止 Docker 基础服务；需要时使用 rush dev --infra。',
  )
} catch (error) {
  console.error(`开发服务启动失败：${error.message}`)
  shutdown(1)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
