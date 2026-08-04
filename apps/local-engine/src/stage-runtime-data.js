'use strict'

const fs = require('fs')
const path = require('path')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const sourceBlobRoot = path.join(packageRoot, 'data', 'blobs')
const outputRoot = path.resolve(process.argv[2] || '')

if (!process.argv[2]) {
  throw new Error('Usage: node stage-runtime-data.js <output-directory>')
}

const referenceRoots = [
  path.join(repoRoot, 'apps/game/src/resource'),
  path.join(repoRoot, 'services/game-server/dist/src/assets'),
  path.join(repoRoot, 'services/game-server/src/assets'),
  path.join(repoRoot, 'services/game-server/src/player/default-avatar.json'),
]

const hashes = new Set()
const cidPattern = /Qm[1-9A-HJ-NP-Za-km-z]{44}/g

function collectReferences(target) {
  if (!fs.existsSync(target)) return
  const stat = fs.statSync(target)
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      collectReferences(path.join(target, entry))
    }
    return
  }
  if (!stat.isFile() || stat.size > 32 * 1024 * 1024) return
  const content = fs.readFileSync(target, 'utf8')
  for (const hash of content.match(cidPattern) || []) hashes.add(hash)
}

for (const root of referenceRoots) collectReferences(root)

if (hashes.size === 0) {
  throw new Error('No runtime blob references were found')
}

const outputBlobRoot = path.join(outputRoot, 'blobs')
fs.rmSync(outputRoot, { recursive: true, force: true })
fs.mkdirSync(outputBlobRoot, { recursive: true })

for (const hash of [...hashes].sort()) {
  const source = path.join(sourceBlobRoot, hash)
  if (!fs.existsSync(source)) {
    throw new Error(`Runtime blob is missing: ${hash}`)
  }
  fs.copyFileSync(source, path.join(outputBlobRoot, hash))
}

fs.writeFileSync(
  path.join(outputRoot, 'runtime-blobs.json'),
  `${JSON.stringify({ formatVersion: 1, hashes: [...hashes].sort() }, null, 2)}\n`,
)

console.log(`Staged ${hashes.size} referenced runtime blobs in ${outputRoot}`)
