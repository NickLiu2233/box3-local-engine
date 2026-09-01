'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { execFile } = require('node:child_process')

const services = ['creator', 'voxa', 'play', 'player-service', 'player-auth-portal']
const serviceProfiles = {
  'creator': 'creator',
  'voxa': 'voxa',
  'play': 'play',
  'player-service': 'player-service',
  'player-auth-portal': 'auth-portal',
}
const secretKeys = new Set(['BOX_DATABASE_URL', 'REDIS_PASSWORD'])
const configuration = [
  {
    key: 'BOX_BIND_IP',
    label: '游玩服务监听范围',
    group: 'network',
    type: 'select',
    options: ['127.0.0.1', '0.0.0.0'],
    defaultValue: '127.0.0.1',
  },
  {
    key: 'BOX_PLAY_PORT',
    label: 'Play 端口',
    group: 'network',
    type: 'number',
    min: 1,
    max: 65535,
    defaultValue: '3000',
  },
  {
    key: 'BOX_CREATOR_BIND_IP',
    label: '创作端监听范围',
    group: 'network',
    type: 'select',
    options: ['127.0.0.1', '0.0.0.0'],
    defaultValue: '127.0.0.1',
  },
  {
    key: 'BOX_CREATOR_PORT',
    label: 'ARENA 端口',
    group: 'network',
    type: 'number',
    min: 1,
    max: 65535,
    defaultValue: '3002',
  },
  {
    key: 'BOX_VOXA_BIND_IP',
    label: 'VOXA 监听范围',
    group: 'network',
    type: 'select',
    options: ['127.0.0.1', '0.0.0.0'],
    defaultValue: '127.0.0.1',
  },
  {
    key: 'BOX_VOXA_PORT',
    label: 'VOXA 端口',
    group: 'network',
    type: 'number',
    min: 1,
    max: 65535,
    defaultValue: '3001',
  },
  {
    key: 'BOX_PLAYER_SERVICE_PORT',
    label: 'Player Service 端口',
    group: 'network',
    type: 'number',
    min: 1,
    max: 65535,
    defaultValue: '3213',
  },
  {
    key: 'BOX_AUTH_PORTAL_PORT',
    label: '登录门户端口',
    group: 'network',
    type: 'number',
    min: 1,
    max: 65535,
    defaultValue: '3214',
  },
  {
    key: 'BOX_PLAY_PUBLIC_URL',
    label: 'Play 公开地址',
    group: 'network',
    type: 'url',
    defaultValue: 'http://127.0.0.1:3000',
  },
  {
    key: 'BOX_CREATOR_PUBLIC_URL',
    label: '创作端公开地址',
    group: 'network',
    type: 'url',
    defaultValue: 'http://127.0.0.1:3002',
  },
  {
    key: 'BOX_VOXA_PUBLIC_URL',
    label: 'VOXA 公开地址',
    group: 'network',
    type: 'url',
    defaultValue: 'http://127.0.0.1:3001',
  },
  {
    key: 'BOX_PLAYER_SERVICE_PUBLIC_URL',
    label: 'Player Service 公开地址',
    group: 'network',
    type: 'url',
    defaultValue: 'http://127.0.0.1:3213',
  },
  {
    key: 'BOX_AUTH_PORTAL_PUBLIC_URL',
    label: '登录门户公开地址',
    group: 'network',
    type: 'url',
    defaultValue: 'http://127.0.0.1:3214',
  },
  {
    key: 'BOX_PLAYER_REGISTRATION_ENABLED',
    label: '允许玩家注册',
    group: 'access',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'BOX_PLAY_LIBRARY_READ_ONLY',
    label: '禁止网页导入地图包',
    group: 'access',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    key: 'BOX_DATABASE_URL',
    label: 'PostgreSQL 连接地址',
    group: 'storage',
    type: 'secret',
    defaultValue: '',
  },
  {
    key: 'REDIS_HOST',
    label: 'Redis 主机（可选）',
    group: 'storage',
    type: 'text',
    defaultValue: '',
  },
  {
    key: 'REDIS_PORT',
    label: 'Redis 端口',
    group: 'storage',
    type: 'number',
    min: 1,
    max: 65535,
    defaultValue: '6379',
  },
  {
    key: 'REDIS_PASSWORD',
    label: 'Redis 密码',
    group: 'storage',
    type: 'secret',
    defaultValue: '',
  },
  {
    key: 'BOX_LOCAL_PLAYER_LIMIT',
    label: '单地图玩家上限',
    group: 'capacity',
    type: 'number',
    min: 1,
    max: 256,
    defaultValue: '8',
  },
  {
    key: 'BOX_PLAY_MAX_RUNTIMES',
    label: '最大地图运行时',
    group: 'capacity',
    type: 'number',
    min: 1,
    max: 128,
    defaultValue: '8',
  },
  {
    key: 'BOX_PLAY_PREWARM_RUNTIMES',
    label: '预热运行时数量',
    group: 'capacity',
    type: 'number',
    min: 0,
    max: 128,
    defaultValue: '8',
  },
  {
    key: 'BOX_TELEPORT_MAX_ROOMS',
    label: 'Teleport 私有房间上限',
    group: 'capacity',
    type: 'number',
    min: 1,
    max: 1024,
    defaultValue: '64',
  },
  {
    key: 'BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS',
    label: '私有房间空闲回收（毫秒）',
    group: 'capacity',
    type: 'number',
    min: 60000,
    max: 86400000,
    defaultValue: '900000',
  },
]

const descriptorByKey = new Map(configuration.map((descriptor) => [descriptor.key, descriptor]))

function parseEnvironment(source) {
  const values = new Map()
  for (const line of String(source || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    values.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim())
  }
  return values
}

function replaceEnvironmentValues(source, updates) {
  const pending = new Map(updates)
  const lines = String(source || '').split('\n')
  const output = lines.map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/)
    if (!match || !pending.has(match[1])) return line
    const value = pending.get(match[1])
    pending.delete(match[1])
    return `${match[1]}=${value}`
  })
  for (const [key, value] of pending) output.push(`${key}=${value}`)
  return `${output.join('\n').replace(/\n+$/, '')}\n`
}

function validateValue(descriptor, value) {
  value = String(value ?? '').trim()
  if (value.length > 2048 || value.includes('\n') || value.includes('\r') || value.includes('\0')) {
    throw new Error(`${descriptor.label} 的内容无效`)
  }
  if (descriptor.type === 'number') {
    const number = Number(value)
    if (!Number.isInteger(number) || number < descriptor.min || number > descriptor.max) {
      throw new Error(`${descriptor.label} 必须在 ${descriptor.min}–${descriptor.max} 之间`)
    }
  }
  if (descriptor.type === 'boolean' && !['true', 'false'].includes(value)) {
    throw new Error(`${descriptor.label} 必须是 true 或 false`)
  }
  if (descriptor.type === 'select' && !descriptor.options.includes(value)) {
    throw new Error(`${descriptor.label} 的选项无效`)
  }
  if (descriptor.type === 'url' && value) {
    let url
    try {
      url = new URL(value)
    } catch {
      throw new Error(`${descriptor.label} 必须是完整 URL`)
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error(`${descriptor.label} 只接受不含账号密码的 HTTP(S) URL`)
    }
  }
  return value
}

function parseComposeStatus(output) {
  const text = String(output || '').trim()
  if (!text) return []
  let records
  try {
    records = JSON.parse(text)
    if (!Array.isArray(records)) records = [records]
  } catch {
    records = text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  }
  return records
}

function defaultCommandRunner(command, args, options) {
  return new Promise((resolve) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      resolve({ status: error?.code || 0, stdout: stdout || '', stderr: stderr || '' })
    })
  })
}

function createOperations(options = {}) {
  const root = path.resolve(options.root || process.env.BOX_SERVER_MANAGER_ROOT || '/workspace')
  const composeFile = path.resolve(
    options.composeFile ||
      process.env.BOX_SERVER_MANAGER_COMPOSE_FILE ||
      path.join(root, 'compose.yml'),
  )
  const environmentFile = path.resolve(
    options.environmentFile || process.env.BOX_SERVER_MANAGER_ENV_FILE || path.join(root, '.env'),
  )
  const run = options.run || defaultCommandRunner
  const filesystem = options.filesystem || fs

  function readEnvironment() {
    return filesystem.readFileSync(environmentFile, 'utf8')
  }

  function composeArguments(args) {
    return [
      'compose',
      '--project-name',
      'box-local-engine',
      '--env-file',
      environmentFile,
      '-f',
      composeFile,
      ...args,
    ]
  }

  async function runCompose(args, timeout = 120000) {
    const result = await run('docker', composeArguments(args), {
      cwd: root,
      encoding: 'utf8',
      timeout,
      maxBuffer: 4 * 1024 * 1024,
    })
    if (result.status !== 0) {
      const detail = String(result.stderr || result.stdout || '')
        .trim()
        .slice(-4000)
      throw new Error(detail || `Docker Compose 退出码 ${result.status}`)
    }
    return String(result.stdout || '')
  }

  function enabledServices() {
    const profiles = parseEnvironment(readEnvironment()).get('COMPOSE_PROFILES') || ''
    const enabledProfiles = new Set(profiles.split(',').map((profile) => profile.trim()))
    return services.filter((service) => enabledProfiles.has(serviceProfiles[service]))
  }

  async function getStatus() {
    const records = parseComposeStatus(await runCompose(['ps', '--all', '--format', 'json']))
    const enabled = new Set(enabledServices())
    return {
      services: services.map((name) => {
        const record = records.find((candidate) => candidate.Service === name)
        const state = String(record?.State || 'stopped').toLowerCase()
        return {
          name,
          enabled: enabled.has(name),
          running: state === 'running',
          state,
          health: String(record?.Health || ''),
        }
      }),
    }
  }

  async function getLogs(service) {
    if (service && !services.includes(service)) throw new Error('服务名称无效')
    const targets = service ? [service] : enabledServices()
    return runCompose(['logs', '--no-color', '--tail', '300', ...targets], 30000)
  }

  async function control(action, service = 'all') {
    if (!['start', 'stop', 'restart'].includes(action)) throw new Error('操作名称无效')
    if (service !== 'all' && !services.includes(service)) throw new Error('服务名称无效')
    const targets = service === 'all' ? enabledServices() : [service]
    if (action === 'start') {
      await runCompose(['up', '-d', '--no-build', '--remove-orphans', ...targets], 10 * 60 * 1000)
    } else if (action === 'stop') {
      await runCompose(['stop', ...targets], 5 * 60 * 1000)
    } else {
      await runCompose(['restart', ...targets], 5 * 60 * 1000)
    }
    return getStatus()
  }

  function getConfiguration() {
    const values = parseEnvironment(readEnvironment())
    return configuration.map((descriptor) => ({
      ...descriptor,
      value: secretKeys.has(descriptor.key)
        ? ''
        : (values.get(descriptor.key) ?? descriptor.defaultValue),
      configured: secretKeys.has(descriptor.key) && Boolean(values.get(descriptor.key)),
    }))
  }

  function saveConfiguration(values) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new Error('配置格式无效')
    }
    const existing = parseEnvironment(readEnvironment())
    const updates = new Map()
    for (const [key, submitted] of Object.entries(values)) {
      const descriptor = descriptorByKey.get(key)
      if (!descriptor) throw new Error(`不允许修改配置项 ${key}`)
      const value = validateValue(descriptor, submitted)
      if (secretKeys.has(key) && !value) continue
      if (secretKeys.has(key) && value === existing.get(key)) continue
      updates.set(key, value)
    }
    if (!updates.size) return getConfiguration()
    const next = replaceEnvironmentValues(readEnvironment(), updates)
    const temporary = `${environmentFile}.${process.pid}.tmp`
    filesystem.writeFileSync(temporary, next, { mode: 0o600 })
    filesystem.renameSync(temporary, environmentFile)
    filesystem.chmodSync?.(environmentFile, 0o600)
    return getConfiguration()
  }

  return { getStatus, getLogs, control, getConfiguration, saveConfiguration }
}

module.exports = {
  configuration,
  createOperations,
  parseComposeStatus,
  parseEnvironment,
  replaceEnvironmentValues,
  validateValue,
}
