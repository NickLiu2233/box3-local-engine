'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const failures = []

function fail(message) {
  failures.push(message)
}

function readRequired(file, label = file) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    fail(`missing ${label}: ${file}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

function requirePattern(source, file, label, pattern) {
  if (source && !pattern.test(source)) {
    fail(`${file}: missing ${label}`)
  }
}

function forbidPattern(source, file, label, pattern) {
  if (source && pattern.test(source)) {
    fail(`${file}: contains ${label}`)
  }
}

function requireScript(manifest, manifestFile, name, expected) {
  if (manifest.scripts?.[name] !== expected) {
    fail(
      `${manifestFile}: script ${name} must be ${JSON.stringify(expected)}`,
    )
  }
}

function collectFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return []
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(target, predicate))
    } else if (predicate(target)) {
      files.push(target)
    }
  }
  return files
}

function getDockerStage(source, name) {
  const header = new RegExp(`^FROM\\s+[^\\n]+\\s+AS\\s+${name}\\s*$`, 'mi')
  const match = header.exec(source)
  if (!match) return ''
  const remainder = source.slice(match.index + match[0].length)
  const nextStage = /^FROM\s+[^\n]+(?:\s+AS\s+[^\s]+)?\s*$/mi.exec(remainder)
  return nextStage ? remainder.slice(0, nextStage.index) : remainder
}

function getComposeService(source, name) {
  const header = new RegExp(`^  ${name}:\\s*$`, 'm')
  const match = header.exec(source)
  if (!match) return ''
  const remainder = source.slice(match.index + match[0].length)
  const nextSection = /^(?:  [A-Za-z0-9_-]+:|\S[^\n]*:)\s*$/m.exec(remainder)
  return nextSection ? remainder.slice(0, nextSection.index) : remainder
}

const requiredFiles = [
  '.dockerignore',
  '.env.docker.example',
  'docker-compose.yml',
  'docs/creator-deployment.md',
  'docs/deployment.md',
  'docs/play-deployment.md',
  'docs/voxa-deployment.md',
  'apps/local-engine/Dockerfile',
  'apps/local-engine/config/local.config.json',
  'apps/local-engine/src/build.js',
  'apps/local-engine/src/launcher.js',
  'apps/local-engine/src/play-library.js',
  'apps/local-engine/src/play-image.js',
  'apps/local-engine/src/prune-player-build.js',
  'apps/local-engine/src/stage-runtime-data.js',
  'services/game-server/scripts/dev-launch.js',
  'services/game-server/src/assets/block_info.ts',
  'services/game-server/src/player/default-avatar.json',
  'services/game-server/src/player/default-avatar-skin.ts',
]

for (const file of requiredFiles) readRequired(file)

// Workspace dependencies must stay self-contained and must not point at the
// old private registry.
const workspaceText = readRequired('pnpm-workspace.yaml')
const workspaceDirs = workspaceText
  .split('\n')
  .map((line) => line.match(/^\s*-\s+['"]?([^'"]+)['"]?\s*$/)?.[1])
  .filter(Boolean)
const packages = new Map()

for (const directory of workspaceDirs) {
  const packageFile = path.join(root, directory, 'package.json')
  if (!fs.existsSync(packageFile)) {
    fail(`workspace package is missing: ${directory}/package.json`)
    continue
  }
  const manifest = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
  packages.set(manifest.name, { directory, manifest })
}

for (const { directory, manifest } of packages.values()) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  }
  for (const [name, version] of Object.entries(dependencies)) {
    if (name.startsWith('@box-local/') && !packages.has(name)) {
      fail(`${directory}: missing local package ${name}@${version}`)
    }
  }
  if (manifest.publishConfig?.registry?.includes('box3')) {
    fail(`${directory}: private registry is still configured`)
  }
}

// Creator/play are the complete public product interface. Deployment must not
// expose the old client/server split as separate commands.
const rootManifest = JSON.parse(readRequired('package.json'))
for (const [name, command] of Object.entries({
  creator: 'node apps/local-engine/src/deploy.js creator',
  'creator:up':
    'docker compose --profile creator up -d --no-build creator',
  voxa: 'node apps/local-engine/src/deploy.js voxa',
  'voxa:image': 'docker compose --profile voxa build voxa',
  'voxa:up': 'node apps/local-engine/src/deploy.js voxa-up',
  'voxa:dev': 'pnpm --filter @box-local/voxa dev',
  play: 'node apps/local-engine/src/deploy.js play',
  stop: 'node apps/local-engine/src/deploy.js stop',
  dev: 'node apps/local-engine/src/launcher.js --creator',
  'build:creator': 'node apps/local-engine/src/build.js --creator',
  'start:creator':
    'node apps/local-engine/src/launcher.js --production --creator',
  'build:play': 'node apps/local-engine/src/build.js --play',
  'build:voxa': 'pnpm --filter @box-local/voxa build',
  'start:play': 'node apps/local-engine/src/launcher.js --production --play',
})) {
  requireScript(rootManifest, 'package.json', name, command)
}
for (const name of [
  'build',
  'start',
  'build:client',
  'build:server',
  'start:client',
  'start:server',
  'docker:creator',
  'docker:play',
  'docker:stop',
  'project:serve',
  'project:edit',
]) {
  if (rootManifest.scripts?.[name]) {
    fail(`package.json: legacy public script must be removed: ${name}`)
  }
}

const deployFile = 'apps/local-engine/src/deploy.js'
const deploySource = readRequired(deployFile)
for (const [label, pattern] of [
  ['creator image build', /'build', 'creator'/],
  ['creator builds only the creator image', /'build', 'creator'/],
  ['play uses the external world library', /BOX_PLAY_LIBRARY_DIR/],
  ['play accepts no release argument', /pnpm play 不接受作品参数/],
  ['creator starts without rebuilding', /'up',[\s\S]*?'-d',[\s\S]*?'--no-build',[\s\S]*?'creator'/],
  ['play starts without rebuilding', /'up',[\s\S]*?'-d',[\s\S]*?'--no-build',[\s\S]*?'play'/],
  ['VOXA builds only its Docker target', /'build', 'voxa'/],
  ['VOXA starts without rebuilding', /'up',[\s\S]*?'-d',[\s\S]*?'--no-build',[\s\S]*?'voxa'/],
]) {
  requirePattern(deploySource, deployFile, label, pattern)
}
forbidPattern(
  deploySource,
  deployFile,
  'creator building the play image',
  /deployCreator\(\)[\s\S]*?ensurePlayImageArchive[\s\S]*?function deployPlay/,
)

const playImageFile = 'apps/local-engine/src/play-image.js'
const playImageSource = readRequired(playImageFile)
for (const [label, pattern] of [
  ['default amd64 distribution', /'linux\/amd64'/],
  ['platform-aware image build', /BOX_PLAY_PLATFORM:[\s\S]*?'build', 'play'/],
  ['image archive export', /'image', 'save'/],
  ['archive tag validation', /RepoTags\.includes\(image\)/],
  ['multi-world image format validation', /org\.box\.local-engine\.play-format/],
  [
    'archive platform validation',
    /imageConfig\.os[\s\S]*?imageConfig\.architecture/,
  ],
]) {
  requirePattern(playImageSource, playImageFile, label, pattern)
}

const engineManifest = JSON.parse(readRequired('apps/local-engine/package.json'))
for (const [name, command] of Object.entries({
  dev: 'node src/launcher.js --creator',
  'build:creator': 'node src/build.js --creator',
  'start:creator': 'node src/launcher.js --production --creator',
  'build:play': 'node src/build.js --play',
  'start:play': 'node src/launcher.js --production --play',
})) {
  requireScript(engineManifest, 'apps/local-engine/package.json', name, command)
}
for (const name of ['build', 'start']) {
  if (engineManifest.scripts?.[name]) {
    fail(`apps/local-engine/package.json: ambiguous script must be removed: ${name}`)
  }
}
for (const name of [
  'build:client',
  'build:server',
  'start:client',
  'start:server',
]) {
  if (engineManifest.scripts?.[name]) {
    fail(
      `apps/local-engine/package.json: legacy public script must be removed: ${name}`,
    )
  }
}

const gameManifest = JSON.parse(readRequired('apps/game/package.json'))
for (const name of ['cdn-upload', 'upload-rusty']) {
  if (gameManifest.scripts?.[name]) {
    fail(`apps/game/package.json: cloud-only script must be removed: ${name}`)
  }
}

// Local production builds must use the same MuDB protocol-validation rule on
// both sides. Using `||` here makes the browser skip validation while the
// local game server expects it, so the first `start ...` packet is parsed as
// JSON and the websocket is closed immediately.
for (const file of [
  'apps/game/src/client/index.ts',
  'apps/game/src/client/play/play-client.ts',
]) {
  const source = readRequired(file)
  requirePattern(
    source,
    file,
    'local production protocol validation',
    /process\.env\.NODE_ENV !== 'development'\s*&&\s*!clientConfig\.isLocalGameServer/,
  )
  forbidPattern(
    source,
    file,
    'mismatched local production protocol validation',
    /process\.env\.NODE_ENV !== 'development'\s*\|\|\s*!clientConfig\.isLocalGameServer/,
  )
}

const gameServerManifest = JSON.parse(
  readRequired('services/game-server/package.json'),
)
requireScript(
  gameServerManifest,
  'services/game-server/package.json',
  'dev',
  'node scripts/dev-launch.js',
)
const gameServerDevLauncher = readRequired(
  'services/game-server/scripts/dev-launch.js',
)
for (const [label, pattern] of [
  ['local config path', /BOX_LOCAL_CONFIG_PATH/],
  ['local runtime method', /METHOD: 'local'/],
  ['local script VM', /VM: process\.env\.VM \|\| 'local'/],
]) {
  requirePattern(
    gameServerDevLauncher,
    'services/game-server/scripts/dev-launch.js',
    label,
    pattern,
  )
}
for (const file of [
  'apps/game/rusty/.env.prod',
  'apps/game/rusty/.env.local.example',
]) {
  forbidPattern(
    readRequired(file),
    file,
    'legacy BOX online environment URL',
    /(?:dao3|createra|box3)\.fun/i,
  )
}

// One Dockerfile must produce two deliberately different final images.
const dockerFile = 'apps/local-engine/Dockerfile'
const dockerSource = readRequired(dockerFile)
for (const [label, pattern] of [
  ['creator build stage', /^FROM engine-build-base AS creator-build$/m],
  ['creator build command', /^RUN pnpm build:creator$/m],
  ['play build stage', /^FROM engine-build-base AS play-build$/m],
  ['play build command', /^RUN pnpm build:play$/m],
  ['creator final target', /^FROM runtime-base AS creator$/m],
  ['play final target', /^FROM runtime-base AS play$/m],
  ['VOXA build stage', /^FROM source-base AS voxa-build$/m],
  ['VOXA filtered dependency install', /pnpm install --frozen-lockfile --filter @box-local\/voxa\.\.\./],
  ['VOXA build command', /^RUN pnpm --filter @box-local\/voxa build$/m],
  ['VOXA final target', /^FROM runtime-base AS voxa$/m],
  [
    'referenced runtime-blob staging',
    /stage-runtime-data\.js \/opt\/runtime-data/,
  ],
  [
    'play server editor removal',
    /play-build[\s\S]*?rm -rf[\s\S]*?\/opt\/game-server\/dist\/src\/edit[\s\S]*?\/opt\/game-server\/dist\/src\/deploy/,
  ],
]) {
  requirePattern(dockerSource, dockerFile, label, pattern)
}

for (const extension of [
  "-name '.env'",
  "-name '.env.*'",
  "-name '*.pem'",
  "-name '*.key'",
  "-name '*.map'",
  "-name '*.ts'",
  "-name '*.tsx'",
  "-name '*.nft.json'",
]) {
  const occurrences = dockerSource.split(extension).length - 1
  if (occurrences < 2) {
    fail(`${dockerFile}: ${extension} must be removed in both build targets`)
  }
}

const creatorDockerStage = getDockerStage(dockerSource, 'creator')
const playDockerStage = getDockerStage(dockerSource, 'play')
const voxaDockerStage = getDockerStage(dockerSource, 'voxa')
for (const [name, stage, flag] of [
  ['creator', creatorDockerStage, '--creator'],
  ['play', playDockerStage, '--play'],
]) {
  if (!stage) {
    fail(`${dockerFile}: cannot inspect ${name} final target`)
    continue
  }
  requirePattern(stage, dockerFile, `${name} target runs as node`, /^USER node$/m)
  requirePattern(
    stage,
    dockerFile,
    `${name} launcher command`,
    new RegExp(`CMD \\["node", "apps/local-engine/src/launcher\\.js", "--production", "${flag}"\\]`),
  )
  requirePattern(
    stage,
    dockerFile,
    `${name} staged runtime data`,
    /COPY --from=[^\s]+ --chown=node:node \/opt\/runtime-data \/app\/apps\/local-engine\/data/,
  )
  forbidPattern(stage, dockerFile, `${name} broad source-tree copy`, /^COPY (?!.*--from=).*$/m)
}
requirePattern(
  creatorDockerStage,
  dockerFile,
  'creator project manager runtime',
  /project-manager\.js/,
)
requirePattern(
  creatorDockerStage,
  dockerFile,
  'creator play-image cache validator',
  /play-image\.js/,
)
requirePattern(
  creatorDockerStage,
  dockerFile,
  'creator project and export volumes',
  /VOLUME \["\/app\/apps\/local-engine\/projects", "\/app\/apps\/local-engine\/dist"\]/,
)
requirePattern(
  playDockerStage,
  dockerFile,
  'play deployment runtime',
  /BOX_DEPLOYMENT_MODE=play/,
)
forbidPattern(
  playDockerStage,
  dockerFile,
  'creator project manager in play image',
  /project-manager\.js|\/app\/apps\/local-engine\/projects/,
)
requirePattern(
  voxaDockerStage,
  dockerFile,
  'VOXA local data volume',
  /VOLUME \["\/app\/apps\/voxa\/data"\]/,
)
requirePattern(
  voxaDockerStage,
  dockerFile,
  'VOXA standalone server',
  /CMD \["node", "apps\/voxa\/\.next\/standalone\/apps\/voxa\/server\.js"\]/,
)
requirePattern(voxaDockerStage, dockerFile, 'VOXA target runs as node', /^USER node$/m)
requirePattern(
  voxaDockerStage,
  dockerFile,
  'VOXA source and secret file purge',
  /find \/app\/apps\/voxa\/\.next\/standalone[\s\S]*?-name '\*\.map'[\s\S]*?-name '\*\.ts'[\s\S]*?-name '\*\.tsx'/,
)

// Compose exposes exactly the two product roles and builds both from the
// unified Dockerfile. Creator remains localhost-only; play is externally usable.
const composeFile = 'docker-compose.yml'
const composeSource = readRequired(composeFile)
const composeServiceNames = []
let inServices = false
for (const line of composeSource.split('\n')) {
  if (line === 'services:') {
    inServices = true
    continue
  }
  if (inServices && /^\S/.test(line) && line.trim()) break
  const match = inServices ? line.match(/^  ([A-Za-z0-9_-]+):\s*$/) : null
  if (match) composeServiceNames.push(match[1])
}
if (composeServiceNames.join(',') !== 'creator,play,voxa') {
  fail(
    `${composeFile}: services must be exactly creator, play and voxa (found ${composeServiceNames.join(', ') || 'none'})`,
  )
}

const creatorCompose = getComposeService(composeSource, 'creator')
const playCompose = getComposeService(composeSource, 'play')
const voxaCompose = getComposeService(composeSource, 'voxa')
for (const [name, service] of [
  ['creator', creatorCompose],
  ['play', playCompose],
]) {
  requirePattern(service, composeFile, `${name} profile`, new RegExp(`profiles: \\[${name}\\]`))
  requirePattern(
    service,
    composeFile,
    `${name} unified Dockerfile`,
    /dockerfile: apps\/local-engine\/Dockerfile/,
  )
  requirePattern(service, composeFile, `${name} Docker target`, new RegExp(`target: ${name}`))
  requirePattern(
    service,
    composeFile,
    `${name} deployment mode`,
    new RegExp(`BOX_DEPLOYMENT_MODE: ${name}`),
  )
}
requirePattern(voxaCompose, composeFile, 'VOXA profile', /profiles: \[voxa\]/)
requirePattern(
  voxaCompose,
  composeFile,
  'VOXA unified Dockerfile',
  /dockerfile: apps\/local-engine\/Dockerfile/,
)
requirePattern(voxaCompose, composeFile, 'VOXA Docker target', /target: voxa/)
requirePattern(
  voxaCompose,
  composeFile,
  'localhost-only VOXA port',
  /127\.0\.0\.1:\$\{BOX_VOXA_PORT:-3001\}:3001/,
)
requirePattern(
  voxaCompose,
  composeFile,
  'host-backed VOXA data',
  /\.\/apps\/voxa\/data:.*\/app\/apps\/voxa\/data/,
)
requirePattern(
  voxaCompose,
  composeFile,
  'VOXA upload size limit',
  /VOXA_MAX_BLOB_BYTES: \$\{VOXA_MAX_BLOB_BYTES:-268435456\}/,
)
requirePattern(
  creatorCompose,
  composeFile,
  'single localhost-only creator port',
  /ports:\s*\n\s*- "127\.0\.0\.1:\$\{BOX_PORT:-3000\}:3000"/,
)
requirePattern(
  creatorCompose,
  composeFile,
  'host-backed creator projects',
  /\.\/apps\/local-engine\/projects:.*\/app\/apps\/local-engine\/projects/,
)
forbidPattern(
  composeSource,
  composeFile,
  'legacy creator project volume',
  /box-creator-projects/,
)
requirePattern(
  creatorCompose,
  composeFile,
  'localhost-only creator runtime ports',
  /127\.0\.0\.1:9966:9966[\s\S]*?127\.0\.0\.1:9967:9967/,
)
requirePattern(
  playCompose,
  composeFile,
  'single public play port',
  /ports:\s*\n\s*- "\$\{BOX_PORT:-3000\}:3000"/,
)
requirePattern(
  playCompose,
  composeFile,
  'portable amd64 play image',
  /platform: \$\{BOX_PLAY_PLATFORM:-linux\/amd64\}/,
)
requirePattern(
  playCompose,
  composeFile,
  'external read-only play library mount',
  /BOX_PLAY_LIBRARY_PATH: \/app\/play-worlds[\s\S]*?source: "\$\{BOX_PLAY_LIBRARY_DIR:-[^"]+\}"[\s\S]*?read_only: true/,
)
forbidPattern(playCompose, composeFile, 'localhost-only play port binding', /127\.0\.0\.1:/)
forbidPattern(
  playCompose,
  composeFile,
  'separate public play runtime',
  /9966:9966|BOX_PLAY_SERVER|BOX_REMOTE_SERVER_URL|BOX_SERVER_PUBLIC_URL/,
)
forbidPattern(
  composeSource,
  composeFile,
  'legacy split Dockerfile reference',
  /apps\/game\/Dockerfile|services\/game-server\/Dockerfile/,
)

// Build and launcher boundaries: creator owns management, while play starts no
// editor and uses the pruned player web build.
const buildFile = 'apps/local-engine/src/build.js'
const buildSource = readRequired(buildFile)
for (const [label, pattern] of [
  ['creator build mode', /process\.argv\.includes\('--creator'\)/],
  ['play build mode', /process\.argv\.includes\('--play'\)/],
  ['play selects play browser build', /const playBuild = playMode/],
  [
    'player route pruning for build and standalone output',
    /prunePlayerBuild\(path\.join\(gameRoot, '\.next'\)\)[\s\S]*?prunePlayerBuild\(path\.join\(standaloneGameRoot, '\.next'\)\)/,
  ],
  ['play-only build marker', /fs\.writeFileSync\(playBuildMarker, 'play-only\\n'\)/],
  [
    'standalone play-only build marker',
    /path\.join\(standaloneGameRoot, '\.next\/BOX_PLAY_BUILD'\)/,
  ],
  ['standalone local-engine removal', /path\.join\(standaloneGameRoot, '\.\.\/local-engine'\)/],
  ['standalone environment removal', /path\.join\(standaloneGameRoot, '\.env\.local'\)/],
  ['standalone private-key removal', /entry\.name\.endsWith\('\.pem'\)[\s\S]*?entry\.name\.endsWith\('\.key'\)/],
  ['cross-process build lock', /acquireBuildLock\(\)[\s\S]*?Another \$\{owner\.mode \|\| 'creator\/play'\} build is already running/],
]) {
  requirePattern(buildSource, buildFile, label, pattern)
}
forbidPattern(
  buildSource,
  buildFile,
  'legacy client/server build modes',
  /--client\b|--server\b|start:client|start:server/,
)

const launcherFile = 'apps/local-engine/src/launcher.js'
const launcherSource = readRequired(launcherFile)
for (const [label, pattern] of [
  ['creator launch mode', /process\.argv\.includes\('--creator'\)/],
  ['play launch mode', /process\.argv\.includes\('--play'\)/],
  ['creator is the default product', /const creatorMode = !playMode && !runtimeOnly/],
  ['play starts the game runtime', /playMode \|\| \(runtimeOnly && runtimeMode !== 'edit'\)/],
  ['play skips edit runtime', /const startsEditServer = runtimeOnly && runtimeMode !== 'play'/],
  ['play uses player web build', /const usesPlayerWeb = playMode/],
  ['creator project runtime mode', /--runtime-only requires --project <project-id>/],
  ['play rejects editable source projects', /playMode && launchTarget\?\.kind === 'source'/],
  ['product environment flag', /BOX_DEPLOYMENT_MODE: playMode \? 'play' : 'creator'/],
  ['single product address', /Open: http:\/\/127\.0\.0\.1:\$\{webPort\}\//],
  [
    'standalone build-id validation',
    /fs\.existsSync\(nextBuildId\) \|\| fs\.existsSync\(standaloneBuildId\)/,
  ],
  [
    'immutable play-world copy',
    /startLibraryRuntime[\s\S]*?fs\.mkdtempSync\([\s\S]*?box-local-engine-\$\{world\.id\}-[\s\S]*?fs\.cpSync\(world\.dataRoot, temporaryRoot/,
  ],
  [
    'mode-specific runtime storage',
    /STORAGE_PATH: mode === 'play' \? playServerDataRoot : dataRoot/,
  ],
]) {
  requirePattern(launcherSource, launcherFile, label, pattern)
}
requirePattern(
  launcherSource,
  launcherFile,
  'same-origin play runtime',
  /BOX_REMOTE_SERVER_URL: playMode \? '\/runtime\/play' : ''/,
)
forbidPattern(
  launcherSource,
  launcherFile,
  'legacy client/server launch modes',
  /--client-only|--server-only|Player Client|Dedicated Server/,
)

const serverLaunchFile = 'services/game-server/src/launch.ts'
const serverLaunchSource = readRequired(serverLaunchFile)
requirePattern(
  serverLaunchSource,
  serverLaunchFile,
  'lazy CI deploy module loading',
  /const \{ startDeployServer \} = await import\('\.\/deploy\/entry'\)/,
)
forbidPattern(
  serverLaunchSource,
  serverLaunchFile,
  'complete runtime config logging',
  /Game server config from nacos|%o', serverConfig/,
)

const serverEntryFile = 'services/game-server/src/entry.ts'
requirePattern(
  readRequired(serverEntryFile),
  serverEntryFile,
  'edit-only local project state persistence',
  /if \(isLocal && spec\.mode === 'edit'\) \{\s*persistLocalProjectState\(hash\)/,
)

// Every project-management API must independently reject a player deployment,
// even before the generated route is physically pruned.
const localProjectApiRoot = path.join(root, 'apps/game/pages/api/local-projects')
const localProjectApiFiles = collectFiles(
  localProjectApiRoot,
  (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
)
if (localProjectApiFiles.length === 0) {
  fail('missing local project management API sources')
}
for (const filePath of localProjectApiFiles) {
  const source = fs.readFileSync(filePath, 'utf8')
  const file = path.relative(root, filePath)
  requirePattern(source, file, 'play deployment guard', /BOX_DEPLOYMENT_MODE === 'play'/)
  requirePattern(source, file, '404 response in play mode', /status\(404\)|unavailable\(res\)/)
}

for (const [file, label, pattern] of [
  [
    'apps/game/pages/projects/index.tsx',
    'projects page hidden in play deployments',
    /BOX_DEPLOYMENT_MODE === 'play'[\s\S]*?notFound: true/,
  ],
  [
    'apps/game/app/e/[container]/page.tsx',
    'editor route redirected in play deployments',
    /BOX_DEPLOYMENT_MODE === 'play'[\s\S]*?redirect\('\/p\/local'\)/,
  ],
  [
    'apps/game/pages/map/[mapId]/recovery.tsx',
    'recovery page hidden in play deployments',
    /BOX_DEPLOYMENT_MODE === 'play'[\s\S]*?notFound: true/,
  ],
  [
    'apps/game/pages/api/createSession.ts',
    'edit session rejected in play deployments',
    /BOX_DEPLOYMENT_MODE === 'play'[\s\S]*?mode !== 'play'[\s\S]*?status\(404\)/,
  ],
  [
    'apps/game/pages/api/getMapInfo.ts',
    'edit map info rejected in play deployments',
    /BOX_DEPLOYMENT_MODE === 'play'[\s\S]*?mode !== 'play'[\s\S]*?status\(404\)/,
  ],
  [
    'apps/game/pages/api/config/[...slug].ts',
    'edit config rejected in play deployments',
    /BOX_DEPLOYMENT_MODE === 'play'[\s\S]*?mode !== 'play'[\s\S]*?status\(404\)/,
  ],
  [
    'apps/game/webpack/index.js',
    'player adapters replace editor and admin entries',
    /BOX_PLAY_BUILD[\s\S]*?player-only[\s\S]*?src\\\/entry\\\/editor-page[\s\S]*?src\\\/entry\\\/admin-client[\s\S]*?src\\\/entry\\\/admin-ui/,
  ],
  [
    'apps/game/webpack/index.js',
    'Monaco excluded from player builds',
    /if \(!isPlayBuild\) \{[\s\S]*?CopyWebpackPlugin[\s\S]*?monaco-editor\/package\.json/,
  ],
]) {
  requirePattern(readRequired(file), file, label, pattern)
}
for (const file of [
  'apps/game/pages/connect.tsx',
  'apps/game/pages/export-p.tsx',
  'apps/game/pages/p/[gameName]/[num].tsx',
  'apps/game/pages/play-client-demo.tsx',
]) {
  if (fs.existsSync(path.join(root, file))) {
    fail(`${file}: legacy public route must be removed`)
  }
}
const remoteTargetFile = 'apps/game/src/utils/remote-game-server.ts'
const remoteTargetSource = readRequired(remoteTargetFile)
forbidPattern(
  remoteTargetSource,
  remoteTargetFile,
  'query-selected runtime',
  /URLSearchParams[\s\S]*?get\('server'\)/,
)
forbidPattern(
  remoteTargetSource,
  remoteTargetFile,
  'remembered runtime selection',
  /localStorage|rememberRemoteServerURL/,
)
requirePattern(
  remoteTargetSource,
  remoteTargetFile,
  'same-origin WebSocket target',
  /socketServerURL: baseURL\.replace\(\/\^http\/, 'ws'\)/,
)

const browserConfigFile = 'apps/game/configs/client.ts'
const browserConfigSource = readRequired(browserConfigFile)
requirePattern(
  browserConfigSource,
  browserConfigFile,
  'creator and play browser URLs stay on the public origin',
  /BOX_DEPLOYMENT_MODE !== 'creator'[\s\S]*?BOX_DEPLOYMENT_MODE !== 'play'[\s\S]*?runtimeURL =[\s\S]*?`\/runtime\/play\/\$\{encodeURIComponent\(containerName\)\}`[\s\S]*?ARENA_URL: ''[\s\S]*?BACKEND_SERVER_URL: runtimeURL[\s\S]*?CDN_PATH: runtimeURL[\s\S]*?OSS_CDN_URL: runtimeURL/,
)
requirePattern(
  readRequired('apps/game/server/server-render.ts'),
  'apps/game/server/server-render.ts',
  'browser runtime prefix follows the page mode',
  /extractServerConfigForClient\([\s\S]*?serverConfig,[\s\S]*?mode,[\s\S]*?containerName/,
)
requirePattern(
  readRequired('apps/game/pages/api/createSession.ts'),
  'apps/game/pages/api/createSession.ts',
  'same-origin mode-specific WebSocket URL',
  /BOX_EDIT_RUNTIME_PUBLIC_PORT[\s\S]*?BOX_PLAY_RUNTIME_PUBLIC_PORT[\s\S]*?runtimePath =[\s\S]*?`\/runtime\/play\/\$\{encodeURIComponent\(containerName\)\}`[\s\S]*?socketServerUrl = `\$\{protocol\}:\/\/\$\{host\}\$\{runtimePath\}`/,
)
requirePattern(
  readRequired('apps/game/src/apis/api-java/index.ts'),
  'apps/game/src/apis/api-java/index.ts',
  'local uploads use the writable edit runtime',
  /fetch\('\/runtime\/edit\/block'[\s\S]*?method: 'POST'/,
)

const nextConfigFile = 'apps/game/next.config.js'
const nextConfigSource = readRequired(nextConfigFile)
for (const [label, pattern] of [
  ['internal play runtime target', /BOX_PLAY_RUNTIME_PORT[\s\S]*?'9966'[\s\S]*?BOX_INTERNAL_PLAY_RUNTIME/],
  ['internal edit runtime target', /BOX_EDIT_RUNTIME_PORT[\s\S]*?'9967'[\s\S]*?BOX_INTERNAL_EDIT_RUNTIME/],
  ['prefixed play runtime proxy', /source: '\/runtime\/play\/:path\*'[\s\S]*?localPlayRuntime/],
  ['prefixed edit runtime proxy', /source: '\/runtime\/edit\/:path\*'[\s\S]*?localEditRuntime/],
  ['same-origin session proxy', /source: '\/api\/session'[\s\S]*?\/api\/session/],
  ['same-origin server info proxy', /source: '\/api\/server-info'[\s\S]*?\/api\/server-info/],
  ['same-origin block proxy', /source: '\/block\/:path\*'/],
  ['same-origin WebSocket proxy', /key: 'upgrade', value: 'websocket'/],
  ['extended runtime proxy timeout', /proxyTimeout: 300_000/],
]) {
  requirePattern(nextConfigSource, nextConfigFile, label, pattern)
}
requirePattern(
  readRequired('apps/game/server/dev-server/index.ts'),
  'apps/game/server/dev-server/index.ts',
  'development WebSocket upgrade forwarding',
  /getUpgradeHandler\(\)[\s\S]*?server\.on\('upgrade'/,
)
requirePattern(
  readRequired('apps/game/server/dev-server/index.ts'),
  'apps/game/server/dev-server/index.ts',
  'development creator binds the configured host',
  /BOX_WEB_HOST[\s\S]*?server\.listen\(port, host/,
)

const projectRuntimeApiFile =
  'apps/game/pages/api/local-projects/[id]/runtime.ts'
const projectRuntimeApiSource = readRequired(projectRuntimeApiFile)
requirePattern(
  projectRuntimeApiSource,
  projectRuntimeApiFile,
  'development project runtime avoids production artifacts',
  /NODE_ENV === 'production'[\s\S]*?launcherArgs\.push\('--production'\)/,
)
requirePattern(
  projectRuntimeApiSource,
  projectRuntimeApiFile,
  'edit and play project runtimes are managed separately',
  /children: Partial<Record<RuntimeMode, ChildProcess>>[\s\S]*?--runtime-mode[\s\S]*?mode/,
)

requirePattern(
  playDockerStage,
  dockerFile,
  'loopback-only play runtime',
  /BOX_PLAY_RUNTIME_HOST=127\.0\.0\.1/,
)
requirePattern(
  creatorDockerStage,
  dockerFile,
  'docker-reachable creator runtimes',
  /BOX_PLAY_RUNTIME_HOST=0\.0\.0\.0[\s\S]*?BOX_EDIT_RUNTIME_HOST=0\.0\.0\.0/,
)
requirePattern(
  creatorDockerStage,
  dockerFile,
  'creator web and loopback runtime ports',
  /^EXPOSE 3000 9966 9967$/m,
)
requirePattern(
  playDockerStage,
  dockerFile,
  'single exposed play port',
  /^EXPOSE 3000$/m,
)
forbidPattern(
  playDockerStage,
  dockerFile,
  'public runtime port in play image',
  /EXPOSE[^\n]*9966/,
)
requirePattern(
  playDockerStage,
  dockerFile,
  'health check through same-origin proxy',
  /127\.0\.0\.1:3000\/api\/play-worlds/,
)

const projectManagerFile = 'apps/local-engine/src/project-manager.js'
const projectManagerSource = readRequired(projectManagerFile)
requirePattern(
  projectManagerSource,
  projectManagerFile,
  'single-port exported play package',
  /BOX_WORLD_PATH: \/app\/world\/data[\s\S]*?BOX_WORLD_HASH:[\s\S]*?BOX_PORT:-3000\}:3000/,
)
requirePattern(
  projectManagerSource,
  projectManagerFile,
  'one-command exported play deployment',
  /docker compose up -d/,
)
requirePattern(
  projectManagerSource,
  projectManagerFile,
  'exported play package includes the image archive',
  /contents\.push\('play-image\.tar'\)[\s\S]*?includePlayImage/,
)
requirePattern(
  projectManagerSource,
  projectManagerFile,
  'self-preparing play image export',
  /ensurePlayImageArchive\(\)/,
)
requirePattern(
  projectManagerSource,
  projectManagerFile,
  'play package records the image platform',
  /platform: playImageConfig\.platform/,
)
requirePattern(
  projectManagerSource,
  projectManagerFile,
  'release manifest and state validation',
  /manifest\.id !== id[\s\S]*?state\.permissionHash !== manifest\.permissionHash/,
)
requirePattern(
  readRequired('apps/game/pages/api/local-projects/[id]/package.ts'),
  'apps/game/pages/api/local-projects/[id]/package.ts',
  'project UI exports a self-contained play package',
  /includeImages: true/,
)
forbidPattern(
  projectManagerSource,
  projectManagerFile,
  'redundant exported compose filename flag',
  /docker compose -f compose\.yml/,
)
forbidPattern(
  projectManagerSource,
  projectManagerFile,
  'separate runtime in exported play package',
  /BOX_PLAY_SERVER_PORT|BOX_PLAY_SERVER_URL|BOX_REMOTE_SERVER_URL|BOX_SERVER_PUBLIC_URL|BOX_SERVER_DATA_PATH|BOX_PROJECT_STATE_PATH|BOX_PROJECT_HASH/,
)
requirePattern(
  readRequired('apps/game/pages/index.tsx'),
  'apps/game/pages/index.tsx',
  'root route selects creator or play product',
  /BOX_DEPLOYMENT_MODE !== 'play'[\s\S]*?'\/projects'[\s\S]*?getPlayWorlds\(\)/,
)

// Exercise the pruning implementation against a miniature Next build so this
// check verifies behavior, not only source-code wording.
function checkPlayerPruning() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-prune-'))
  const write = (file, value = 'fixture') => {
    const target = path.join(tempRoot, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(
      target,
      typeof value === 'string' ? value : `${JSON.stringify(value)}\n`,
    )
  }
  try {
    write('server/pages/projects.js')
    write('server/pages/map/[mapId]/recovery.js')
    write('server/pages/api/local-projects/index.js')
    write('server/app/e/[container]/page.js')
    write('server/app/p/[container]/page.js')
    write('static/chunks/pages/projects-fixture.js')
    write('static/chunks/pages/map/recovery-fixture.js')
    write('static/chunks/app/e/editor-fixture.js')
    write('static/css/app/e/editor-fixture.css')
    write('server/pages-manifest.json', {
      '/projects': 'pages/projects.js',
      '/map/[mapId]/recovery': 'pages/map/[mapId]/recovery.js',
      '/api/local-projects': 'pages/api/local-projects.js',
      '/api/local-projects/[id]': 'pages/api/local-projects/[id].js',
      '/': 'pages/index.js',
    })
    write('server/app-paths-manifest.json', {
      '/e/[container]/page': 'app/e/[container]/page.js',
      '/p/[container]/page': 'app/p/[container]/page.js',
    })
    write('routes-manifest.json', {
      dynamicRoutes: [
        { page: '/e/[container]' },
        { page: '/api/local-projects/[id]' },
        { page: '/p/[container]' },
      ],
      staticRoutes: [{ page: '/projects' }, { page: '/' }],
      dataRoutes: [{ page: '/projects' }, { page: '/' }],
    })
    write('app-build-manifest.json', {
      pages: {
        '/e/[container]/page': ['editor.js'],
        '/p/[container]/page': ['player.js'],
      },
    })

    const { prunePlayerBuild } = require(path.join(
      root,
      'apps/local-engine/src/prune-player-build.js',
    ))
    prunePlayerBuild(tempRoot)

    for (const file of [
      'server/pages/projects.js',
      'server/pages/map/[mapId]/recovery.js',
      'server/pages/api/local-projects',
      'server/app/e',
      'static/chunks/pages/projects-fixture.js',
      'static/chunks/pages/map',
      'static/chunks/app/e',
      'static/css/app/e',
    ]) {
      if (fs.existsSync(path.join(tempRoot, file))) {
        fail(`prune-player-build.js: did not remove ${file}`)
      }
    }
    if (!fs.existsSync(path.join(tempRoot, 'server/app/p/[container]/page.js'))) {
      fail('prune-player-build.js: removed the player route')
    }

    const pages = JSON.parse(
      fs.readFileSync(path.join(tempRoot, 'server/pages-manifest.json'), 'utf8'),
    )
    if (pages['/projects'] || pages['/api/local-projects/[id]']) {
      fail('prune-player-build.js: project routes remain in pages manifest')
    }
    if (!pages['/']) {
      fail('prune-player-build.js: removed the public product entry')
    }

    const appPaths = JSON.parse(
      fs.readFileSync(
        path.join(tempRoot, 'server/app-paths-manifest.json'),
        'utf8',
      ),
    )
    if (appPaths['/e/[container]/page']) {
      fail('prune-player-build.js: editor route remains in app manifest')
    }
    if (!appPaths['/p/[container]/page']) {
      fail('prune-player-build.js: player route is missing from app manifest')
    }

    const routes = JSON.parse(
      fs.readFileSync(path.join(tempRoot, 'routes-manifest.json'), 'utf8'),
    )
    const routePages = [
      ...(routes.dynamicRoutes || []),
      ...(routes.staticRoutes || []),
      ...(routes.dataRoutes || []),
    ].map(({ page }) => page)
    if (
      routePages.some(
        (page) =>
          page === '/projects' ||
          page === '/e/[container]' ||
          page.startsWith('/api/local-projects'),
      )
    ) {
      fail('prune-player-build.js: private routes remain in routes manifest')
    }
    if (!routePages.includes('/p/[container]')) {
      fail('prune-player-build.js: public play route is missing')
    }
  } catch (error) {
    fail(`prune-player-build.js behavior check failed: ${error.message}`)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

checkPlayerPruning()

// Sensitive authoring data must never enter the Docker build context. The
// final image is additionally assembled from referenced runtime blobs only.
const dockerIgnoreFile = '.dockerignore'
const dockerIgnoreSource = readRequired(dockerIgnoreFile)
const dockerIgnoreEntries = new Set(
  dockerIgnoreSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
)
for (const entry of [
  '.git',
  '**/node_modules',
  '**/.next',
  '.env',
  '.env.*',
  '!.env.docker.example',
  'apps/local-engine/projects/',
  'apps/local-engine/dist/',
  'apps/local-engine/.build-lock/',
  'apps/voxa/data/',
]) {
  if (!dockerIgnoreEntries.has(entry)) {
    fail(`${dockerIgnoreFile}: missing ${entry}`)
  }
}

const ignoredLocalBlobs = spawnSync(
  'git',
  [
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
    '--',
    'apps/local-engine/data/blobs',
  ],
  { cwd: root, encoding: 'utf8' },
)
if (ignoredLocalBlobs.status === 0) {
  for (const blob of ignoredLocalBlobs.stdout.split('\n').filter(Boolean)) {
    if (!dockerIgnoreEntries.has(blob)) {
      fail(`${dockerIgnoreFile}: local workspace blob is not excluded: ${blob}`)
    }
  }
} else {
  fail(`${dockerIgnoreFile}: unable to inspect local workspace blobs with git`)
}

const stageFile = 'apps/local-engine/src/stage-runtime-data.js'
const stageSource = readRequired(stageFile)
for (const [label, pattern] of [
  ['runtime reference roots', /const referenceRoots = \[[\s\S]*?apps\/game\/src\/resource[\s\S]*?services\/game-server/],
  ['CID-only collection', /const cidPattern = \/Qm/],
  ['referenced blob copy', /for \(const hash of \[\.\.\.hashes\]\.sort\(\)\)[\s\S]*?fs\.copyFileSync/],
  ['runtime blob manifest', /runtime-blobs\.json/],
]) {
  requirePattern(stageSource, stageFile, label, pattern)
}

const localConfig = JSON.parse(
  readRequired('apps/local-engine/config/local.config.json'),
).common
for (const key of [
  'OSS_CDN_URL',
  'CREATERA_BACKEND_SERVER_URL',
  'INTRANET_CREATERA_BACKEND_SERVER_URL',
]) {
  if (localConfig[key] !== 'http://127.0.0.1:9966') {
    fail(`${key} must use the bundled local runtime by default`)
  }
}

const fullLocalConfig = JSON.parse(
  readRequired('apps/local-engine/config/local.config.json'),
)
function checkEmptySecrets(value, prefix = '') {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    const qualified = prefix ? `${prefix}.${key}` : key
    if (
      typeof child === 'string' &&
      /(?:PASSWORD|API_KEY|CERTIFICATE|PRIVATE_KEY|TOKEN_SECRET)$/.test(key) &&
      child !== ''
    ) {
      fail(`apps/local-engine/config/local.config.json: ${qualified} must be empty`)
    }
    checkEmptySecrets(child, qualified)
  }
}
checkEmptySecrets(fullLocalConfig)

const dockerEnvSource = readRequired('.env.docker.example')
for (const line of dockerEnvSource.split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (
    match &&
    /(?:PASSWORD|API_KEY|CERTIFICATE|PRIVATE_KEY|TOKEN_SECRET)$/.test(match[1]) &&
    match[2].trim() !== ''
  ) {
    fail(`.env.docker.example: ${match[1]} must not contain a real secret`)
  }
}

const blobDir = path.join(root, 'apps/local-engine/data/blobs')
if (!fs.existsSync(blobDir)) {
  fail('local runtime blob store is missing')
}
const blobCount = fs.existsSync(blobDir)
  ? fs.readdirSync(blobDir).filter((name) => name !== '.gitkeep').length
  : 0
if (blobCount === 0) fail('local runtime blob store is empty')

const avatarManifestPath = path.join(
  root,
  'services/game-server/src/player/default-avatar.json',
)
if (fs.existsSync(avatarManifestPath)) {
  const avatarManifest = JSON.parse(fs.readFileSync(avatarManifestPath, 'utf8'))
  const avatarHashes = Object.values(avatarManifest.parts || {})
  if (avatarHashes.length !== 18) {
    fail('default avatar manifest must contain 18 body parts')
  }
  for (const hash of avatarHashes) {
    if (!fs.existsSync(path.join(blobDir, hash))) {
      fail(`missing bundled default avatar blob ${hash}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Creator/play distribution check passed: ${packages.size} local modules, ${blobCount} bundled blobs`,
  )
}
