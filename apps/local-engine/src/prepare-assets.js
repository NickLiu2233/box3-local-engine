'use strict'

const path = require('path')
const fs = require('fs')

const { MockBuildCache } = require('@box/build-system/build-cache-mock')
const { BuildSystem } = require('@box/build-system/build-system')
const { buildResources } = require('@box/build-system/utils/resource')
const { FileSystemContentServer } = require('@box/content-server/file-system-store-node')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const dataRoot = path.join(packageRoot, 'data')
const blobRoot = path.join(dataRoot, 'blobs')

function writeFileIfChanged(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath).equals(content)) {
    return
  }
  fs.writeFileSync(filePath, content)
}

function bundleEditorApiDeclarations() {
  const resourceRoot = path.join(repoRoot, 'apps/game/src/resource')
  const apiResourceSource = fs.readFileSync(path.join(resourceRoot, 'api.ts'), 'utf8')
  const apiHash = apiResourceSource.match(/`([^`]+)`/)?.[1]
  if (!apiHash) {
    throw new Error('Unable to resolve the generated API declaration hash')
  }
  const declarationBlob = fs.readFileSync(path.join(blobRoot, apiHash))
  writeFileIfChanged(path.join(resourceRoot, 'api-declarations.dts'), declarationBlob)
}

function createLogger(bindings = {}) {
  return {
    bindings: () => bindings,
    child: (extra) => createLogger({ ...bindings, ...extra }),
    debug: (...args) => console.debug(...args),
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  }
}

async function main() {
  await require('./sync-built-in-skins')()
  const logger = createLogger()
  const contentServer = new FileSystemContentServer(blobRoot)
  await contentServer.init()
  fs.mkdirSync(path.join(repoRoot, 'services/game-server/src/assets'), {
    recursive: true,
  })

  let nextUid = 1
  const buildSystem = new BuildSystem(
    new MockBuildCache(),
    contentServer,
    contentServer,
    async ({ num }) => Array.from({ length: num }, () => `local-${nextUid++}`),
    logger.child({ caller: 'local-assets' }),
    false,
  )

  await buildResources(buildSystem, contentServer, logger, {
    assetsDir: path.join(repoRoot, 'services/game-server/scripts/assets'),
    tasksDir: path.join(repoRoot, 'services/game-server/scripts/resources'),
    targetDir: path.join(repoRoot, 'services/game-server/src/assets'),
  })

  await buildResources(buildSystem, contentServer, logger, {
    assetsDir: path.join(repoRoot, 'apps/game/scripts/assets'),
    tasksDir: path.join(repoRoot, 'apps/game/scripts/resources'),
    targetDir: path.join(repoRoot, 'apps/game/src/resource'),
  })

  // The cloud editor retrieves this content-addressed blob lazily. A local
  // editor must also have a bundled copy so IntelliSense is available before
  // the request completes and remains available while offline.
  bundleEditorApiDeclarations()

  logger.info({ blobRoot }, 'Local engine assets are ready')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
