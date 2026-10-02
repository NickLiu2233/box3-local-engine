// 本机构建并导出 Docker 镜像；不推送仓库，不写入凭据，不包含开发模拟器。
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { root } from './build.mjs'

export function packageOptions(args, architecture = process.arch) {
  const { version } = JSON.parse(readFileSync(path.join(root, 'package.json')))
  const options = { image: `box3-login-example:${version}`, platform: architecture === 'arm64' ? 'linux/arm64' : architecture === 'x64' ? 'linux/amd64' : '', force: false }
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]
    if (flag === '--force') options.force = true
    else if (['--image', '--platform', '--output'].includes(flag) && args[index + 1] && !args[index + 1].startsWith('--')) options[flag.slice(2)] = args[++index]
    else throw new Error(`未知或缺少参数：${flag}`)
  }
  if (!['linux/amd64', 'linux/arm64'].includes(options.platform)) throw new Error('请指定 --platform linux/amd64 或 linux/arm64')
  if (!/^[a-z0-9][a-z0-9._:/-]*:[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(options.image) || options.image.includes('://')) throw new Error('镜像名需带版本，例如 my-login:1.0')
  const filename = `${options.image.replaceAll(/[^A-Za-z0-9_.-]/g, '-')}-${options.platform.replace('/', '-')}.tar.gz`
  options.output = path.resolve(root, options.output || path.join('dist', filename))
  if (!options.output.endsWith('.tar.gz')) throw new Error('导出文件需以 .tar.gz 结尾')
  return options
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`${command} 执行失败：${result.error?.message || result.status}`)
}

export async function packageImage(args) {
  const options = packageOptions(args)
  if (existsSync(options.output) && !options.force) throw new Error('目标归档已存在；改用新版本/新文件名，或明确添加 --force')
  run(process.execPath, ['scripts/check.mjs'])
  run('docker', ['info', '--format', '{{.Architecture}}'])
  run('docker', ['buildx', 'build', '--load', '--platform', options.platform, '-f', 'Dockerfile.standalone', '-t', options.image, '.'])
  const inspected = spawnSync('docker', ['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', options.image], { encoding: 'utf8' })
  if (inspected.status !== 0 || inspected.stdout.trim() !== options.platform) throw new Error('镜像平台与导出目标不一致')
  mkdirSync(path.dirname(options.output), { recursive: true })
  const temporary = `${options.output}.${process.pid}.part`
  const save = spawn('docker', ['image', 'save', options.image], { stdio: ['ignore', 'pipe', 'inherit'] })
  const completed = new Promise((resolve, reject) => {
    save.once('error', reject)
    save.once('exit', code => code === 0 ? resolve() : reject(new Error(`镜像导出失败：${code}`)))
  })
  try {
    await Promise.all([completed, pipeline(save.stdout, createGzip({ level: 1 }), createWriteStream(temporary, { flags: 'wx' }))])
    renameSync(temporary, options.output)
  } catch (error) {
    save.kill()
    rmSync(temporary, { force: true })
    throw error
  }
  console.log(`\n镜像归档：${options.output}\n导入：docker load -i "${options.output}"\n启动器“登录页面镜像”填写：${options.image}\n`)
}

if (process.argv[1] === path.join(root, 'scripts/package.mjs')) {
  packageImage(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1 })
}
