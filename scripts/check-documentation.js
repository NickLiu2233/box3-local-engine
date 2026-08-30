'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const docsRoot = path.join(root, 'docs')

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(target)
    return entry.isFile() && entry.name.endsWith('.md') ? [target] : []
  })
}

const files = [path.join(root, 'README.md'), ...markdownFiles(docsRoot)]
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(linkPattern)) {
    let reference = match[1].trim()
    if (reference.startsWith('<') && reference.endsWith('>')) reference = reference.slice(1, -1)
    if (/^(?:https?:|mailto:|#)/.test(reference)) continue
    reference = reference.split('#', 1)[0]
    if (!reference) continue
    const destination = path.resolve(path.dirname(file), decodeURIComponent(reference))
    assert.ok(
      fs.statSync(destination, { throwIfNoEntry: false }),
      `${path.relative(root, file)} links to missing ${reference}`,
    )
  }
}

const docsIndex = fs.readFileSync(path.join(docsRoot, 'README.md'), 'utf8')
for (const file of markdownFiles(docsRoot)) {
  if (file === path.join(docsRoot, 'README.md')) continue
  const reference = `./${path.relative(docsRoot, file).split(path.sep).join('/')}`
  assert.ok(docsIndex.includes(reference), `docs/README.md does not index ${reference}`)
}

const publishedDocs = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
for (const obsolete of [
  'ONE-CLICK-DEPLOY.cmd',
  'windows-11-arm',
  'macos-13',
  'Node.js 20 或更高版本',
]) {
  assert.ok(!publishedDocs.includes(obsolete), `documentation still contains obsolete: ${obsolete}`)
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
for (const supportedTarget of ['Windows x64', 'Apple Silicon macOS', 'Linux x64']) {
  assert.ok(readme.includes(supportedTarget), `README is missing release target ${supportedTarget}`)
}

for (const [label, snippet] of [
  ['current Play port', '`http://127.0.0.1:3000/`'],
  ['current Creator port', '`http://127.0.0.1:3002/`'],
  ['client script trust boundary', '客户端地图脚本运行在玩家浏览器页面中'],
  ['server script trust boundary', '服务端地图脚本在 game-server 的隔离运行时中执行'],
  ['headless package boundary', '不包含 Creator、VOXA'],
]) {
  assert.ok(readme.includes(snippet), `README is missing ${label}`)
}

const parity = fs.readFileSync(path.join(docsRoot, 'boxes-parity.md'), 'utf8')
for (const removedApi of [
  'world.onPlayerPurchaseSuccess',
  'world.nextPlayerPurchaseSuccess',
  'GamePurchaseSuccessEvent',
  'SocialType',
  'SocialStatisticType',
]) {
  assert.ok(parity.includes(removedApi), `boxes parity does not record removed API ${removedApi}`)
}

const securityAudit = fs.readFileSync(path.join(docsRoot, 'security-audit.md'), 'utf8')
for (const boundary of ['DTS 不构成沙箱', '不使用平台域名白名单', '前端隐藏按钮不作为授权依据']) {
  assert.ok(securityAudit.includes(boundary), `security audit is missing boundary: ${boundary}`)
}

console.log(`documentation checks passed: ${files.length} Markdown files`)
