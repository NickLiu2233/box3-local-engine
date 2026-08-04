'use strict'

const fs = require('fs')
const path = require('path')

const removedPageRoutes = new Set([
  '/projects',
  '/map/[mapId]/recovery',
  '/api/local-projects',
  '/api/local-projects/[id]',
  '/api/local-projects/[id]/export',
  '/api/local-projects/[id]/package',
  '/api/local-projects/[id]/publish',
  '/api/local-projects/[id]/runtime',
  '/api/local-projects/import',
])
const removedAppRoutes = new Set(['/e/[container]/page'])

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function updateObjectManifest(filePath, removedRoutes) {
  if (!fs.existsSync(filePath)) return
  const manifest = readJSON(filePath)
  for (const route of removedRoutes) delete manifest[route]
  writeJSON(filePath, manifest)
}

function pruneRoutesManifest(filePath) {
  if (!fs.existsSync(filePath)) return
  const manifest = readJSON(filePath)
  const shouldKeep = ({ page }) =>
    !removedPageRoutes.has(page) &&
    page !== '/e/[container]' &&
    !page.startsWith('/api/local-projects/')
  manifest.dynamicRoutes = (manifest.dynamicRoutes || []).filter(shouldKeep)
  manifest.staticRoutes = (manifest.staticRoutes || []).filter(shouldKeep)
  manifest.dataRoutes = (manifest.dataRoutes || []).filter(shouldKeep)
  writeJSON(filePath, manifest)
}

function pruneBuildManifest(filePath, removedRoutes) {
  if (!fs.existsSync(filePath)) return
  const manifest = readJSON(filePath)
  for (const route of removedRoutes) delete manifest.pages?.[route]
  writeJSON(filePath, manifest)
}

function prunePlayerBuild(nextRoot) {
  if (!fs.existsSync(nextRoot)) return

  const removablePaths = [
    path.join(nextRoot, 'server/pages/projects.js'),
    path.join(nextRoot, 'server/pages/projects.js.nft.json'),
    path.join(nextRoot, 'server/pages/map/[mapId]/recovery.js'),
    path.join(nextRoot, 'server/pages/map/[mapId]/recovery.js.nft.json'),
    path.join(nextRoot, 'server/pages/api/local-projects'),
    path.join(nextRoot, 'server/pages/api/local-projects.js'),
    path.join(nextRoot, 'server/pages/api/local-projects.js.nft.json'),
    path.join(nextRoot, 'server/app/e'),
    path.join(nextRoot, 'static/chunks/pages/map'),
    path.join(nextRoot, 'static/chunks/app/e'),
    path.join(nextRoot, 'static/css/app/e'),
  ]

  for (const target of removablePaths) {
    fs.rmSync(target, { recursive: true, force: true })
  }

  const pageChunksRoot = path.join(nextRoot, 'static/chunks/pages')
  if (fs.existsSync(pageChunksRoot)) {
    for (const name of fs.readdirSync(pageChunksRoot)) {
      if (name.startsWith('projects-')) {
        fs.rmSync(path.join(pageChunksRoot, name), { force: true })
      }
    }
  }

  updateObjectManifest(
    path.join(nextRoot, 'server/pages-manifest.json'),
    removedPageRoutes,
  )
  updateObjectManifest(
    path.join(nextRoot, 'server/app-paths-manifest.json'),
    removedAppRoutes,
  )
  pruneRoutesManifest(path.join(nextRoot, 'routes-manifest.json'))
  pruneBuildManifest(
    path.join(nextRoot, 'app-build-manifest.json'),
    removedAppRoutes,
  )
}

module.exports = { prunePlayerBuild }

if (require.main === module) {
  const roots = process.argv.slice(2)
  if (roots.length === 0) {
    throw new Error('Usage: node prune-player-build.js <next-root> [...]')
  }
  for (const root of roots) prunePlayerBuild(path.resolve(root))
}
