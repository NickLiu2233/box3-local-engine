'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const {
  ensurePlayImageArchive,
  getPlayImageConfig,
} = require('./play-image')

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')
const command = process.argv[2]
const commandArgs = process.argv.slice(3)

function readDotEnvValue(name) {
  try {
    const source = fs.readFileSync(path.join(repoRoot, '.env'), 'utf8')
    const line = source
      .split(/\r?\n/)
      .find((entry) => entry.trimStart().startsWith(`${name}=`))
    if (line) {
      return line
        .slice(line.indexOf('=') + 1)
        .replace(/^['"]|['"]$/g, '')
        .trim()
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  return ''
}

function configuredCreatorPort() {
  return (
    process.env.BOX_CREATOR_PORT ||
    readDotEnvValue('BOX_CREATOR_PORT') ||
    '3002'
  )
}

function configuredPlayPort() {
  return (
    process.env.BOX_PLAY_PORT ||
    readDotEnvValue('BOX_PLAY_PORT') ||
    process.env.BOX_PORT ||
    readDotEnvValue('BOX_PORT') ||
    '3000'
  )
}

function configuredVoxaPort() {
  return process.env.BOX_VOXA_PORT || readDotEnvValue('BOX_VOXA_PORT') || '3001'
}

function dockerEnvironment(extra = {}) {
  const config = getPlayImageConfig()
  return {
    ...process.env,
    BOX_IMAGE_TAG: config.tag,
    BOX_PLAY_PLATFORM: config.platform,
    BOX_PLAY_LIBRARY_DIR:
      process.env.BOX_PLAY_LIBRARY_DIR || path.join(packageRoot, 'play-worlds'),
    ...extra,
  }
}

function runDocker(
  args,
  { allowFailure = false, capture = false, env = {} } = {},
) {
  const result = spawnSync('docker', args, {
    cwd: repoRoot,
    env: dockerEnvironment(env),
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error('未找到 Docker。请先安装并启动 Docker Desktop。')
    }
    throw result.error
  }
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Docker command failed with exit code ${result.status}`)
  }
  return result
}

function stopProduct(product) {
  runDocker(
    ['compose', '--profile', product, 'stop', product],
    { allowFailure: true },
  )
}

function migrateLegacyCreatorProjects() {
  const legacyVolume = 'box-local-engine_box-creator-projects'
  const volume = runDocker(['volume', 'inspect', legacyVolume], {
    allowFailure: true,
    capture: true,
  })
  if (volume.status !== 0) return

  const projectNamePattern = '^[a-z0-9][a-z0-9-]{0,62}$'
  const listScript = [
    "const fs=require('fs');",
    `const valid=new RegExp(${JSON.stringify(projectNamePattern)});`,
    "const names=fs.readdirSync('/legacy');",
    'console.log(JSON.stringify(names.filter((name)=>valid.test(name))));',
  ].join('')
  const config = getPlayImageConfig()
  const creatorImage = `box-local-engine-creator:${config.tag}`
  const listing = runDocker(
    [
      'run',
      '--rm',
      '--entrypoint',
      'node',
      '-v',
      `${legacyVolume}:/legacy:ro`,
      creatorImage,
      '-e',
      listScript,
    ],
    { allowFailure: true, capture: true },
  )
  if (listing.status !== 0) {
    throw new Error(
      `无法检查旧工程卷 ${legacyVolume}：${String(listing.stderr || '').trim()}`,
    )
  }
  let legacyProjects
  try {
    legacyProjects = JSON.parse(String(listing.stdout || '').trim())
  } catch {
    throw new Error(`旧工程卷 ${legacyVolume} 返回了无效数据`)
  }
  if (!Array.isArray(legacyProjects) || legacyProjects.length === 0) return

  const projectsRoot = path.join(packageRoot, 'projects')
  fs.mkdirSync(projectsRoot, { recursive: true })
  const hostProjects = fs
    .readdirSync(projectsRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && new RegExp(projectNamePattern).test(entry.name),
    )
    .map((entry) => entry.name)
  if (legacyProjects.every((name) => hostProjects.includes(name))) return
  if (hostProjects.length > 0) {
    console.warn(
      `检测到旧工程卷 ${legacyVolume}，但宿主机已有工程，已保留旧卷且未自动合并。`,
    )
    return
  }

  const copyScript = [
    "const fs=require('fs');",
    "const path=require('path');",
    `const valid=new RegExp(${JSON.stringify(projectNamePattern)});`,
    "for(const name of fs.readdirSync('/legacy')){",
    'if(!valid.test(name))continue;',
    "fs.cpSync(path.join('/legacy',name),path.join('/target',name),",
    '{recursive:true,errorOnExist:true,force:false});',
    '}',
  ].join('')
  const userArgs =
    typeof process.getuid === 'function' && typeof process.getgid === 'function'
      ? ['--user', `${process.getuid()}:${process.getgid()}`]
      : []
  runDocker([
    'run',
    '--rm',
    ...userArgs,
    '--entrypoint',
    'node',
    '-v',
    `${legacyVolume}:/legacy:ro`,
    '-v',
    `${projectsRoot}:/target`,
    creatorImage,
    '-e',
    copyScript,
  ])
  console.log(`已将旧工程卷安全迁移到：${projectsRoot}`)
}

function deployCreator() {
  if (commandArgs.length) {
    throw new Error('pnpm creator 不接受作品参数')
  }
  runDocker(['compose', '--profile', 'creator', 'build', 'creator'])
  stopProduct('creator')
  migrateLegacyCreatorProjects()
  runDocker([
    'compose',
    '--profile',
    'creator',
    'up',
    '-d',
    '--no-build',
    'creator',
  ])
  console.log('\n创作端已启动：http://127.0.0.1:' + configuredCreatorPort() + '\n')
}

function deployPlay() {
  if (commandArgs.length) throw new Error('pnpm play 不接受作品参数')
  const libraryRoot = path.resolve(
    process.env.BOX_PLAY_LIBRARY_DIR || path.join(packageRoot, 'play-worlds'),
  )
  fs.mkdirSync(libraryRoot, { recursive: true })
  const playImage = ensurePlayImageArchive()
  runDocker([
    'compose',
    '--profile',
    'play',
    'up',
    '-d',
    '--no-build',
    '--force-recreate',
    'play',
  ], {
    env: {
      BOX_PLAY_LIBRARY_DIR: libraryRoot,
    },
  })
  console.log('\n游玩端已启动：http://127.0.0.1:' + configuredPlayPort())
  console.log(`地图目录：${libraryRoot}`)
  console.log('访问首页查看全部地图；新增地图无需重启。')
  console.log(`镜像架构：${playImage.platform}`)
  console.log(`可分发镜像：${playImage.archive}\n`)
}

function startVoxa({ build }) {
  if (commandArgs.length) {
    throw new Error(`pnpm ${build ? 'voxa' : 'voxa:up'} 不接受参数`)
  }
  const dataRoot = path.join(repoRoot, 'apps/voxa/data')
  fs.mkdirSync(dataRoot, { recursive: true })
  if (build) {
    runDocker(['compose', '--profile', 'voxa', 'build', 'voxa'])
  }
  stopProduct('voxa')
  runDocker([
    'compose',
    '--profile',
    'voxa',
    'up',
    '-d',
    '--no-build',
    '--force-recreate',
    'voxa',
  ])
  console.log('\nVOXA 已启动：http://127.0.0.1:' + configuredVoxaPort())
  console.log(
    '本地模型库：http://127.0.0.1:' + configuredVoxaPort() + '/library',
  )
  console.log(`数据目录：${dataRoot}\n`)
}

function deployVoxa() {
  startVoxa({ build: true })
}

function startExistingVoxa() {
  startVoxa({ build: false })
}

function stopAll() {
  if (commandArgs.length) throw new Error('pnpm stop 不接受参数')
  runDocker([
    'compose',
    '--profile',
    'creator',
    '--profile',
    'play',
    '--profile',
    'voxa',
    'down',
  ])
}

try {
  if (command === 'creator') deployCreator()
  else if (command === 'play') deployPlay()
  else if (command === 'voxa') deployVoxa()
  else if (command === 'voxa-up') startExistingVoxa()
  else if (command === 'stop') stopAll()
  else throw new Error('Usage: deploy.js <creator|play|voxa|voxa-up|stop>')
} catch (error) {
  console.error(`部署失败：${error.message}`)
  process.exitCode = 1
}
