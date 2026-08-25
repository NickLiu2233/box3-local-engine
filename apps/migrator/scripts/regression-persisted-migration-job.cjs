const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../lib/migration-jobs.ts')

function loadMigrationJobs(generateProjectArchive) {
  delete globalThis.__boxMigratorJobs
  const source = fs.readFileSync(sourcePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText
  const loaded = { exports: {} }
  const localRequire = (request) => {
    if (request === './export-project') return { generateProjectArchive }
    return require(request)
  }
  const compile = new Function('exports', 'require', 'module', '__filename', '__dirname', output)
  compile(loaded.exports, localRequire, loaded, sourcePath, path.dirname(sourcePath))
  return loaded.exports
}

async function main() {
  const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-migrator-job-regression-'))
  const originalCacheDir = process.env.BOX_MIGRATOR_CACHE_DIR
  process.env.BOX_MIGRATOR_CACHE_DIR = cacheRoot
  try {
    const sourceArchive = path.join(cacheRoot, 'generated.boxproject')
    fs.writeFileSync(sourceArchive, 'archive')
    const firstRoute = loadMigrationJobs(async () => ({
      archivePath: sourceArchive,
      filename: 'test.boxproject',
      blobCount: 1,
      totalBytes: 7,
      skippedBlobs: [],
    }))
    const created = firstRoute.startMigration({ hash: 'QmTest' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simulate Next.js loading /api/download in another standalone bundle.
    const secondRoute = loadMigrationJobs(() => new Promise(() => undefined))
    assert.equal(secondRoute.getMigration(created.id)?.status, 'completed')
    const archive = secondRoute.takeMigrationArchive(created.id)
    assert.ok(archive, 'completed work must be visible to the download route')
    assert.equal(fs.readFileSync(archive.archivePath, 'utf8'), 'archive')
    secondRoute.finishMigrationDownload(created.id)
    assert.equal(secondRoute.getMigration(created.id), undefined)
    assert.equal(fs.existsSync(archive.archivePath), false)
  } finally {
    delete globalThis.__boxMigratorJobs
    if (originalCacheDir === undefined) delete process.env.BOX_MIGRATOR_CACHE_DIR
    else process.env.BOX_MIGRATOR_CACHE_DIR = originalCacheDir
    fs.rmSync(cacheRoot, { recursive: true, force: true })
  }
}

main()
  .then(() => console.log('persisted migration job regression passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
