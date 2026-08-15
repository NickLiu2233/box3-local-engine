'use strict'

const fs = require('fs')
const http = require('http')
const path = require('path')
const crypto = require('crypto')
const { spawn, spawnSync } = require('child_process')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const repoEnvPath = path.join(repoRoot, '.env')
// Docker Compose already injects .env. Source launches should behave the same
// way so optional PostgreSQL/Redis settings are not silently ignored.
if (fs.existsSync(repoEnvPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(repoEnvPath)
}
// Web session creation and every game runtime must share one signing secret.
// Keep an explicit host value stable across restarts; otherwise generate one
// per launcher process so local development still works without a weak default.
if (!process.env.PERMISSION_TOKEN_SECRET) {
  process.env.PERMISSION_TOKEN_SECRET = crypto.randomBytes(32).toString('hex')
  console.warn(
    'PERMISSION_TOKEN_SECRET is unset; generated an ephemeral launcher secret.',
  )
}
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
const projectManager =
  !playMode || projectId || releaseId ? require('./project-manager') : null
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
    ? projectManager.getLaunchTarget({
        project: projectId,
        release: releaseId,
      })
    : undefined
const configuredWorldPath =
  process.env.BOX_WORLD_PATH || process.env.BOX_SERVER_DATA_PATH
const configuredDataRoot = configuredWorldPath
  ? path.resolve(configuredWorldPath)
  : defaultDataRoot
const runtimeCacheRoot = path.resolve(
  process.env.BOX_RUNTIME_CACHE_PATH || path.join(packageRoot, 'runtime-cache')
)
const dataRoot = launchTarget ? launchTarget.dataRoot : configuredDataRoot
const projectStatePath = launchTarget
  ? launchTarget.statePath
  : process.env.BOX_WORLD_STATE_PATH ||
    process.env.BOX_PROJECT_STATE_PATH ||
    ''
const groupStatePath = launchTarget?.groupStatePath || ''
const groupBlobRoot = launchTarget?.groupBlobRoot || ''
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

function derivedRuntimePath(mode, identity) {
  const digest = crypto
    .createHash('sha256')
    .update(`${mode}\0${identity || 'default'}`)
    .digest('hex')
    .slice(0, 32)
  return path.join(runtimeCacheRoot, mode, digest)
}

function prewarmCount(name, fallback, maximum) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isSafeInteger(value) || value < 0) return fallback
  return Math.min(value, Math.max(0, Number(maximum) || 0))
}

function groupStorageNamespace(projectId = '') {
  if (process.env.BOX_GROUP_STORAGE_NAMESPACE) {
    return process.env.BOX_GROUP_STORAGE_NAMESPACE
  }
  const identity =
    process.env.BOX_WORLD_GROUP_UUID ||
    process.env.BOX_WORLD_GROUP_ID ||
    process.env.BOX_WORLD_MAIN_PROJECT_ID ||
    process.env.BOX_WORLD_ID ||
    projectId ||
    process.env.BOX_SERVER_CONTENT_ID ||
    ''
  if (projectId && projectManager) {
    try {
      return projectManager.projectStorageIdentity(projectId).mapGroupUuid
    } catch {
      // Standalone runtime fixtures do not necessarily have project metadata.
    }
  }
  // Generated distributions set BOX_WORLD_GROUP_ID. BOX_WORLD_ID remains a
  // safe legacy fallback; unrelated packages must never collapse to global.
  return identity || 'standalone-default'
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

function readCloudMapId() {
  if (!projectStatePath || !fs.existsSync(projectStatePath)) return ''
  const state = JSON.parse(fs.readFileSync(projectStatePath, 'utf8'))
  return Number.isSafeInteger(state.cloudMapId) && state.cloudMapId > 0
    ? String(state.cloudMapId)
    : ''
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

function makeRuntimeDataReadable(root) {
  const pending = [root]
  while (pending.length) {
    const target = pending.pop()
    fs.chmodSync(target, 0o755)
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const entryPath = path.join(target, entry.name)
      if (entry.isDirectory()) pending.push(entryPath)
      else if (entry.isFile()) fs.chmodSync(entryPath, 0o644)
      else throw new Error(`运行数据包含不支持的文件类型：${entryPath}`)
    }
  }
}
let playLibrary
let editLibrary
let creatorPlayLibrary
let backupTimer

async function terminateRuntimeChild(child, runtime, graceMs) {
  if (runtime.exited) return
  child.kill('SIGTERM')
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, graceMs)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
  if (runtime.exited) return
  child.kill('SIGKILL')
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 1000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    child.kill('SIGTERM')
  }
  if (playLibrary) playLibrary.stop().catch(() => {})
  if (editLibrary) editLibrary.stop().catch(() => {})
  if (creatorPlayLibrary) creatorPlayLibrary.stop().catch(() => {})
  if (backupTimer) clearInterval(backupTimer)
  setTimeout(() => {
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

    // Docker Desktop may materialize files created in a macOS bind mount as
    // write-only. Normalize the editable project before every runtime boot so
    // blobs written by a previous autosave remain readable after a restart.
    if (startsEditServer) makeRuntimeDataReadable(dataRoot)

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
    // Published worlds stay immutable. The game server reads them in place
    // and writes prebake/build products into BOX_DERIVED_STORAGE_PATH, so a
    // cold runtime no longer copies the complete world or loses its cache.
    playServerDataRoot = dataRoot
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
    REDIS_HOST: process.env.REDIS_HOST || '',
    REDIS_PORT: process.env.REDIS_PORT || '6379',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_DB: process.env.REDIS_DB || '0',
    STORAGE_CACHE_REDIS_DB: process.env.STORAGE_CACHE_REDIS_DB || '1',
    // The upstream game-server schema defines this value as uint8 (0-255).
    // Keep the local default within that range so opening a project cannot
    // fail during config validation before the runtime starts.
    STORAGE_CACHE_REDIS_TTL: process.env.STORAGE_CACHE_REDIS_TTL || '240',
    // A 512x256x512 world needs roughly 128 MiB for the script-side voxel
    // mirror alone. Boxes keeps this mirror in the isolate, so local runtimes
    // need enough headroom for scripts, entities and protocol snapshots too.
    SCRIPT_HEAP_MB:
      process.env.BOX_SCRIPT_HEAP_MB || process.env.SCRIPT_HEAP_MB || '512',
    // Local products create sessions through the web API, which authenticates
    // the internal runtime request and preserves the actual client address.
    BOX_DIRECT_SESSION_API: 'false',
    // Editable projects contain only project-owned blobs. Engine assets such
    // as block_info remain in the immutable bundled data directory and are a
    // read-only fallback, matching the shared content layer used by Boxes.
    BOX_BUNDLED_CONTENT_PATH:
      process.env.BOX_BUNDLED_CONTENT_PATH || path.join(defaultDataRoot, 'blobs'),
    NODE_ENV: production ? 'production' : 'development',
  }

  const localStorageIdentity = launchTarget && projectManager
    ? projectManager.projectStorageIdentity(launchTarget.id)
    : null

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
          // Editor-side OSS URLs must point at the runtime that is actually
          // serving this project. Creator launches often run edit-only, so
          // the play port is intentionally unavailable in that mode.
          OSS_CDN_URL: `http://127.0.0.1:${port}`,
          METHOD: 'local',
          MODE: mode,
          // Creator and Play sessions are authenticated by Player Service.
          // Do not use the upstream fake admin/guest login shortcuts: they
          // replace the registered account with adminXXXXX or a guest user.
          LOGIN: '',
          IS_HTTPS: 'false',
          PORT: String(port),
          HOST_IP: hostIP,
          // The launcher resolves one authoritative read source. Play writes
          // generated prebake/build data only to BOX_DERIVED_STORAGE_PATH.
          STORAGE_PATH: mode === 'play' ? playServerDataRoot : dataRoot,
          BOX_DERIVED_STORAGE_PATH:
            mode === 'play'
              ? derivedRuntimePath(
                  mode,
                  localStorageIdentity?.mapUuid ||
                    projectId ||
                    releaseId ||
                    process.env.BOX_WORLD_MAP_UUID ||
                    process.env.BOX_WORLD_ID ||
                    readProjectHash()
                )
              : '',
          BOX_PROJECT_STATE_PATH: projectStatePath,
          BOX_GROUP_PROJECT_STATE_PATH: groupStatePath,
          BOX_GROUP_CONTENT_PATH: groupBlobRoot,
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
            readCloudMapId() ||
            '0',
          BOX_DATA_STORAGE_NAMESPACE: dataStorageNamespace(
            localStorageIdentity?.mapUuid ||
            process.env.BOX_WORLD_MAP_UUID ||
            process.env.BOX_WORLD_ID ||
            process.env.BOX_SERVER_CONTENT_ID ||
            'default'
          ),
          // getGroupStorage is shared inside one map group, never across
          // unrelated projects or independently distributed game packages.
          BOX_GROUP_STORAGE_NAMESPACE: groupStorageNamespace(projectId),
          BOX_SERVER_NAME:
            process.env.BOX_WORLD_NAME ||
            process.env.BOX_SERVER_NAME ||
            'BOX 世界',
          // Local VOXA defaults are scoped by the editable project. Leaving
          // this empty makes every Creator runtime query the legacy mapId=0
          // default and leaks another project's skin into startProject().
          CONTAINER_NAME:
            projectId ||
            releaseId ||
            process.env.BOX_WORLD_ID ||
            process.env.BOX_SERVER_CONTENT_ID ||
            '',
          PLAYER_LIMIT: process.env.BOX_LOCAL_PLAYER_LIMIT || '8',
          MAX_ZERO_PLAYER_TIME: '2147483647',
        },
      }
    )

  const startLibraryRuntime = async (world, port) => {
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
          LOGIN: '',
          IS_HTTPS: 'false',
          PORT: String(port),
          HOST_IP: '127.0.0.1',
          STORAGE_PATH: world.dataRoot,
          BOX_PROJECT_STATE_PATH: world.statePath,
          BOX_DERIVED_STORAGE_PATH: derivedRuntimePath(
            'play',
            world.manifest.mapUuid || world.id
          ),
          HASH: world.manifest.permissionHash,
          VM: scriptVm,
          CONTENT_ID: world.id,
          // Multi-world play deployments must never collapse all maps into a
          // single data namespace. Server owners can add a prefix, while the
          // immutable Map UUID always remains part of the namespace.
          BOX_DATA_STORAGE_NAMESPACE: dataStorageNamespace(
            world.manifest.mapUuid || world.id,
            false,
          ),
          BOX_GROUP_STORAGE_NAMESPACE:
            world.manifest.mapGroupUuid ||
            groupStorageNamespace(world.manifest.mainProjectId || world.id),
          BOX_SERVER_NAME: world.manifest.projectName || world.id,
          CONTAINER_NAME: world.id,
          PLAYER_LIMIT: process.env.BOX_LOCAL_PLAYER_LIMIT || '8',
          MAX_ZERO_PLAYER_TIME: '2147483647',
        },
      }
    )
    const runtime = {
      port,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      exited: false,
      async stop() {
        await terminateRuntimeChild(child, runtime, 1500)
      },
    }
    child.once('exit', () => {
      runtime.exited = true
    })
    return runtime
  }

  const startProjectRuntime = async (project, port, mode) => {
    const child = spawn(
      process.execPath,
      [
        path.join(packageRoot, 'src/launcher.js'),
        ...(production ? ['--production'] : []),
        '--runtime-only',
        '--runtime-mode',
        mode,
        '--project',
        project.id,
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          ...(mode === 'edit'
            ? {
                BOX_EDIT_RUNTIME_PORT: String(port),
                BOX_EDIT_RUNTIME_HOST: '127.0.0.1',
              }
            : {
                BOX_PLAY_RUNTIME_PORT: String(port),
                BOX_PLAY_RUNTIME_HOST: '127.0.0.1',
              }),
        },
      }
    )
    const runtime = {
      port,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      exited: false,
      async stop() {
        await terminateRuntimeChild(child, runtime, 5000)
      },
    }
    child.once('exit', () => {
      runtime.exited = true
    })
    return runtime
  }

  if (creatorMode) {
    const resolveProject = (id) => {
      try {
        const target = projectManager.getLaunchTarget({ project: id })
        return target.kind === 'source' ? { id, target } : null
      } catch (error) {
        console.error(`Unable to resolve local project ${id}: ${error.message}`)
        return null
      }
    }
    editLibrary = require('./edit-library').startEditLibrary({
      host: editRuntimeHost,
      port: editPort,
      mode: 'edit',
      runtimePortStart: 11000,
      resolveProject,
      startRuntime: (project, port) =>
        startProjectRuntime(project, port, 'edit'),
      waitForRuntime: waitFor,
      maxRuntimes: process.env.BOX_CREATOR_EDIT_MAX_RUNTIMES || '6',
      idleTimeoutMs: process.env.BOX_RUNTIME_IDLE_TIMEOUT_MS || '900000',
    })
    creatorPlayLibrary = require('./edit-library').startEditLibrary({
      host: playRuntimeHost,
      port: playPort,
      mode: 'play',
      runtimePortStart: 12000,
      resolveProject,
      startRuntime: (project, port) =>
        startProjectRuntime(project, port, 'play'),
      waitForRuntime: waitFor,
      maxRuntimes: process.env.BOX_CREATOR_PLAY_MAX_RUNTIMES || '4',
      idleTimeoutMs: process.env.BOX_RUNTIME_IDLE_TIMEOUT_MS || '900000',
    })
    await Promise.all([editLibrary.ready, creatorPlayLibrary.ready])

    const backupConfiguration = projectManager.getBackupConfiguration()
    if (backupConfiguration.enabled) {
      let backupRunning = false
      const runAutomaticBackup = async () => {
        if (backupRunning || shuttingDown) return
        backupRunning = true
        try {
          for (const project of projectManager.listProjects()) {
            await new Promise((resolve) => {
              const request = http.request({
                hostname: '127.0.0.1',
                port: editPort,
                path: `/${encodeURIComponent(project.id)}/internal/save-local-project`,
                method: 'POST',
                timeout: 10_000,
              }, (response) => {
                response.resume()
                response.on('end', resolve)
              })
              request.on('timeout', () => request.destroy())
              request.on('error', resolve)
              request.end()
            })
          }
          const result = projectManager.runProjectBackups('automatic')
          if (result.failed?.length) {
            console.warn(`Automatic project backup completed with ${result.failed.length} failure(s).`)
          }
        } catch (error) {
          console.error(`Automatic project backup failed: ${error.message}`)
        } finally {
          backupRunning = false
        }
      }
      const intervalMs = backupConfiguration.intervalMinutes * 60 * 1000
      backupTimer = setInterval(runAutomaticBackup, intervalMs)
      backupTimer.unref()
      setTimeout(runAutomaticBackup, 15_000).unref()
      console.log(
        `Automatic project backup enabled: every ${backupConfiguration.intervalMinutes} minute(s), keep ${backupConfiguration.retentionCount} per project.`
      )
    }
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
      maxRuntimes: process.env.BOX_PLAY_MAX_RUNTIMES || '8',
      idleTimeoutMs: process.env.BOX_RUNTIME_IDLE_TIMEOUT_MS || '900000',
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

  // Boxes makes container allocation and shared-build-cache work happen
  // before the engine route becomes interactive. Keep the manager responsive,
  // then warm a small, configurable recent set in the background. Runtime
  // capacity/LRU still owns the hard upper bound.
  const prewarmTimer = setTimeout(async () => {
    try {
      if (creatorMode && editLibrary && creatorPlayLibrary) {
        const projects = projectManager.listProjects()
        const editCount = prewarmCount(
          'BOX_CREATOR_EDIT_PREWARM_RUNTIMES',
          1,
          process.env.BOX_CREATOR_EDIT_MAX_RUNTIMES || 6
        )
        const playCount = prewarmCount(
          'BOX_CREATOR_PLAY_PREWARM_RUNTIMES',
          1,
          process.env.BOX_CREATOR_PLAY_MAX_RUNTIMES || 4
        )
        for (const project of projects.slice(0, editCount)) {
          await editLibrary.ensureRuntime(project.id)
        }
        for (const project of projects.slice(0, playCount)) {
          await creatorPlayLibrary.ensureRuntime(project.id)
        }
      } else if (usesPlayLibrary && playLibrary) {
        const worlds = playLibrary.listWorlds().sort((left, right) => {
          const leftMain = left.manifest.mapRole === 'main' ? 0 : 1
          const rightMain = right.manifest.mapRole === 'main' ? 0 : 1
          return leftMain - rightMain || left.id.localeCompare(right.id)
        })
        const count = prewarmCount(
          'BOX_PLAY_PREWARM_RUNTIMES',
          1,
          process.env.BOX_PLAY_MAX_RUNTIMES || 8
        )
        for (const world of worlds.slice(0, count)) {
          await playLibrary.ensureRuntime(world.id)
        }
      }
    } catch (error) {
      console.warn(`Runtime background prewarm failed: ${error.message}`)
    }
  }, 1000)
  prewarmTimer.unref()

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
