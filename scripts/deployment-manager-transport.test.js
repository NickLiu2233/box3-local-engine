'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

// openapi-fetch uses the standards-based Request form. Keep these regression
// assertions readable by adapting Request back to the legacy test tuple while
// preserving the original body object (notably File/Blob uploads).
const NativeRequest = globalThis.Request
const requestBodies = new WeakMap()
globalThis.Request = class TestRequest extends NativeRequest {
  constructor(input, init) {
    const resolvedInput =
      typeof input === 'string' && input.startsWith('/') ? `http://localhost${input}` : input
    super(resolvedInput, init)
    requestBodies.set(
      this,
      init?.body ?? (input instanceof NativeRequest ? requestBodies.get(input) : undefined),
    )
  }
}

let fetchHandler
Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  get() {
    const handler = fetchHandler
    return (input, init) => {
      if (!(input instanceof NativeRequest)) return handler(input, init)
      const url = new URL(input.url)
      const headers = Object.fromEntries(input.headers.entries())
      for (const name of ['Authorization', 'Content-Type', 'X-Backup-Name', 'X-Operation-Id']) {
        const value = input.headers.get(name)
        if (value !== null) headers[name] = value
      }
      return handler(`${url.pathname}${url.search}`, {
        method: input.method,
        headers,
        credentials: input.credentials,
        signal: input.signal,
        body: requestBodies.get(input),
      })
    }
  },
  set: (handler) => {
    fetchHandler = handler
  },
})

// Exercise the real transport with only the native bridge and HTTP boundary stubbed.
const source = fs
  .readFileSync(path.join(__dirname, '../apps/deployment-manager/src/transport.js'), 'utf8')
  .replace(
    /import .* from '@tauri-apps\/api\/core'/,
    'const tauriInvoke = (...args) => globalThis.nativeInvoke(...args)',
  )
  .replace(
    /import .* from '@tauri-apps\/api\/event'/,
    'const tauriListen = (...args) => globalThis.nativeListen(...args)',
  )
  .replace(
    "import { ApiClient } from '@box/apis'",
    `import { ApiClient } from ${JSON.stringify(
      pathToFileURL(path.join(__dirname, '../internals/apis/dist/index.es.js')).href,
    )}`,
  )
const transport = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('all authenticated HTTP operations forget a rejected token', async () => {
  const api = await transport
  const values = new Map()
  globalThis.window = {}
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: '令牌失效' }), { status: 401 })
  for (const operation of [
    () => api.invoke('get_system_status'),
    () => api.uploadBackup({ name: 'backup.tar.gz' }),
    () => api.downloadBackup('backup.tar.gz'),
    () => api.downloadDiagnostics('diagnostics.tar.gz'),
  ]) {
    api.setWebManagerToken('expired')
    await assert.rejects(operation, /令牌失效/)
    assert.equal(api.hasWebManagerToken(), false)
  }
})

test('license notices are public while management commands still require a token', async () => {
  const api = await transport
  web()
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/commands/get_legal_notices')
    assert.equal(options.headers.Authorization, undefined)
    return json({ result: { licenseName: '发行许可证', licenseText: 'license' } })
  }
  assert.deepEqual(await api.invoke('get_legal_notices'), {
    licenseName: '发行许可证',
    licenseText: 'license',
  })
  await assert.rejects(api.invoke('get_about_info'), /请先输入 Linux Web 管理令牌/)
})

test('desktop commands and progress events retain their native contract', async () => {
  const api = await transport
  globalThis.window = { __TAURI_INTERNALS__: {} }
  const payload = { service: 'redis' }
  globalThis.nativeInvoke = async (name, body) => ({ name, body })
  assert.deepEqual(await api.invoke('start_managed_service', payload), {
    name: 'start_managed_service',
    body: payload,
  })
  const handler = () => {}
  const unlisten = () => {}
  globalThis.nativeListen = async (event, callback) => {
    assert.equal(event, 'install-progress')
    assert.equal(callback, handler)
    return unlisten
  }
  assert.equal(await api.listen('install-progress', handler), unlisten)
})

function web() {
  globalThis.window = { setTimeout }
  const values = new Map()
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('Web progress protocol, subscriptions, abort and main error isolation', async () => {
  const api = await transport
  web()
  api.setWebManagerToken('secret')
  const timers = new Map()
  const originalSet = globalThis.setTimeout
  const originalClear = globalThis.clearTimeout
  globalThis.setTimeout = (callback, delay) => {
    assert.equal(delay, 750)
    const id = Symbol()
    timers.set(id, callback)
    return id
  }
  globalThis.clearTimeout = (id) => timers.delete(id)
  const tick = async () => {
    const [id, callback] = timers.entries().next().value
    timers.delete(id)
    await callback()
  }
  let unlisten = () => {}
  try {
    const requests = []
    let command = deferred()
    let progress = json({ stage: 'pull', message: '下载', percent: 42 })
    globalThis.fetch = (url, options) => {
      requests.push({ url, options })
      return url.startsWith('/api/commands/') ? command.promise : Promise.resolve(progress.clone())
    }
    const events = []
    const unrelated = await api.listen('other-event', () => assert.fail('unrelated event'))
    unlisten = await api.listen('install-progress', (event) => events.push(event))
    const result = api.invoke('start_services', { force: true })
    const post = requests[0]
    assert.equal(post.url, '/api/commands/start_services')
    assert.equal(post.options.method, 'POST')
    assert.equal(post.options.body, '{"force":true}')
    assert.equal(post.options.headers['Content-Type'], 'application/json')
    const id = post.options.headers['X-Operation-Id']
    assert.match(id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
    await tick()
    assert.equal(requests[1].url, `/api/operations/${id}`)
    assert.equal(requests[1].options.method, 'GET')
    for (const request of requests) {
      assert.equal(request.options.headers.Authorization, 'Bearer secret')
      assert.equal(request.options.credentials, 'same-origin')
    }
    assert.deepEqual(events, [{ payload: { stage: 'pull', message: '下载', percent: 42 } }])
    const slowRead = deferred()
    const commandFetch = globalThis.fetch
    globalThis.fetch = (url, options) => {
      if (url === '/api/commands/get_system_status') {
        assert.equal(Object.hasOwn(options.headers, 'X-Operation-Id'), false)
        return slowRead.promise
      }
      return commandFetch(url, options)
    }
    const reading = api.invoke('get_system_status')
    assert.equal(timers.size, 1, 'only the startup operation has a timer')
    await tick()
    assert.equal(events.length, 2)
    assert.equal(events.at(-1).payload.stage, 'pull')
    slowRead.resolve(json({ result: { dockerReady: true } }))
    assert.deepEqual(await reading, { dockerReady: true })
    assert.equal(events.length, 2, 'read completion must not emit progress')
    events.pop()
    globalThis.fetch = commandFetch
    progress = json({}, 404)
    await tick()
    progress = json({}, 500)
    await tick()
    assert.equal(events.length, 1)
    command.resolve(json({ result: 'done' }))
    assert.equal(await result, 'done')
    assert.equal(timers.size, 0)

    command = deferred()
    progress = deferred()
    const pending = api.invoke('start_services')
    globalThis.fetch = (url, options) => {
      requests.push({ url, options })
      return progress.promise
    }
    const polling = tick()
    unlisten()
    unlisten()
    assert.equal(requests.at(-1).options.signal.aborted, true)
    progress.resolve(json({ percent: 99 }))
    await polling
    assert.equal(events.length, 1)
    command.reject(new Error('main failure'))
    await assert.rejects(pending, /main failure/)
    assert.equal(timers.size, 0)
    unrelated()

    // A completed command aborts a pending poll and suppresses its late response.
    unlisten = await api.listen('install-progress', (value) => events.push(value))
    command = deferred()
    const lateProgress = deferred()
    let signal
    globalThis.fetch = (url, options) => {
      if (url.startsWith('/api/commands/')) return command.promise
      signal = options.signal
      return lateProgress.promise
    }
    const finishing = api.invoke('start_services')
    const lateTick = tick()
    command.resolve(json({ result: 'finished' }))
    assert.equal(await finishing, 'finished')
    assert.equal(signal.aborted, true)
    lateProgress.resolve(json({ percent: 100 }))
    await lateTick
    assert.equal(events.length, 1)
    assert.equal(timers.size, 0)
    unlisten()

    globalThis.fetch = async () => json({ result: true })
    await api.invoke('start_services')
    assert.equal(timers.size, 0)
    unlisten = await api.listen('install-progress', () => {})
    api.setWebManagerToken('')
    globalThis.fetch = () => assert.fail('missing token must not request')
    await assert.rejects(api.invoke('start_services'), /令牌/)
    assert.equal(timers.size, 0)

    api.setWebManagerToken('expired')
    command = deferred()
    globalThis.fetch = (url) =>
      url.startsWith('/api/commands/')
        ? command.promise
        : Promise.resolve(json({ message: 'expired' }, 401))
    const unauthorized = api.invoke('start_services')
    await tick()
    assert.equal(api.hasWebManagerToken(), false)
    assert.equal(timers.size, 0)
    command.resolve(json({ result: 'main result' }))
    assert.equal(await unauthorized, 'main result')
  } finally {
    unlisten()
    globalThis.setTimeout = originalSet
    globalThis.clearTimeout = originalClear
  }
})

test('Web local adapters choose files, clean listeners and download authenticated blobs', async () => {
  const api = await transport
  web()
  api.setWebManagerToken('token')
  assert.equal(api.dockerPlatform().canStart, false)
  assert.doesNotMatch(JSON.stringify(api.dockerPlatform()), /Desktop/)
  assert.equal(api.dockerPlatform().action, '重新检测 Docker')
  assert.match(api.dockerPlatform().hint, /sudo systemctl start docker/)
  globalThis.window.open = (...args) =>
    assert.deepEqual(args, ['https://example.com', '_blank', 'noopener,noreferrer'])
  await api.openExternal('https://example.com')
  const file = { name: '备份.tar.gz' }
  let event = 'change'
  let removed = 0
  let clicked = 0
  const requests = []
  globalThis.document = {
    body: { append() {} },
    createElement: (tag) => {
      const handlers = new Map()
      return {
        files: [file],
        addEventListener: (name, handler) => handlers.set(name, handler),
        removeEventListener: (name) => handlers.delete(name),
        remove: () => {
          removed++
          assert.equal(handlers.size, 0)
        },
        click() {
          if (tag === 'input') {
            assert.equal(this.accept, '.zip,.tar,.tar.gz,application/zip,application/gzip')
            handlers.get(event)()
          } else {
            clicked++
            assert.match(this.href, /^blob:/)
          }
        },
      }
    },
  }
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return url.endsWith('/upload')
      ? json({ path: 'server/backup.tar.gz' })
      : new Response('archive')
  }
  assert.equal(await api.selectBackup(), 'server/backup.tar.gz')
  assert.equal(requests[0].options.body, file)
  assert.equal(requests[0].options.headers['X-Backup-Name'], encodeURIComponent(file.name))
  event = 'cancel'
  assert.equal(await api.selectBackup(), null)
  assert.equal(removed, 2)
  assert.equal(requests.length, 1)
  assert.equal(await api.exportBackupFile('备份.tar.gz'), '备份下载已开始。')
  assert.equal(requests[1].url, `/api/backups/${encodeURIComponent(file.name)}/download`)
  assert.equal(clicked, 1)
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return url.startsWith('/api/commands/') ? json({ result: 'diag.tar.gz' }) : new Response('diag')
  }
  assert.equal(await api.exportDiagnosticsFile(), '诊断文件下载已开始。')
  assert.equal(requests.at(-1).url, '/api/diagnostics/diag.tar.gz/download')
  event = 'change'
  globalThis.fetch = async () => {
    throw new Error('upload failed')
  }
  await assert.rejects(api.selectBackup(), /upload failed/)
  assert.equal(removed, 3)
})

test('native file and external adapters preserve command names, payloads and cancellation', async () => {
  const api = await transport
  globalThis.window = { __TAURI_INTERNALS__: {} }
  globalThis.fetch = () => assert.fail('desktop must not fetch')
  const calls = []
  globalThis.nativeInvoke = async (...args) => {
    calls.push(args)
    return '/native/file'
  }
  assert.equal(await api.selectBackup(), '/native/file')
  assert.equal(await api.exportBackupFile('archive'), '备份已导出：/native/file')
  assert.equal(await api.exportDiagnosticsFile(), '/native/file')
  await api.openExternal('https://example.com')
  await api.openExternal('https://qm.qq.com/q/oMdzAAN49a', 'open_community_group')
  assert.deepEqual(calls, [
    ['import_backup', {}],
    ['export_backup', { archive: 'archive' }],
    ['export_diagnostics', {}],
    ['open_service', { url: 'https://example.com' }],
    ['open_community_group', {}],
  ])
  assert.equal(api.dockerPlatform().canStart, true)
  globalThis.nativeInvoke = async () => null
  assert.equal(await api.selectBackup(), null)
  assert.equal(await api.exportBackupFile('archive'), '')
  globalThis.nativeInvoke = async () => {
    throw new Error('native failure')
  }
  await assert.rejects(api.exportDiagnosticsFile(), /native failure/)
})

test('only explicitly supported long tasks carry operation IDs', async () => {
  const api = await transport
  web()
  api.setWebManagerToken('token')
  const mutations = [
    'start_services',
    'stop_services',
    'control_service',
    'prepare_managed_database',
    'prepare_managed_redis',
    'start_managed_service',
    'save_configuration_command',
    'save_raw_environment',
    'create_backup',
    'restore_backup',
    'export_diagnostics',
    'destroy_project_runtime',
  ]
  const reads = [
    'get_system_status',
    'get_project_runtime_status',
    'get_performance_status',
    'get_managed_service_info',
    'get_install_config',
    'get_raw_environment',
    'get_license_status',
    'get_legal_notices',
    'get_docker_check',
    'get_owner_secrets',
    'get_about_info',
    'list_backups',
    'has_managed_database_image',
    'has_managed_redis_image',
    'test_remote_connection',
    'unknown command',
  ]
  const ids = new Set()
  for (const command of [...mutations, ...reads]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, `/api/commands/${encodeURIComponent(command)}`)
      // Read commands retain the existing POST RPC contract, without tracking metadata.
      assert.equal(options.method, 'POST')
      assert.equal(Object.hasOwn(options.headers, 'X-Operation-Id'), mutations.includes(command))
      if (mutations.includes(command)) ids.add(options.headers['X-Operation-Id'])
      return json({ result: true })
    }
    assert.equal(await api.invoke(command), true)
  }
  assert.equal(ids.size, mutations.length)
})

test('late 401 responses preserve replacement tokens across authenticated adapters', async () => {
  const api = await transport
  web()
  for (const operation of [
    () => api.invoke('get_system_status'),
    () => api.uploadBackup({ name: 'backup.tar.gz' }),
    () => api.downloadBackup('backup.tar.gz'),
    () => api.downloadDiagnostics('diag.tar.gz'),
  ]) {
    api.setWebManagerToken('old-token')
    const response = deferred()
    globalThis.fetch = (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer old-token')
      return response.promise
    }
    const pending = operation()
    api.setWebManagerToken('new-token')
    response.resolve(json({ message: 'old token rejected' }, 401))
    await assert.rejects(pending, /old token rejected/)
    assert.equal(api.hasWebManagerToken(), true)
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer new-token')
      return json({ result: true })
    }
    await api.invoke('get_system_status')
  }
})

test('restore success includes optional cleanup warning without claiming services stopped', async () => {
  const vm = require('node:vm')
  const main = fs.readFileSync(
    path.join(__dirname, '../apps/deployment-manager/src/main.js'),
    'utf8',
  )
  const handler = main.slice(
    main.indexOf('async function confirmBackupAction()'),
    main.indexOf('async function refreshStatus()'),
  )
  for (const warning of [null, '旧数据目录清理失败，请手动清理。']) {
    const state = {
      backupDialog: { action: 'restore', archive: 'old.zip' },
      busy: false,
      page: 'backups',
      error: '',
    }
    let refreshed = false
    const context = vm.createContext({
      state,
      clearFeedback() {},
      render() {},
      async refreshStatus() {
        refreshed = true
      },
      async invoke(command, payload) {
        assert.equal(command, 'restore_backup')
        assert.equal(payload.archive, 'old.zip')
        return warning
      },
    })
    await vm.runInContext(`${handler}\nconfirmBackupAction()`, context)
    assert.equal(
      state.backupMessage,
      '恢复完成，请在服务总览检查并按需启动服务。' + (warning ? ` 清理提示：${warning}` : ''),
    )
    assert.equal(state.error, '')
    assert.equal(state.busy, false)
    assert.equal(refreshed, true)
  }
})
