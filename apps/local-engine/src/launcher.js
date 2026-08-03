'use strict'

const fs = require('fs')
const http = require('http')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const configPath = path.join(packageRoot, 'config/local.config.json')
const dataRoot = path.join(packageRoot, 'data')
const generatedAsset = path.join(
  repoRoot,
  'services/game-server/src/assets/block_info.ts'
)
const requiredClientAsset = path.join(
  dataRoot,
  'blobs/QmUQg6ayL7bLmdso8b4Hc7nfxBUSJawPsQ7vsSUPhXNdv5'
)
const defaultAvatarManifest = path.join(
  repoRoot,
  'services/game-server/src/player/default-avatar.json'
)
const production = process.argv.includes('--production')
const serverOnly = process.argv.includes('--server-only')
const clientOnly = process.argv.includes('--client-only')
const gameRoot = path.join(repoRoot, 'apps/game')
const gameServerRoot = path.join(repoRoot, 'services/game-server')
const nextBuildId = path.join(gameRoot, '.next/BUILD_ID')
const playerBuildMarker = path.join(gameRoot, '.next/BOX_PLAYER_BUILD')
const standaloneGameRoot = path.join(
  gameRoot,
  '.next/standalone/apps/game'
)
const standaloneServer = path.join(standaloneGameRoot, 'server.js')
const compiledGameServer = path.join(gameServerRoot, 'dist/src/launch.js')

if (serverOnly && clientOnly) {
  throw new Error('Choose either --server-only or --client-only, not both')
}

function validateDefaultAvatar() {
  if (!fs.existsSync(defaultAvatarManifest)) {
    throw new Error('Bundled default avatar manifest is missing')
  }
  const manifest = JSON.parse(fs.readFileSync(defaultAvatarManifest, 'utf8'))
  const hashes = Object.values(manifest.parts || {})
  if (hashes.length !== 18) {
    throw new Error('Bundled default avatar must contain 18 body parts')
  }
  for (const hash of hashes) {
    if (!fs.existsSync(path.join(dataRoot, 'blobs', hash))) {
      throw new Error(`Bundled default avatar blob is missing: ${hash}`)
    }
  }
}

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
  })
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`${command} stopped (${signal || code})`)
      shutdown(code || 1)
    }
  })
  children.push(child)
  return child
}

function waitFor(url, attempts = 120) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      const req = http.get(url, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) {
          resolve()
        } else if (remaining > 0) {
          setTimeout(() => check(remaining - 1), 500)
        } else {
          reject(new Error(`Timed out waiting for ${url}`))
        }
      })
      req.on('error', () => {
        if (remaining > 0) {
          setTimeout(() => check(remaining - 1), 500)
        } else {
          reject(new Error(`Timed out waiting for ${url}`))
        }
      })
      req.setTimeout(1000, () => req.destroy())
    }
    check(attempts)
  })
}

const children = []
let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(code), 200)
}

async function main() {
  const clientPort = Number(process.env.BOX_CLIENT_PORT || 3000)

  if (!clientOnly) {
    fs.mkdirSync(dataRoot, { recursive: true })

    if (!fs.existsSync(generatedAsset) || !fs.existsSync(requiredClientAsset)) {
      const prepared = spawnSync(process.execPath, [
        path.join(__dirname, 'prepare-assets.js'),
      ], {
        cwd: packageRoot,
        stdio: 'inherit',
      })
      if (prepared.status !== 0) {
        throw new Error('Unable to prepare local engine assets')
      }
    }
    validateDefaultAvatar()
  }

  if (production) {
    if (!serverOnly && !fs.existsSync(nextBuildId)) {
      throw new Error(
        'Client build is missing. Run `pnpm build:client` before starting it.'
      )
    }
    if (clientOnly && !fs.existsSync(playerBuildMarker)) {
      throw new Error(
        'Player-only build is missing. Run `pnpm build:client` before starting it.'
      )
    }
    if (!clientOnly && !serverOnly && fs.existsSync(playerBuildMarker)) {
      throw new Error(
        'The current client build is player-only. Run `pnpm build` before starting the local editor.'
      )
    }
    if (!clientOnly && !fs.existsSync(compiledGameServer)) {
      throw new Error(
        'Server build is missing. Run `pnpm build:server` before starting it.'
      )
    }
  }

  const sharedEnv = {
    ...process.env,
    BOX_LOCAL_CONFIG_PATH: configPath,
    NEXT_PUBLIC_APP_ENV: 'development',
    NEXT_PUBLIC_APP_EDITION: 'createra',
    NEXT_PUBLIC_APP_REGION: 'cn',
    BACKEND_SERVER_URL: 'http://127.0.0.1:9966',
    INTRANET_BACKEND_SERVER_URL: 'http://127.0.0.1:9966',
    OSS_CDN_URL:
      process.env.BOX_LOCAL_OSS_CDN_URL || 'http://127.0.0.1:9966',
    CREATERA_BACKEND_SERVER_URL:
      process.env.BOX_LOCAL_AVATAR_API_URL || 'http://127.0.0.1:9966',
    INTRANET_CREATERA_BACKEND_SERVER_URL:
      process.env.BOX_LOCAL_AVATAR_API_URL || 'http://127.0.0.1:9966',
    MAAS_BACKEND_SERVER_URL: 'http://127.0.0.1:9966',
    INTRANET_MAAS_BACKEND_SERVER_URL: 'http://127.0.0.1:9966',
    INTRANET_STORAGE_BACKEND_SERVER_URL: 'http://127.0.0.1:9966',
    INTRANET_BOX_API_URL: 'http://127.0.0.1:9966',
    BUILD_SERVER_URL: '',
    RABBITMQ_HOST_URL: '',
    REDIS_HOST: '',
    NODE_ENV: production ? 'production' : 'development',
  }

  const startGameServer = (mode, port, hostIP = '') =>
    run(
      process.execPath,
      production
        ? ['dist/src/launch.js', '--useProdBundle']
        : ['-r', '@swc-node/register', 'src/launch.ts'],
      {
        cwd: gameServerRoot,
        env: {
          ...sharedEnv,
          METHOD: 'local',
          MODE: mode,
          LOGIN: mode === 'edit' ? 'admin' : 'guest',
          IS_HTTPS: 'false',
          PORT: String(port),
          HOST_IP: hostIP,
          STORAGE_PATH: process.env.BOX_SERVER_DATA_PATH || dataRoot,
          VM: 'local',
          CONTENT_ID: process.env.BOX_SERVER_CONTENT_ID || '0',
          CONTAINER_NAME: '',
          PLAYER_LIMIT: process.env.BOX_LOCAL_PLAYER_LIMIT || '8',
          MAX_ZERO_PLAYER_TIME: '2147483647',
        },
      }
    )

  const playPort = Number(process.env.BOX_SERVER_PORT || 9966)

  if (!clientOnly) {
    startGameServer(
      'play',
      playPort,
      serverOnly ? process.env.BOX_SERVER_HOST || '0.0.0.0' : '',
    )

    await waitFor(`http://127.0.0.1:${playPort}/api/health-check`)
  }

  if (serverOnly) {
    console.log('\nBOX Dedicated Server is ready:')
    console.log(`  HTTP/WebSocket port: ${playPort}`)
    console.log(`  Server info: http://127.0.0.1:${playPort}/api/server-info\n`)
    return
  }

  if (!clientOnly) {
    startGameServer('edit', 9967)

    await waitFor('http://127.0.0.1:9967/api/health-check')
  }

  const useStandalone = production && fs.existsSync(standaloneServer)
  const webArgs = production
    ? useStandalone
      ? ['server.js']
      : [
          path.join(gameRoot, 'node_modules/next/dist/bin/next'),
          'start',
          '-H',
          process.env.BOX_CLIENT_HOST || '127.0.0.1',
          '-p',
          process.env.BOX_CLIENT_PORT || '3000',
        ]
    : [
        '-r',
        'ts-node/register',
        'server/dev-server/index.ts',
        '--http',
        '--port',
        String(clientPort),
      ]

  run(
    process.execPath,
    webArgs,
    {
      cwd: useStandalone ? standaloneGameRoot : gameRoot,
      env: {
        ...sharedEnv,
        HOSTNAME: process.env.BOX_CLIENT_HOST || '127.0.0.1',
        PORT: process.env.BOX_CLIENT_PORT || '3000',
        BOX_PLAYER_CLIENT_ONLY: clientOnly ? 'true' : 'false',
        IS_LOCAL_GAME_SERVER: 'true',
        LOCAL_GAME_SERVER_URL: `http://127.0.0.1:${playPort}`,
        LOCAL_EDIT_SERVER_URL: 'http://127.0.0.1:9967',
        ARENA_URL: `http://127.0.0.1:${clientPort}`,
        CACHE_IPFS: 'true',
      },
    }
  )

  await waitFor(`http://127.0.0.1:${clientPort}/api/health-check`)
  console.log(
    `\nBOX ${clientOnly ? 'Player Client' : 'Local Engine'} is ready (${
      production ? 'production' : 'development'
    }):`
  )
  if (clientOnly) {
    console.log(`  Connect: http://127.0.0.1:${clientPort}/connect\n`)
  } else {
    console.log(`  Play: http://127.0.0.1:${clientPort}/p/local`)
    console.log(`  Edit: http://127.0.0.1:${clientPort}/e/local\n`)
  }
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

main().catch((error) => {
  console.error(error)
  shutdown(1)
})
