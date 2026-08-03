'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const gameRoot = path.join(repoRoot, 'apps/game')
const gameServerRoot = path.join(repoRoot, 'services/game-server')
const configPath = path.join(packageRoot, 'config/local.config.json')
const generatedServerAsset = path.join(
  gameServerRoot,
  'src/assets/block_info.ts'
)
const generatedClientAsset = path.join(gameRoot, 'src/resource/engine.ts')
const playerBuildMarker = path.join(gameRoot, '.next/BOX_PLAYER_BUILD')
const standaloneGameRoot = path.join(
  gameRoot,
  '.next/standalone/apps/game',
)
const clientOnly = process.argv.includes('--client')
const serverOnly = process.argv.includes('--server')

if (clientOnly && serverOnly) {
  throw new Error('Choose either --client or --server, not both')
}

const buildClient = !serverOnly
const buildServer = !clientOnly

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
  IS_LOCAL_GAME_SERVER: 'true',
  LOCAL_GAME_SERVER_URL: 'http://127.0.0.1:9966',
  LOCAL_EDIT_SERVER_URL: 'http://127.0.0.1:9967',
  ARENA_URL: 'http://127.0.0.1:3000',
  CACHE_IPFS: 'true',
  BOX_PLAYER_BUILD: clientOnly ? 'true' : 'false',
  BUILD_SERVER_URL: '',
  RABBITMQ_HOST_URL: '',
  REDIS_HOST: '',
  NODE_ENV: 'production',
}

function run(label, cwd, args) {
  console.log(`\n[build] ${label}`)
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: sharedEnv,
    stdio: 'inherit',
  })
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`)
  }
}

function main() {
  if (
    (buildServer && !fs.existsSync(generatedServerAsset)) ||
    (buildClient && !fs.existsSync(generatedClientAsset))
  ) {
    run('Prepare local assets', packageRoot, [
      path.join(__dirname, 'prepare-assets.js'),
    ])
  }

  if (buildClient) {
    fs.rmSync(playerBuildMarker, { force: true })

    run('Generate browser server API declarations', gameRoot, [
      path.join(gameRoot, 'node_modules/typescript/bin/tsc'),
      '-p',
      'api-tsconfig.json',
      '--declaration',
      '--emitDeclarationOnly',
    ])
    run('Normalize browser server API declarations', gameRoot, [
      'scripts/fix-declaration.js',
      './scripts/assets/api/**/*.d.ts',
    ])
    run('Generate browser client API declarations', gameRoot, [
      path.join(gameRoot, 'node_modules/typescript/bin/tsc'),
      '-p',
      'client-api-tsconfig.json',
      '--declaration',
      '--emitDeclarationOnly',
    ])
    run('Normalize browser client API declarations', gameRoot, [
      'scripts/fix-declaration.js',
      './scripts/assets/client_api/**/*.d.ts',
    ])

    run('Build optimized browser application', gameRoot, [
      path.join(gameRoot, 'node_modules/next/dist/bin/next'),
      'build',
    ])

    fs.rmSync(path.join(standaloneGameRoot, '.next/static'), {
      recursive: true,
      force: true,
    })
    fs.cpSync(
      path.join(gameRoot, '.next/static'),
      path.join(standaloneGameRoot, '.next/static'),
      { recursive: true },
    )
    if (fs.existsSync(path.join(gameRoot, 'public'))) {
      fs.rmSync(path.join(standaloneGameRoot, 'public'), {
        recursive: true,
        force: true,
      })
      fs.cpSync(
        path.join(gameRoot, 'public'),
        path.join(standaloneGameRoot, 'public'),
        { recursive: true },
      )
    }

    if (clientOnly) {
      fs.writeFileSync(playerBuildMarker, 'player-only\n')
    }
  }

  if (buildServer) {
    run('Build script isolate bundle', gameServerRoot, [
      path.join(gameServerRoot, 'node_modules/rollup/dist/bin/rollup'),
      '--config',
      'scripts/script-server/rollup.config.mjs',
    ])

    run('Compile game server', gameServerRoot, [
      path.join(gameServerRoot, 'node_modules/typescript/bin/tsc'),
    ])
  }

  console.log(
    `\nBOX Local Engine ${
      clientOnly ? 'client' : serverOnly ? 'server' : 'production'
    } build is ready.`,
  )
  console.log(
    `Run \`pnpm ${
      clientOnly ? 'start:client' : serverOnly ? 'start:server' : 'start'
    }\` to launch it.\n`,
  )
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
