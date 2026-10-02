// 核对真实生产构建、所有后端脚本语法和 HTTP 行为；不要求安装浏览器测试工具。
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { root } from './build.mjs'

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : /\.(?:js|cjs|mjs)$/.test(file) ? [file] : []
  })
}
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
run(['scripts/build.mjs'])
for (const file of [path.join(root, 'server.js'), ...files(path.join(root, 'server')), ...files(path.join(root, 'scripts')), path.join(root, 'public/theme.js')]) run(['--check', file])
run(['--test', ...readdirSync(path.join(root, 'test')).filter(file => file.endsWith('.test.js')).map(file => `test/${file}`)])
