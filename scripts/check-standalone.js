'use strict'

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const workspaceFile = path.join(root, 'pnpm-workspace.yaml')
const workspaceText = fs.readFileSync(workspaceFile, 'utf8')
const workspaceDirs = workspaceText
  .split('\n')
  .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1])
  .filter(Boolean)

const packages = new Map()
for (const directory of workspaceDirs) {
  const packagePath = path.join(root, directory, 'package.json')
  const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  packages.set(manifest.name, { directory, manifest })
}

const failures = []

function requireSourcePattern(file, label, pattern) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    failures.push(`missing source file for ${label}: ${file}`)
    return
  }

  const source = fs.readFileSync(filePath, 'utf8')
  if (!pattern.test(source)) {
    failures.push(`${file}: missing ${label}`)
  }
}

const offlineBoundaryChecks = [
  {
    file: 'apps/game/Dockerfile',
    label: 'standalone player-client Docker image',
    pattern:
      /pnpm install --frozen-lockfile[\s\S]*?pnpm build:client[\s\S]*?\.next\/standalone[\s\S]*?apps\/game\/server\.js/,
  },
  {
    file: 'services/game-server/Dockerfile',
    label: 'standalone dedicated-server Docker image',
    pattern:
      /pnpm install --frozen-lockfile[\s\S]*?pnpm build:server[\s\S]*?--server-only/,
  },
  {
    file: 'docker-compose.yml',
    label: 'separate Docker client and server services',
    pattern:
      /services:[\s\S]*?server:[\s\S]*?services\/game-server\/Dockerfile[\s\S]*?client:[\s\S]*?apps\/game\/Dockerfile/,
  },
  {
    file: 'apps/game/app/e/[container]/page.tsx',
    label: 'player-only client redirect away from the editor route',
    pattern:
      /process\.env\.BOX_PLAYER_CLIENT_ONLY === 'true'[\s\S]*?redirect\('\/connect'\)/,
  },
  {
    file: 'apps/game/webpack/index.js',
    label: 'player build adapters replacing editor and administrator modules',
    pattern:
      /BOX_PLAYER_BUILD[\s\S]*?player-only[\s\S]*?src\\\/entry\\\/editor-page[\s\S]*?src\\\/entry\\\/admin-client[\s\S]*?src\\\/entry\\\/admin-ui/,
  },
  {
    file: 'apps/game/webpack/index.js',
    label: 'Monaco assets excluded from player builds',
    pattern:
      /if \(!isPlayerBuild\) \{[\s\S]*?new CopyWebpackPlugin[\s\S]*?monaco-editor\/package\.json/,
  },
  {
    file: 'apps/local-engine/src/build.js',
    label: 'player-only build marker',
    pattern:
      /BOX_PLAYER_BUILD: clientOnly \? 'true' : 'false'[\s\S]*?fs\.writeFileSync\(playerBuildMarker, 'player-only\\n'\)/,
  },
  {
    file: 'apps/local-engine/src/build.js',
    label: 'portable standalone static and public assets',
    pattern:
      /standaloneGameRoot[\s\S]*?\.next\/static[\s\S]*?fs\.cpSync[\s\S]*?standaloneGameRoot, 'public'/,
  },
  {
    file: 'apps/local-engine/src/launcher.js',
    label: 'player-only build marker validation and standalone launch',
    pattern:
      /Player-only build is missing[\s\S]*?current client build is player-only[\s\S]*?standaloneServer[\s\S]*?\['server\.js'\]/,
  },
  {
    file: 'services/game-server/src/backend-rpc-client-node.ts',
    label: 'no-op analytics for the mock/local backend client',
    pattern:
      /this\.analytics\s*=\s*mock\s*\?\s*new NoopAnalyticsClient\([\s\S]*?\)\s*:\s*new AnalyticsClient/,
  },
  {
    file: 'services/game-server/src/backend-rpc-client-node.ts',
    label: 'empty local analytics methods',
    pattern:
      /class NoopAnalyticsClient extends AnalyticsClient \{\s*public addEvent\(\) \{\}\s*public addTop\(\) \{\}\s*public addEngine\(\) \{\}\s*public addHttp\(\) \{\}\s*\}/,
  },
  {
    file: 'services/game-server/src/project/project-extra.ts',
    label: 'local extra-project fetch guard before backend API calls',
    pattern:
      /const extra = ExtraProjectInfoSchema\.clone\([\s\S]*?if \(getConfigSync\(\)\?\.method === 'local'\) \{[\s\S]*?return extra;[\s\S]*?apis\.model\./,
  },
  {
    file: 'services/game-server/src/edit/replica/replica-server.ts',
    label: 'local permission-save guard that clears the backend dirty flag',
    pattern:
      /private async _savePermissions\(\) \{[\s\S]*?if \(getConfigSync\(\)\?\.method === 'local'\) \{[\s\S]*?permissionsHashDirty = false;[\s\S]*?return;[\s\S]*?content\.api\.updateGame/,
  },
  {
    file: 'services/game-server/src/edit/replica/replica-server.ts',
    label: 'local replica extra-project refresh guard',
    pattern:
      /public _checkAndSetExtraProject = async \(\) => \{\s*if \(getConfigSync\(\)\?\.method === 'local'\) \{[\s\S]*?return;\s*\}\s*const extra = await getExtraProject/,
  },
  {
    file: 'services/game-server/src/edit/replica/replica-server.ts',
    label: 'local group-project metadata storage guard',
    pattern:
      /private async _updateProjectAndGroupProject\(storeRes: StoreProjectRes\) \{[\s\S]*?await this\._updateProjectHash\(projectHash\);[\s\S]*?if \(getConfigSync\(\)\?\.method === 'local'\) \{\s*return;\s*\}[\s\S]*?storeGroupProjectMetaData/,
  },
  {
    file: 'apps/game/src/views/edit/components/landing/index.tsx',
    label: 'local edit landing bypass for statistics and collaboration',
    pattern:
      /ready: \(\) => \{\s*if \(isLocalEngine\) \{\s*return;\s*\}[\s\S]*?apis\.createra\.online/,
  },
  {
    file: 'apps/game/src/views/edit/components/landing/index.tsx',
    label: 'local invitation flow bypass',
    pattern:
      /useEffect\(\(\) => \{\s*if \(isLocalEngine\) \{\s*clickStartBtn\(\);[\s\S]*?return \(\) => \{[\s\S]*?\};\s*\}[\s\S]*?apis\.collaboration/,
  },
  {
    file: 'apps/game/src/views/edit/components/main-page/index.tsx',
    label: 'local edit admin and statistics panels disabled',
    pattern:
      /if \(isLocalEngine\) \{\s*hideAdmin\(\);\s*return;\s*\}[\s\S]*?useAdmin\(isLocalEngine \? undefined : editor\.admin\)/,
  },
  {
    file: 'apps/game/src/admin/ui/index.tsx',
    label: 'idempotent admin panel cleanup for local mode and HMR',
    pattern:
      /let containerElement: HTMLDivElement \| null = null;[\s\S]*?export function hideAdmin\(\) \{[\s\S]*?adminRoot\.unmount\(\);[\s\S]*?containerElement\.remove\(\);/,
  },
  {
    file: 'apps/game/src/views/edit/container.tsx',
    label: 'local WeChat registration guard',
    pattern:
      /if \(!clientConfig\.isLocalGameServer\) \{\s*registerWeChat\(\);\s*\}/,
  },
  {
    file: 'apps/game/src/views/edit/container.tsx',
    label: 'local creator-store request guard',
    pattern:
      /const fetchMapPaidAccess = async \(\) => \{\s*if \(clientConfig\.isLocalGameServer(?:\s*\|\|[^)]*)?\) \{\s*return;\s*\}[\s\S]*?apis\.creatorStore/,
  },
  {
    file: 'apps/game/src/views/edit/container.tsx',
    label: 'local collaboration permission request guard',
    pattern:
      /const applySubMapCommonPermission = async \(\) => \{\s*if \(clientConfig\.isLocalGameServer\) \{\s*return;\s*\}[\s\S]*?apis\.collaboration/,
  },
  {
    file: 'apps/game/src/views/edit/components/nav-bar/right-control/nav-control.tsx',
    label: 'local collaboration and chat visibility guard',
    pattern:
      /\{!isLocalEngine && !isGuest && \([\s\S]*?<CollaborationPanel[\s\S]*?\{!isLocalEngine && \([\s\S]*?setChat/,
  },
  {
    file: 'apps/game/src/views/edit/components/nav-bar/right-control/index.tsx',
    label: 'local AI credits and guest controls visibility guard',
    pattern:
      /\{!isLocalEngine && localOwner && \([\s\S]*?<AiCredits \/>[\s\S]*?\{!isLocalEngine && isGuest && <GuestControl \/>\}/,
  },
  {
    file: 'apps/game/src/views/play/components/starter/index.tsx',
    label: 'local play startup bypass for platform statistics and view count',
    pattern:
      /useEffect\(\(\) => \{\s*if \(\s*clientConfig\.isLocalGameServer \|\|[\s\S]*?return;\s*\}\s*const playClick[\s\S]*?apis\.user\.viewCount/,
  },
  {
    file: 'apps/game/src/views/play/components/ui/index.tsx',
    label: 'local play admin and statistics panels disabled',
    pattern:
      /if \(isLocalEngine\) \{\s*hideAdmin\(\);\s*return;\s*\}[\s\S]*?useAdmin\(isLocalEngine \? undefined : player\.admin\)/,
  },
  {
    file: 'apps/game/src/apis/sensor/index.ts',
    label: 'local browser analytics disable flag',
    pattern:
      /private readonly enabled\s*=\s*!clientConfig\.isLocalGameServer && !!clientConfig\.SENSORS_TRACKER_URL/,
  },
  {
    file: 'apps/game/src/apis/sensor/index.ts',
    label: 'disabled browser analytics initialization guard',
    pattern:
      /constructor\(\) \{[\s\S]*?if \(!this\.enabled\) \{\s*return;\s*\}[\s\S]*?this\.init\(\)/,
  },
  {
    file: 'apps/game/src/apis/sensor/rusty.ts',
    label: 'local rusty analytics disable flag',
    pattern:
      /private readonly enabled\s*=\s*!clientConfig\.isLocalGameServer && !!clientConfig\.SENSORS_TRACKER_URL/,
  },
  {
    file: 'apps/game/src/apis/sensor/rusty.ts',
    label: 'disabled rusty analytics initialization guard',
    pattern:
      /constructor\(\) \{[\s\S]*?if \(!this\.enabled\) \{\s*return;\s*\}[\s\S]*?stampHelper\.saveStamp\(\)/,
  },
  {
    file: 'apps/game/src/engine/defer-imports.ts',
    label: 'local Agora import guard',
    pattern:
      /if \(!process\.env\.RUSTY && !clientConfig\.isLocalGameServer\) \{\s*ImportAgoraRTC = import\('agora-rtc-sdk-ng'\)[\s\S]*?\} else \{\s*ImportAgoraRTC = Promise\.resolve\(undefined\);\s*\}/,
  },
  {
    file: 'apps/game/src/engine/game-client.ts',
    label: 'local device and WebGL statistics collection guard',
    pattern:
      /if \(!clientConfig\.isLocalGameServer\) \{[\s\S]*?const perfStats:[\s\S]*?user connect stats/,
  },
  {
    file: 'apps/game/src/views/play/container.tsx',
    label: 'local website redirect guard',
    pattern:
      /if \(\s*!clientConfig\.isLocalGameServer &&[\s\S]*?window\.location\.assign\(clientConfig\.WEBSITE_URL\)/,
  },
  {
    file: 'apps/game/src/views/play/container.tsx',
    label: 'local play WeChat registration guard',
    pattern:
      /if \(!clientConfig\.isLocalGameServer\) \{\s*registerWeChat\(\);\s*\}/,
  },
  {
    file: 'apps/game/src/client/rusty/async-init.ts',
    label: 'local user-profile request guard',
    pattern:
      /if \(!clientConfig\.isLocalGameServer\) \{[\s\S]*?apis\.createra\.getUserByTokenUsingGet/,
  },
  {
    file: 'apps/game/src/client/index.ts',
    label: 'local fingerprint request guard with remote-server override',
    pattern:
      /if \(\s*!process\.env\.RUSTY &&\s*\(gameServerTarget\.isRemote \|\| !clientConfig\.isLocalGameServer\)\s*\) \{[\s\S]*?getFingerprint\(\)/,
  },
  {
    file: 'apps/game/src/client/play/play-client.ts',
    label:
      'local reconnect fingerprint request guard with remote-server override',
    pattern:
      /if \(\s*!process\.env\.RUSTY &&\s*\(gameServerTarget\.isRemote \|\| !clientConfig\.isLocalGameServer\)\s*\) \{[\s\S]*?getFingerprint\(\)/,
  },
  {
    file: 'apps/game/src/views/edit/components/nav-bar/left-menu/dropdown-menu/index.tsx',
    label: 'local privacy, AI, and website menu guards',
    pattern:
      /if \(item\.id === menuItemsId\.mapPrivacy\) \{\s*if \(isLocalEngine \|\| !localOwner\)[\s\S]*?if \(item\.id === menuItemsId\.aiAssistant\) \{\s*return \(\s*!isLocalEngine[\s\S]*?if \(item\.id === menuItemsId\.backToWebsite\) \{\s*return !isLocalEngine;/,
  },
  {
    file: 'apps/game/src/views/edit/components/nav-bar/left-menu/index.tsx',
    label: 'local store, model, and player controls guards',
    pattern:
      /case CenterPanelEnum\.StoreSettings:\s*if \(isLocalEngine\) \{\s*return false;[\s\S]*?case LeftNavModeEnum\.Model:[\s\S]*?return !isLocalEngine && permissions\.editModel[\s\S]*?case CenterPanelEnum\.PlayerModule:\s*return !isLocalEngine && permissions\.editPlayer/,
  },
]

for (const { file, label, pattern } of offlineBoundaryChecks) {
  requireSourcePattern(file, label, pattern)
}

for (const { directory, manifest } of packages.values()) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  }

  for (const [name, version] of Object.entries(dependencies)) {
    if (name.startsWith('@box-local/') && !packages.has(name)) {
      failures.push(`${directory}: missing local package ${name}@${version}`)
    }
  }

  if (manifest.publishConfig?.registry?.includes('box3')) {
    failures.push(`${directory}: private registry is still configured`)
  }
}

const requiredFiles = [
  '.dockerignore',
  '.env.docker.example',
  'docs/deployment.md',
  'docker-compose.yml',
  'apps/game/Dockerfile',
  'apps/game/README.md',
  'apps/local-engine/README.md',
  'services/game-server/Dockerfile',
  'services/game-server/README.md',
  'apps/local-engine/config/local.config.json',
  'apps/local-engine/src/launcher.js',
  'services/game-server/src/assets/block_info.ts',
  'services/game-server/src/player/default-avatar.json',
  'services/game-server/src/player/default-avatar-skin.ts',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`missing runtime file ${file}`)
  }
}

const blobDir = path.join(root, 'apps/local-engine/data/blobs')
const blobCount = fs
  .readdirSync(blobDir)
  .filter((name) => name !== '.gitkeep').length
if (blobCount === 0) {
  failures.push('local blob store is empty')
}

const localConfig = JSON.parse(
  fs.readFileSync(
    path.join(root, 'apps/local-engine/config/local.config.json'),
    'utf8',
  ),
).common
for (const key of [
  'OSS_CDN_URL',
  'CREATERA_BACKEND_SERVER_URL',
  'INTRANET_CREATERA_BACKEND_SERVER_URL',
]) {
  if (localConfig[key] !== 'http://127.0.0.1:9966') {
    failures.push(`${key} must use the bundled local server by default`)
  }
}

const avatarManifestPath = path.join(
  root,
  'services/game-server/src/player/default-avatar.json',
)
if (fs.existsSync(avatarManifestPath)) {
  const avatarManifest = JSON.parse(fs.readFileSync(avatarManifestPath, 'utf8'))
  const avatarHashes = Object.values(avatarManifest.parts || {})
  if (avatarHashes.length !== 18) {
    failures.push('default avatar manifest must contain 18 body parts')
  }
  for (const hash of avatarHashes) {
    if (!fs.existsSync(path.join(blobDir, hash))) {
      failures.push(`missing bundled default avatar blob ${hash}`)
    }
  }
}

const forbiddenRuntimePatterns = [
  ['Rush node_modules path', /common\/temp\/node_modules/],
  ['original boxes workspace path', /\/Users\/viyrs\/Desktop\/boxCode\/boxes/],
]

function scanRuntimeFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      scanRuntimeFiles(filePath)
      continue
    }
    if (!/\.(?:js|mjs|cjs|ts|tsx|json|ya?ml)$/.test(entry.name)) continue
    if (entry.name.endsWith('.map')) continue

    const source = fs.readFileSync(filePath, 'utf8')
    for (const [label, pattern] of forbiddenRuntimePatterns) {
      if (pattern.test(source)) {
        failures.push(`${path.relative(root, filePath)}: contains ${label}`)
      }
    }
  }
}

scanRuntimeFiles(root)

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(
    `Standalone dependency check passed: ${packages.size} local modules, ${blobCount} bundled blobs`,
  )
}
