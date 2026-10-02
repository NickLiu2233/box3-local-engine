// 发布独立源码模板只使用明确白名单，排除 .env、node_modules、私有目录和引擎源码。
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { root } from './build.mjs'

const version = JSON.parse(readFileSync(path.join(root, 'package.json'))).version
const name = `box3-login-template-${version}`
const output = path.join(root, 'dist', `${name}.tar.gz`)
if (existsSync(output) && !process.argv.includes('--force')) throw new Error('模板包已存在，明确使用 --force 或先改版本号')
const temporary = mkdtempSync(path.join(os.tmpdir(), 'box-login-template-'))
const folder = path.join(temporary, name)
try {
  mkdirSync(folder)
  for (const file of ['src', 'server.js', 'server', 'public', 'scripts', 'test', 'docs', 'examples', 'package.json', 'package-lock.json', 'README.md', '.env.example', '.gitignore', '.dockerignore', 'Dockerfile.standalone']) {
    const source = path.join(root, file)
    if (!existsSync(source)) throw new Error(`缺少模板文件 ${file}`)
    cpSync(source, path.join(folder, file), {
      recursive: true,
      filter: entry => {
        if (lstatSync(entry).isSymbolicLink()) return false
        const name = path.basename(entry)
        if (entry === path.join(root, '.env.example')) return true
        return !/^\.env(?:\.|$)/.test(name) && !/\.(pem|key|p12|pfx)$/.test(name) && !['node_modules', 'dist', '.DS_Store'].includes(name)
      },
    })
  }
  mkdirSync(path.dirname(output), { recursive: true })
  const archive = spawnSync('tar', ['-czf', output, '-C', temporary, name], { stdio: 'inherit' })
  if (archive.error || archive.status !== 0) throw new Error(`打包失败：${archive.error?.message || archive.status}`)
  console.log(`独立仓库源码模板：${output}\n解压后可直接 npm ci && npm run dev；无需引擎仓库。`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
