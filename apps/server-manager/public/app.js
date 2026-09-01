const serviceNames = {
  'creator': ['创作端', '地图创作与工程管理'],
  'voxa': ['VOXA', '模型编辑与资源库'],
  'play': ['游玩端', '地图浏览与运行'],
  'player-service': ['玩家服务', '账号、权限与会话'],
  'player-auth-portal': ['登录门户', '玩家登录与注册'],
}

const groups = {
  network: ['访问与端口', '修改后需重启游玩服务'],
  access: ['访问策略', '注册与地图包管理权限'],
  storage: ['数据服务', 'PostgreSQL 必填，Redis 可选'],
  capacity: ['运行容量', '根据服务器内存和地图规模调整'],
}

const state = {
  token: sessionStorage.getItem('box-server-manager-token') || '',
  page: 'overview',
  status: null,
  fields: [],
  logs: '',
  logService: '',
  busy: false,
  error: '',
  notice: '',
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      state.token = ''
      sessionStorage.removeItem('box-server-manager-token')
    }
    throw new Error(body.message || `请求失败：${response.status}`)
  }
  return body
}

function icon(name) {
  const paths = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.5 1a8 8 0 0 0-1.8-1L14.2 3h-4.4l-.4 3a8 8 0 0 0-1.8 1L5 6 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.6-1a8 8 0 0 0 1.8 1l.4 3h4.4l.4-3a8 8 0 0 0 1.8-1l2.5 1 2.1-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>',
    logs: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`
}

function login() {
  return `<main class="login-shell"><section class="login-card"><img src="/logo512.png" alt="BOX3 Engine"/><span>Linux Server Console</span><h1>服务器管理</h1><p>输入服务器包 <code>.env</code> 中的 <code>BOX_SERVER_MANAGER_TOKEN</code>。</p><form id="login-form"><label>管理令牌<input name="token" type="password" minlength="32" autocomplete="current-password" required autofocus/></label><button class="primary" type="submit">进入控制台</button></form>${state.error ? `<div class="message error">${escapeHtml(state.error)}</div>` : ''}</section></main>`
}

function shell(content) {
  return `<div class="shell"><aside><div class="brand"><img src="/logo512.png" alt=""/><div><strong>BOX3 Engine</strong><span>Linux 服务器</span></div></div><nav><button data-page="overview" class="${state.page === 'overview' ? 'active' : ''}">${icon('home')}服务总览</button><button data-page="config" class="${state.page === 'config' ? 'active' : ''}">${icon('settings')}服务器配置</button><button data-page="logs" class="${state.page === 'logs' ? 'active' : ''}">${icon('logs')}运行日志</button></nav><div class="sidebar-foot"><span class="dot good"></span><span>管理通道已认证</span><button id="logout">退出</button></div></aside><main><header><div><span class="eyebrow">HEADLESS OPERATIONS</span><h1>${state.page === 'overview' ? '服务总览' : state.page === 'config' ? '服务器配置' : '运行日志'}</h1></div></header>${state.error ? `<div class="message error">${escapeHtml(state.error)}</div>` : ''}${state.notice ? `<div class="message success">${escapeHtml(state.notice)}</div>` : ''}${content}</main></div>`
}

function overview() {
  const items = state.status?.services || []
  const running = items.filter((item) => item.running).length
  const enabled = items.filter((item) => item.enabled).length
  return `<section class="summary"><div><span class="dot ${running === enabled && enabled ? 'good' : ''}"></span><div><strong>${running === enabled && enabled ? '服务运行正常' : running ? '部分服务正在运行' : '服务已停止'}</strong><span>${running} / ${enabled} 个已启用服务运行中</span></div></div><div class="actions"><button data-control="start" data-service="all" class="primary">${icon('play')}全部启动</button><button data-control="stop" data-service="all">${icon('stop')}全部停止</button><button data-control="restart" data-service="all">${icon('refresh')}全部重启</button></div></section><div class="section-title"><h2>引擎服务</h2><span>Creator 与 VOXA 默认只监听服务器本机</span></div><section class="service-grid">${items.map(serviceCard).join('')}</section>`
}

function serviceCard(service) {
  const [title, description] = serviceNames[service.name] || [service.name, '']
  return `<article class="service-card ${service.enabled ? '' : 'disabled'}"><div class="service-top"><div><span>${escapeHtml(description)}</span><h3>${escapeHtml(title)}</h3></div><span class="state ${service.running ? 'running' : ''}"><i></i>${!service.enabled ? '未启用' : service.running ? '运行中' : '已停止'}</span></div><div class="service-actions"><button data-page="logs" data-log-service="${service.name}">查看日志</button><button data-control="${service.running ? 'stop' : 'start'}" data-service="${service.name}" ${!service.enabled ? 'disabled' : ''}>${service.running ? '停止' : '启动'}</button></div></article>`
}

function fieldInput(field) {
  if (field.type === 'boolean') {
    return `<label class="toggle"><span><strong>${escapeHtml(field.label)}</strong><small>${escapeHtml(field.key)}</small></span><input name="${field.key}" type="checkbox" ${field.value === 'true' ? 'checked' : ''}/><i></i></label>`
  }
  if (field.type === 'select') {
    return `<label class="field"><span>${escapeHtml(field.label)}</span><select name="${field.key}">${field.options.map((option) => `<option ${field.value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select><small>${escapeHtml(field.key)}</small></label>`
  }
  const type = field.type === 'secret' ? 'password' : field.type === 'number' ? 'number' : 'text'
  const placeholder = field.type === 'secret' && field.configured ? '已配置，留空则保持不变' : ''
  return `<label class="field"><span>${escapeHtml(field.label)}</span><input name="${field.key}" type="${type}" value="${escapeHtml(field.value)}" placeholder="${placeholder}" ${field.min === undefined ? '' : `min="${field.min}"`} ${field.max === undefined ? '' : `max="${field.max}"`}/><small>${escapeHtml(field.key)}</small></label>`
}

function config() {
  return `<form id="config-form"><div class="config-head"><p>保存只会更新服务器 <code>.env</code>，不会自动重启服务。</p><button class="primary" type="submit">保存配置</button></div>${Object.entries(
    groups,
  )
    .map(([id, [title, description]]) => {
      const fields = state.fields.filter((field) => field.group === id)
      return `<section class="config-section"><div><h2>${title}</h2><p>${description}</p></div><div class="field-grid">${fields.map(fieldInput).join('')}</div></section>`
    })
    .join('')}</form>`
}

function logs() {
  return `<div class="logs-toolbar"><select id="log-service"><option value="">全部服务</option>${Object.entries(
    serviceNames,
  )
    .map(
      ([id, [name]]) =>
        `<option value="${id}" ${state.logService === id ? 'selected' : ''}>${name}</option>`,
    )
    .join(
      '',
    )}</select><button id="refresh-logs">${icon('refresh')}刷新日志</button></div><pre class="logs">${escapeHtml(state.logs || '暂无日志输出。')}</pre>`
}

function render() {
  const app = document.querySelector('#app')
  app.innerHTML = state.token
    ? shell(state.page === 'overview' ? overview() : state.page === 'config' ? config() : logs())
    : login()
  bind()
}

function feedback(error = '', notice = '') {
  state.error = error
  state.notice = notice
}

async function loadStatus() {
  if (!state.token) return
  try {
    state.status = await request('/api/status')
    feedback()
  } catch (error) {
    feedback(String(error.message || error))
  }
  render()
}

async function loadConfiguration() {
  try {
    const result = await request('/api/config')
    state.fields = result.fields
  } catch (error) {
    feedback(String(error.message || error))
  }
  render()
}

async function loadLogs() {
  try {
    const query = state.logService ? `?service=${encodeURIComponent(state.logService)}` : ''
    state.logs = (await request(`/api/logs${query}`)).logs
  } catch (error) {
    state.logs = String(error.message || error)
  }
  render()
}

async function control(action, service) {
  if (state.busy) return
  state.busy = true
  feedback()
  render()
  try {
    state.status = await request('/api/control', {
      method: 'POST',
      body: JSON.stringify({ action, service }),
    })
    feedback('', '操作已完成。')
  } catch (error) {
    feedback(String(error.message || error))
  } finally {
    state.busy = false
    render()
  }
}

function bind() {
  document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.token = new FormData(event.currentTarget).get('token').trim()
    sessionStorage.setItem('box-server-manager-token', state.token)
    await loadStatus()
  })
  document.querySelector('#logout')?.addEventListener('click', () => {
    state.token = ''
    sessionStorage.removeItem('box-server-manager-token')
    feedback()
    render()
  })
  document.querySelectorAll('[data-page]').forEach((node) =>
    node.addEventListener('click', async () => {
      state.page = node.dataset.page
      if (node.dataset.logService) state.logService = node.dataset.logService
      feedback()
      if (state.page === 'config' && !state.fields.length) await loadConfiguration()
      else if (state.page === 'logs') await loadLogs()
      else render()
    }),
  )
  document
    .querySelectorAll('[data-control]')
    .forEach((node) =>
      node.addEventListener('click', () => control(node.dataset.control, node.dataset.service)),
    )
  document.querySelector('#config-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(
      state.fields.map((field) => [
        field.key,
        field.type === 'boolean' ? String(form.has(field.key)) : String(form.get(field.key) || ''),
      ]),
    )
    try {
      state.fields = (
        await request('/api/config', { method: 'PUT', body: JSON.stringify({ values }) })
      ).fields
      feedback('', '配置已保存；请重启相关服务使其生效。')
    } catch (error) {
      feedback(String(error.message || error))
    }
    render()
  })
  document.querySelector('#log-service')?.addEventListener('change', async (event) => {
    state.logService = event.currentTarget.value
    await loadLogs()
  })
  document.querySelector('#refresh-logs')?.addEventListener('click', loadLogs)
}

render()
if (state.token) loadStatus()
setInterval(() => {
  if (state.token && state.page === 'overview' && !state.busy) loadStatus()
}, 5000)
