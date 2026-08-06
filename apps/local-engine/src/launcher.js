'use strict'

const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const configPath = path.join(packageRoot, 'config/local.config.json')
const defaultDataRoot = path.join(packageRoot, 'data')
const generatedAsset = path.join(
  repoRoot,
  process.argv.includes('--production')
    ? 'services/game-server/dist/src/assets/block_info.js'
    : 'services/game-server/src/assets/block_info.ts'
)
const defaultAvatarManifest = path.join(
  repoRoot,
  process.argv.includes('--production')
    ? 'services/game-server/player/default-avatar.json'
    : 'services/game-server/src/player/default-avatar.json'
)
const sourceDefaultAvatarManifest = path.join(
  repoRoot,
  'services/game-server/src/player/default-avatar.json'
)
const launchArgs = process.argv.slice(2)
const launchFlags = new Set([
  '--production',
  '--creator',
  '--play',
  '--runtime-only',
])
const launchValueFlags = new Set(['--project', '--release', '--runtime-mode'])
for (let index = 0; index < launchArgs.length; index += 1) {
  const arg = launchArgs[index]
  if (launchFlags.has(arg)) continue
  if (launchValueFlags.has(arg)) {
    const value = launchArgs[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`${arg} requires a value`)
    }
    index += 1
    continue
  }
  throw new Error(`Unknown launch argument: ${arg}`)
}
const production = process.argv.includes('--production')
const creatorRequested = process.argv.includes('--creator')
const playMode = process.argv.includes('--play')
const playLibraryPath = process.env.BOX_PLAY_LIBRARY_PATH
  ? path.resolve(process.env.BOX_PLAY_LIBRARY_PATH)
  : ''
const usesPlayLibrary = playMode && Boolean(playLibraryPath)
const runtimeOnly = process.argv.includes('--runtime-only')
const projectArgIndex = process.argv.indexOf('--project')
const releaseArgIndex = process.argv.indexOf('--release')
const runtimeModeArgIndex = process.argv.indexOf('--runtime-mode')
const projectId = projectArgIndex >= 0 ? process.argv[projectArgIndex + 1] : ''
const releaseId = releaseArgIndex >= 0 ? process.argv[releaseArgIndex + 1] : ''
const runtimeMode =
  runtimeModeArgIndex >= 0
    ? process.argv[runtimeModeArgIndex + 1]
    : 'both'
const scriptVm = process.env.BOX_SCRIPT_VM || 'ivmp'
const playPort = Number(
  process.env.BOX_PLAY_RUNTIME_PORT ||
    process.env.BOX_SERVER_PORT ||
    9966
)
const editPort = Number(
  process.env.BOX_EDIT_RUNTIME_PORT ||
    process.env.BOX_EDIT_SERVER_PORT ||
    9967
)
const launchTarget =
  projectId || releaseId
    ? require('./project-manager').getLaunchTarget({
        project: projectId,
        release: releaseId,
      })
    : undefined
const configuredWorldPath =
  process.env.BOX_WORLD_PATH || process.env.BOX_SERVER_DATA_PATH
const configuredDataRoot = configuredWorldPath
  ? path.resolve(configuredWorldPath)
  : defaultDataRoot
const dataRoot = launchTarget ? launchTarget.dataRoot : configuredDataRoot
const projectStatePath = launchTarget
  ? launchTarget.statePath
  : process.env.BOX_WORLD_STATE_PATH ||
    process.env.BOX_PROJECT_STATE_PATH ||
    ''
const requiredClientAsset = path.join(
  dataRoot,
  'blobs/QmUQg6ayL7bLmdso8b4Hc7nfxBUSJawPsQ7vsSUPhXNdv5'
)
const gameRoot = path.join(repoRoot, 'apps/game')
const gameServerRoot = path.join(repoRoot, 'services/game-server')
const nextBuildId = path.join(gameRoot, '.next/BUILD_ID')
const playBuildMarker = path.join(gameRoot, '.next/BOX_PLAY_BUILD')
const standaloneGameRoot = path.join(
  gameRoot,
  '.next/standalone/apps/game'
)
const standaloneServer = path.join(standaloneGameRoot, 'server.js')
const standaloneBuildId = path.join(standaloneGameRoot, '.next/BUILD_ID')
const standalonePlayBuildMarker = path.join(
  standaloneGameRoot,
  '.next/BOX_PLAY_BUILD'
)
const compiledGameServer = path.join(gameServerRoot, 'dist/src/launch.js')

if ([creatorRequested, playMode, runtimeOnly].filter(Boolean).length > 1) {
  throw new Error(
    'Choose only one launch mode: --creator, --play, or --runtime-only'
  )
}
if (launchTarget?.kind === 'release' && !playMode) {
  throw new Error('A release can only run with --play')
}
if (playMode && launchTarget?.kind === 'source') {
  throw new Error('The play runtime accepts a release, not an editable project')
}
const creatorMode = !playMode && !runtimeOnly
if (creatorMode && launchTarget) {
  throw new Error('The creator manager does not launch a project or release directly')
}
if (runtimeOnly && launchTarget?.kind !== 'source') {
  throw new Error('--runtime-only requires --project <project-id>')
}
if (!['both', 'edit', 'play'].includes(runtimeMode)) {
  throw new Error('--runtime-mode must be one of: both, edit, play')
}
if (!runtimeOnly && runtimeModeArgIndex >= 0) {
  throw new Error('--runtime-mode can only be used with --runtime-only')
}

const startsWeb = !runtimeOnly
const startsPlayServer =
  playMode || (runtimeOnly && runtimeMode !== 'edit')
const startsEditServer = runtimeOnly && runtimeMode !== 'play'
const usesPlayerWeb = playMode
const requiresServerBuild = true

function dataStorageNamespace(id, allowExplicit = true) {
  if (allowExplicit && process.env.BOX_DATA_STORAGE_NAMESPACE) {
    return process.env.BOX_DATA_STORAGE_NAMESPACE
  }
  const prefix = process.env.BOX_DATA_STORAGE_NAMESPACE_PREFIX || ''
  return `${prefix}${id || 'default'}`
}

function validateDefaultAvatar() {
  const manifestPath = fs.existsSync(defaultAvatarManifest)
    ? defaultAvatarManifest
    : sourceDefaultAvatarManifest
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Bundled default avatar manifest is missing')
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
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

function readProjectHash() {
  if (launchTarget?.permissionHash) return launchTarget.permissionHash
  if (!projectStatePath || !fs.existsSync(projectStatePath)) return ''
  const state = JSON.parse(fs.readFileSync(projectStatePath, 'utf8'))
  return typeof state.permissionHash === 'string' ? state.permissionHash : ''
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
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
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
let disposablePlayDataRoot = ''

function makeRuntimeDataReadable(root) {
  const pending = [root]
  while (pending.length) {
    const target = pending.pop()
    const stat = fs.lstatSync(target)
    if (stat.isDirectory()) {
      fs.chmodSync(target, 0o755)
      for (const entry of fs.readdirSync(target)) {
        pending.push(path.join(target, entry))
      }
    } else if (stat.isFile()) {
      fs.chmodSync(target, 0o644)
    } else {
      throw new Error(`运行时地图包含不支持的文件类型：${target}`)
    }
  }
}
let playLibrary

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    child.kill('SIGTERM')
  }
  if (playLibrary) playLibrary.stop().catch(() => {})
  setTimeout(() => {
    if (disposablePlayDataRoot) {
      fs.rmSync(disposablePlayDataRoot, { recursive: true, force: true })
      disposablePlayDataRoot = ''
    }
    process.exit(code)
  }, 200)
}

async function main() {
  const webPort = Number(
    process.env.BOX_WEB_PORT ||
      process.env.BOX_CLIENT_PORT ||
      (playMode ? 3000 : 3002)
  )
  const webHost =
    process.env.BOX_WEB_HOST ||
    process.env.BOX_CLIENT_HOST ||
    '127.0.0.1'
  const playRuntimeHost =
    process.env.BOX_PLAY_RUNTIME_HOST ||
    process.env.BOX_SERVER_HOST ||
    '127.0.0.1'
  const editRuntimeHost =
    process.env.BOX_EDIT_RUNTIME_HOST ||
    process.env.BOX_EDIT_SERVER_HOST ||
    '127.0.0.1'
  let playServerDataRoot = dataRoot

  if ((startsPlayServer && !usesPlayLibrary) || startsEditServer) {
    fs.mkdirSync(dataRoot, { recursive: true })

    if (!fs.existsSync(generatedAsset) || !fs.existsSync(requiredClientAsset)) {
      if (production) {
        throw new Error(
          `Runtime assets are incomplete. Check the mounted world data: ${dataRoot}`
        )
      }
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

  if (startsPlayServer && !usesPlayLibrary) {
    // Published worlds are immutable inputs. The game runtime can create
    // derived content while booting or running, so give it a disposable
    // writable copy instead of ever writing into the mounted release.
    disposablePlayDataRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'box-local-engine-play-')
    )
    fs.cpSync(dataRoot, disposablePlayDataRoot, { recursive: true })
    makeRuntimeDataReadable(disposablePlayDataRoot)
    playServerDataRoot = disposablePlayDataRoot
  }

  if (production) {
    const hasWebBuild =
      fs.existsSync(nextBuildId) || fs.existsSync(standaloneBuildId)
    const hasPlayBuildMarker =
      fs.existsSync(playBuildMarker) ||
      fs.existsSync(standalonePlayBuildMarker)
    if (startsWeb && !hasWebBuild) {
      throw new Error(
        `Web build is missing. Run \`pnpm ${usesPlayerWeb ? 'build:play' : 'build:creator'}\` before starting it.`
      )
    }
    if (usesPlayerWeb && !hasPlayBuildMarker) {
      throw new Error(
        'Play build is missing. Run `pnpm build:play` before starting it.'
      )
    }
    if (startsWeb && !usesPlayerWeb && hasPlayBuildMarker) {
      throw new Error(
        'The current web build is play-only. Run `pnpm build:creator` before starting the creator.'
      )
    }
    if (requiresServerBuild && !fs.existsSync(compiledGameServer)) {
      throw new Error(
        `Game runtime build is missing. Run \`pnpm ${playMode ? 'build:play' : 'build:creator'}\` before starting it.`
      )
    }
  }

  const sharedEnv = {
    ...process.env,
    BOX_LOCAL_CONFIG_PATH: configPath,
    BOX_LOCAL_ENGINE_ROOT: packageRoot,
    BOX_LOCAL_PROJECTS_PATH: path.join(packageRoot, 'projects'),
    NEXT_PUBLIC_APP_ENV: 'development',
    NEXT_PUBLIC_APP_EDITION: 'createra',
    NEXT_PUBLIC_APP_REGION: 'cn',
    BACKEND_SERVER_URL: `http://127.0.0.1:${playPort}`,
    INTRANET_BACKEND_SERVER_URL: `http://127.0.0.1:${playPort}`,
    OSS_CDN_URL:
      process.env.BOX_LOCAL_OSS_CDN_URL || `http://127.0.0.1:${playPort}`,
    CREATERA_BACKEND_SERVER_URL:
      process.env.BOX_LOCAL_AVATAR_API_URL || `http://127.0.0.1:${playPort}`,
    INTRANET_CREATERA_BACKEND_SERVER_URL:
      process.env.BOX_LOCAL_AVATAR_API_URL || `http://127.0.0.1:${playPort}`,
    MAAS_BACKEND_SERVER_URL: `http://127.0.0.1:${playPort}`,
    INTRANET_MAAS_BACKEND_SERVER_URL: `http://127.0.0.1:${playPort}`,
    INTRANET_STORAGE_BACKEND_SERVER_URL: `http://127.0.0.1:${playPort}`,
    INTRANET_BOX_API_URL: `http://127.0.0.1:${playPort}`,
    BUILD_SERVER_URL: '',
    RABBITMQ_HOST_URL: '',
    REDIS_HOST: '',
    // Local products create sessions through the web API, which authenticates
    // the internal runtime request and preserves the actual client address.
    BOX_DIRECT_SESSION_API: 'false',
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
          // The launcher resolves one authoritative data root. Play mode uses
          // its disposable writable copy; edit mode uses the project source.
          STORAGE_PATH: mode === 'play' ? playServerDataRoot : dataRoot,
          BOX_PROJECT_STATE_PATH: projectStatePath,
          HASH:
            process.env.BOX_WORLD_HASH ||
            process.env.BOX_PROJECT_HASH ||
            readProjectHash(),
          // `local` only supports an in-process function supplied by tests and
          // silently skips normal map modules. The packaged engine must use
          // the isolated child-process runtime so server scripts are loaded.
          VM: scriptVm,
          CONTENT_ID:
            process.env.BOX_WORLD_ID ||
            process.env.BOX_SERVER_CONTENT_ID ||
            '0',
          BOX_DATA_STORAGE_NAMESPACE: dataStorageNamespace(
            projectId ||
            releaseId ||
            process.env.BOX_WORLD_ID ||
            process.env.BOX_SERVER_CONTENT_ID ||
            'default'
          ),
          BOX_SERVER_NAME:
            process.env.BOX_WORLD_NAME ||
            process.env.BOX_SERVER_NAME ||
            'BOX 世界',
          CONTAINER_NAME: '',
          PLAYER_LIMIT: process.env.BOX_LOCAL_PLAYER_LIMIT || '8',
          MAX_ZERO_PLAYER_TIME: '2147483647',
        },
      }
    )

  const startLibraryRuntime = async (world, port) => {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), `box-local-engine-${world.id}-`)
    )
    fs.cpSync(world.dataRoot, temporaryRoot, { recursive: true })
    makeRuntimeDataReadable(temporaryRoot)
    const child = spawn(
      process.execPath,
      production
        ? ['dist/src/launch.js', '--useProdBundle']
        : ['-r', '@swc-node/register', 'src/launch.ts'],
      {
        cwd: gameServerRoot,
        stdio: 'inherit',
        env: {
          ...sharedEnv,
          METHOD: 'local',
          MODE: 'play',
          LOGIN: 'guest',
          IS_HTTPS: 'false',
          PORT: String(port),
          HOST_IP: '127.0.0.1',
          STORAGE_PATH: temporaryRoot,
          BOX_PROJECT_STATE_PATH: path.join(temporaryRoot, 'project-state.json'),
          HASH: world.manifest.permissionHash,
          VM: scriptVm,
          CONTENT_ID: world.id,
          // Multi-world play deployments must never collapse all maps into a
          // single data namespace. Server owners can add a prefix, while the
          // actual world id always remains part of the namespace.
          BOX_DATA_STORAGE_NAMESPACE: dataStorageNamespace(world.id, false),
          BOX_SERVER_NAME: world.manifest.projectName || world.id,
          CONTAINER_NAME: world.id,
          PLAYER_LIMIT: process.env.BOX_LOCAL_PLAYER_LIMIT || '8',
          MAX_ZERO_PLAYER_TIME: '2147483647',
        },
      }
    )
    const runtime = {
      port,
      exited: false,
      async stop() {
        if (!runtime.exited) child.kill('SIGTERM')
        await new Promise((resolve) => {
          if (runtime.exited) return resolve()
          const timer = setTimeout(resolve, 1500)
          child.once('exit', () => {
            clearTimeout(timer)
            resolve()
          })
        })
        fs.rmSync(temporaryRoot, { recursive: true, force: true })
      },
    }
    child.once('exit', () => {
      runtime.exited = true
      fs.rmSync(temporaryRoot, { recursive: true, force: true })
    })
    return runtime
  }

  let editStarted = false

  // A new local project has no root hash yet. Start the editor first so it can
  // create and persist the project root; the play server then opens that exact
  // same root instead of generating an unrelated default world.
  if (
    launchTarget?.kind === 'source' &&
    startsEditServer &&
    !readProjectHash()
  ) {
    startGameServer(
      'edit',
      editPort,
      runtimeOnly ? editRuntimeHost : ''
    )
    editStarted = true
    await waitFor(`http://127.0.0.1:${editPort}/api/health-check`)
  }

  if (usesPlayLibrary) {
    playLibrary = require('./play-library').startPlayLibrary({
      libraryRoot: playLibraryPath,
      host: playRuntimeHost,
      port: playPort,
      startRuntime: startLibraryRuntime,
      waitForRuntime: waitFor,
    })
    await playLibrary.ready
  } else if (startsPlayServer) {
    startGameServer(
      'play',
      playPort,
      playRuntimeHost
    )

    await waitFor(`http://127.0.0.1:${playPort}/api/health-check`)
  }

  if (startsEditServer && !editStarted) {
    startGameServer(
      'edit',
      editPort,
      runtimeOnly ? editRuntimeHost : ''
    )

    await waitFor(`http://127.0.0.1:${editPort}/api/health-check`)
  }

  if (runtimeOnly) {
    console.log('\nBOX Project Runtime is ready:')
    console.log(`  Project: ${projectId}`)
    if (startsPlayServer) {
      console.log(`  Play runtime: http://127.0.0.1:${playPort}`)
    }
    if (startsEditServer) {
      console.log(`  Edit runtime: http://127.0.0.1:${editPort}`)
    }
    console.log('')
    return
  }

  const useStandalone = production && fs.existsSync(standaloneServer)
  const webArgs = production
    ? useStandalone
      ? ['server.js']
      : [
          path.join(gameRoot, 'node_modules/next/dist/bin/next'),
          'start',
          '-H',
          webHost,
          '-p',
          String(webPort),
        ]
    : [
        '-r',
        'ts-node/register',
        'server/dev-server/index.ts',
        '--http',
        '--port',
        String(webPort),
      ]

  run(
    process.execPath,
    webArgs,
    {
      cwd: useStandalone ? standaloneGameRoot : gameRoot,
      env: {
        ...sharedEnv,
        BOX_DEPLOYMENT_MODE: playMode ? 'play' : 'creator',
        BOX_WEB_HOST: webHost,
        BOX_REMOTE_SERVER_URL: '',
        HOSTNAME: webHost,
        PORT: String(webPort),
        IS_LOCAL_GAME_SERVER: 'true',
        LOCAL_GAME_SERVER_URL: `http://127.0.0.1:${playPort}`,
        LOCAL_EDIT_SERVER_URL: `http://127.0.0.1:${editPort}`,
        ARENA_URL: `http://127.0.0.1:${webPort}`,
        WEBSITE_URL: `http://127.0.0.1:${webPort}`,
        HOME_URL: `http://127.0.0.1:${webPort}`,
        PLATFORM_URL: `http://127.0.0.1:${webPort}`,
        CACHE_IPFS: 'true',
      },
    }
  )

  await waitFor(`http://127.0.0.1:${webPort}/api/health-check`)
  console.log(
    `\nBOX ${creatorMode ? 'Creator' : 'Play'} is ready (${
      production ? 'production' : 'development'
    }):`
  )
  console.log(`  Open: http://127.0.0.1:${webPort}/\n`)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

main().catch((error) => {
  console.error(error)
  shutdown(1)
})
