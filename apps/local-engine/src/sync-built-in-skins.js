'use strict'

const fs = require('fs')
const path = require('path')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const sourcePath = path.join(repoRoot, 'services/game-server/src/player/built-in-skins.ts')
const blobRoot = path.join(packageRoot, 'data/blobs')
const previewRoot = path.join(repoRoot, 'apps/game/public/built-in-skins')

function readSkins() {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const entries = []
  const pattern =
    /id: '([^']+)', name: '([^']+)',\s+preview: '([^']+)',\s+sourcePreview: '([^']+)',\s+parts: parts\(\[([\s\S]*?)\]\),/g
  for (const match of source.matchAll(pattern)) {
    const hashes = Array.from(match[5].matchAll(/'([^']+)'/g), ([, hash]) => hash)
    if (hashes.length !== 18) {
      throw new Error(`内置皮肤 ${match[1]} 的部件数量应为 18，实际为 ${hashes.length}`)
    }
    entries.push({ id: match[1], preview: match[3], sourcePreview: match[4], hashes })
  }
  if (entries.length < 1) throw new Error('未能读取内置皮肤清单')
  return entries
}

async function download(url, target) {
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return false
  const response = await fetch(url)
  if (!response.ok) throw new Error(`无法下载 ${url}: HTTP ${response.status}`)
  const data = new Uint8Array(await response.arrayBuffer())
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, data)
  return true
}

async function main() {
  const skins = readSkins()
  let downloaded = 0
  for (const skin of skins) {
    for (const hash of skin.hashes) {
      if (await download(`https://assets.box3.fun/avatar/m/${hash}`, path.join(blobRoot, hash)))
        downloaded += 1
    }
    const name = path.basename(skin.preview)
    if (await download(skin.sourcePreview, path.join(previewRoot, name))) downloaded += 1
  }
  console.log(
    `Built-in player skins are ready (${skins.length} sets, ${downloaded} files downloaded)`,
  )
}

module.exports = main

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
