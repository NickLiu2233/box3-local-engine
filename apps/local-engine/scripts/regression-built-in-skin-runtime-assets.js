'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const stageScript = path.join(packageRoot, 'src/stage-runtime-data.js')
const syncSkinsScript = path.join(packageRoot, 'src/sync-built-in-skins.js')
const skinSource = path.join(repoRoot, 'services/game-server/src/player/built-in-skins.ts')
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'box-built-in-skins-'))

try {
  // Skin blobs are committed release inputs. This check deliberately runs
  // without network access so CI catches any accidental cloud dependency.
  execFileSync(process.execPath, [syncSkinsScript], { stdio: 'pipe' })
  execFileSync(process.execPath, [stageScript, runtimeRoot], { stdio: 'pipe' })
  const source = fs.readFileSync(skinSource, 'utf8')
  const partHashes = [...source.matchAll(/parts: parts\(\[([\s\S]*?)\]\)/g)].flatMap(
    ([, entries]) => [...entries.matchAll(/'([^']+)'/g)].map(([, hash]) => hash),
  )
  assert.ok(partHashes.length > 0, 'expected built-in skin parts')

  const externalPreview = [...source.matchAll(/sourcePreview:\s*'([^']+)'/g)].find(([, url]) =>
    /^https?:/i.test(url),
  )
  assert.strictEqual(externalPreview, undefined, 'built-in skin previews must be local paths')

  const missing = [...new Set(partHashes)].filter(
    (hash) => !fs.existsSync(path.join(runtimeRoot, 'blobs', hash)),
  )
  assert.deepStrictEqual(
    missing,
    [],
    `built-in skin resources missing from Play runtime: ${missing.join(', ')}`,
  )
  console.log(`PASS: staged ${new Set(partHashes).size} built-in skin resources`)
} finally {
  fs.rmSync(runtimeRoot, { recursive: true, force: true })
}
