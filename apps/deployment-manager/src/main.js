import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import './styles.css'

const services = [
  ['creator', '创作端', '地图与模型创作', 'http://127.0.0.1:3002/'],
  ['play', '游玩端', '作品游玩与服主管理', 'http://127.0.0.1:3000/'],
  ['player-service', '玩家管理', '账号、权限与封禁', 'http://127.0.0.1:3213/players'],
  ['player-auth-portal', '登录门户', '玩家登录与注册', 'http://127.0.0.1:3214/'],
  ['voxa', 'VOXA', '模型编辑服务', 'http://127.0.0.1:3001/'],
]

const state = {
  page: 'overview',
  setupSection: 'data',
  helpSection: 'welcome',
  busy: false,
  status: null,
  config: null,
  logs: '',
  error: '',
  progress: { stage: 'idle', message: '等待操作', percent: 0 },
}

const icons = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.33.72.6 1 .3.3.7.44 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/>',
  logs: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.8 1.95c-.94.66-1.5 1.03-1.5 2.05M12 17h.01"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 7l-2 5M5.5 15A7 7 0 0 0 18 17l2-5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v6H5V6h6"/>',
}

function icon(name) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${icons[name]}</svg>`
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function navItem(page, iconName, label) {
  return `<button class="nav-item ${state.page === page ? 'active' : ''}" data-page="${page}">${icon(iconName)}<span>${label}</span></button>`
}

function shell(content) {
  return `<div class="shell">
    <aside>
      <div class="brand"><div class="brand-mark">B</div><div><strong>BOX</strong><span>部署管理器</span></div></div>
      <nav>${navItem('overview', 'home', '总览')}${navItem('setup', 'settings', '安装配置')}${navItem('logs', 'logs', '运行日志')}${navItem('help', 'help', '帮助手册')}</nav>
      <div class="sidebar-foot"><span class="status-dot ${state.status?.dockerReady ? 'good' : ''}"></span><span>${state.status?.dockerReady ? 'Docker 已连接' : 'Docker 未连接'}</span></div>
    </aside>
    <main>${content}</main>
  </div>`
}

function overview() {
  const installed = state.status?.configured
  const enabledCount =
    state.status?.services?.filter((service) => service.enabled !== false).length || 0
  const runningCount = state.status?.services?.filter((service) => service.running).length || 0
  return `<header><div><h1>服务总览</h1></div>
    <button class="icon-button" id="refresh" title="刷新">${icon('refresh')}</button></header>
    ${!state.status?.dockerReady ? `<section class="notice danger"><strong>Docker Desktop 尚未就绪</strong><span>${escapeHtml(state.status?.dockerMessage || '请安装并启动 Docker Desktop。')}</span></section>` : ''}
    ${errorBanner()}
    ${state.busy ? progressPanel() : ''}
    <section class="summary-bar"><div><span class="status-dot ${state.status?.allHealthy ? 'good' : ''}"></span><div><strong>${state.status?.allHealthy ? '运行正常' : installed ? '服务已停止' : '尚未配置'}</strong><span>${installed ? `${runningCount} / ${enabledCount} 个服务运行中` : '完成配置后即可启动'}</span></div></div>
      <div class="hero-actions">${installed ? `<button class="button primary" id="start" ${state.busy ? 'disabled' : ''}>${icon('play')}启动</button><button class="button" id="stop" ${state.busy ? 'disabled' : ''}>${icon('stop')}停止</button>` : `<button class="button primary" data-page="setup">配置</button>`}</div></section>
    <div class="section-title"><h2>应用服务</h2></div>
    <div class="service-grid">${services.map(serviceCard).join('')}</div>`
}

function errorBanner() {
  return state.error
    ? `<section class="notice danger"><strong>操作未完成</strong><span>${escapeHtml(state.error)}</span></section>`
    : ''
}

function serviceCard([id, name, description, url]) {
  const service = state.status?.services?.find((item) => item.name === id)
  const enabled = service?.enabled !== false
  const running = service?.running
  return `<article class="service-card ${enabled ? '' : 'disabled'}"><div class="service-icon">${name.slice(0, 1)}</div><div class="service-copy"><h3>${name}</h3><p>${!enabled ? '需要 PostgreSQL' : description}</p></div><span class="service-state ${running ? 'running' : ''}"><i></i>${!enabled ? '未启用' : running ? '运行中' : '已停止'}</span><button class="open-button" data-open="${url}" title="打开 ${name}" ${running ? '' : 'disabled'}>${icon('external')}</button></article>`
}

function progressPanel() {
  return `<section class="progress-panel"><div><strong>${escapeHtml(state.progress.message)}</strong><span>${Math.max(0, Math.min(100, state.progress.percent))}%</span></div><div class="progress-track"><i style="width:${state.progress.percent}%"></i></div></section>`
}

function input(name, label, value = '', type = 'text', hint = '') {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${type === 'number' ? 'min="0"' : ''}/>${hint ? `<small>${hint}</small>` : ''}</label>`
}

function setup() {
  const config = state.config || {}
  const tab = (id, label) =>
    `<button type="button" class="setup-tab ${state.setupSection === id ? 'active' : ''}" data-setup-section="${id}">${label}</button>`
  return `<header><div><h1>安装配置</h1></div></header>
    ${errorBanner()}
    ${state.busy ? progressPanel() : ''}
    <form id="setup-form">
      <div class="setup-tabs">${tab('data', '数据服务')}${tab('network', '访问设置')}${tab('capacity', '运行容量')}</div>
      <div class="setup-panels">
        <section class="setup-panel ${state.setupSection === 'data' ? 'active' : ''}" data-setup-panel="data">
          <div class="config-group"><div class="group-title"><div><h2>PostgreSQL</h2><span>选填 · 留空使用本机存储</span></div></div><div class="form-grid compact three">${input('databaseHost', '地址', config.databaseHost, 'text', 'IP 或域名')}${input('databasePort', '端口', config.databasePort || '5432', 'number')}${input('databaseName', '数据库', config.databaseName || 'box')}${input('databaseUser', '账号', config.databaseUser || 'box')}${input('databasePassword', '密码', '', 'password', config.hasDatabasePassword ? '留空保留原密码' : '')}<label class="check-field"><input name="databaseSsl" type="checkbox" ${config.databaseSsl ? 'checked' : ''}/><span>使用 SSL</span></label></div></div>
          <div class="config-group"><div class="group-title"><div><h2>Redis</h2><span>选填 · 留空使用本机缓存</span></div></div><div class="form-grid compact three">${input('redisHost', '地址', config.redisHost, 'text', 'IP 或域名')}${input('redisPort', '端口', config.redisPort || '6379', 'number')}${input('redisPassword', '密码', '', 'password', config.hasRedisPassword ? '留空保留原密码' : '')}${input('redisDb', '业务 DB', config.redisDb ?? 0, 'number')}${input('storageCacheRedisDb', '缓存 DB', config.storageCacheRedisDb ?? 1, 'number')}</div></div>
        </section>
        <section class="setup-panel ${state.setupSection === 'network' ? 'active' : ''}" data-setup-panel="network"><div class="config-group"><div class="group-title"><div><h2>玩家访问</h2><span>Creator 与 VOXA 始终仅限本机</span></div></div><div class="form-grid">${input('bindIp', '监听地址', config.bindIp || '127.0.0.1', 'text', '127.0.0.1 或 0.0.0.0')}${input('publicHost', '公开地址', config.publicHost || '127.0.0.1', 'text', '服务器 IP 或域名')}</div></div></section>
        <section class="setup-panel ${state.setupSection === 'capacity' ? 'active' : ''}" data-setup-panel="capacity"><div class="config-group"><div class="group-title"><div><h2>运行时上限</h2><span>按服务器内存调整</span></div></div><div class="form-grid three">${input('playRuntimes', '游玩运行时', config.playRuntimes || 8, 'number')}${input('creatorEditRuntimes', '编辑运行时', config.creatorEditRuntimes || 6, 'number')}${input('creatorPlayRuntimes', '创作预览', config.creatorPlayRuntimes || 4, 'number')}</div></div></section>
      </div>
      <div class="form-actions"><span>${config.databaseHost ? '远程数据模式' : '本机数据模式'}</span><button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>${state.status?.configured ? '保存并应用' : '安装并启动'}</button></div>
    </form>`
}

function logs() {
  return `<header><div><h1>运行日志</h1></div><button class="button" id="load-logs">${icon('refresh')}刷新</button></header>
    <section class="log-card"><div class="log-toolbar"><span>docker compose logs · 最近 500 行</span><button class="text-button" id="copy-logs">复制</button></div><pre>${escapeHtml(state.logs || '点击“刷新日志”读取服务日志。')}</pre></section>`
}

const helpChapters = [
  ['welcome', '认识产品'],
  ['quickstart', '快速部署'],
  ['services', '服务与端口'],
  ['configuration', '配置说明'],
  ['workflow', '创作与游玩'],
  ['players', '玩家与权限'],
  ['operations', '运维与排障'],
]

function helpNav([id, label]) {
  return `<button class="help-nav-item ${state.helpSection === id ? 'active' : ''}" data-help-section="${id}">${label}</button>`
}

function helpSection(title, content) {
  return `<section class="guide-section"><h3>${title}</h3>${content}</section>`
}

function helpList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
}

function helpContent() {
  const chapters = {
    welcome: `<div class="guide-heading"><span>产品介绍</span><h2>BOX Local Engine</h2><p>面向服主的 BOX 本地化创作、游玩与玩家运营环境。</p></div><div class="guide-grid">${helpSection('能做什么', helpList(['在本机或服务器运行 Creator 与 Play', '管理地图、地图组、模型和游玩包', '使用 VOXA 编辑本地模型', '按需启用玩家账号、权限与封禁']))}${helpSection('产品定位', '<p>本项目保留 BOX 核心引擎与创作流程，并将平台依赖替换为本地服务。它不是 BOX 云平台的完整复制品，不包含云社区、商业化、平台审核与数据分析。</p>')}${helpSection('部署组成', '<div class="tag-row"><span>Creator</span><span>Play</span><span>玩家服务</span><span>登录门户</span><span>VOXA</span></div>')}${helpSection('数据原则', '<p>地图、模型和运行缓存保存在应用数据目录。配置 PostgreSQL 后，玩家与地图脚本数据写入远程数据库；Redis 仅用于缓存和运行时协调。</p>')}</div>`,
    quickstart: `<div class="guide-heading"><span>首次使用</span><h2>快速部署</h2><p>准备 Docker Desktop，几步完成本机部署。</p></div><ol class="step-list"><li><b>启动 Docker</b><span>安装 Docker Desktop，并保持 Linux containers 模式。</span></li><li><b>打开管理器</b><span>Windows 运行 EXE，macOS 打开 APP。</span></li><li><b>检查配置</b><span>PostgreSQL 和 Redis 均可留空；服务器部署时再填写公开地址。</span></li><li><b>安装并启动</b><span>管理器会导入镜像、生成密钥并启动已启用的服务。</span></li><li><b>开始使用</b><span>回到总览，待状态变为“运行中”后点击对应服务的打开按钮。</span></li></ol><div class="guide-callout"><strong>本机模式</strong><span>不配置 PostgreSQL 时仍可创作和游玩，地图脚本数据保存为本机文件；玩家管理与登录门户不会启用。</span></div>`,
    services: `<div class="guide-heading"><span>系统组成</span><h2>服务与端口</h2><p>每个模块职责独立，可以从总览直接打开。</p></div><div class="service-table"><div class="table-head"><span>服务</span><span>默认地址</span><span>用途</span></div><div><b>Creator</b><code>127.0.0.1:3002</code><span>地图和项目资源创作</span></div><div><b>Play</b><code>:3000</code><span>玩家游玩与作品管理</span></div><div><b>玩家管理</b><code>:3213</code><span>账号、角色、封禁和审计</span></div><div><b>登录门户</b><code>:3214</code><span>示例登录与注册入口</span></div><div><b>VOXA</b><code>127.0.0.1:3001</code><span>模型创建和编辑</span></div></div>${helpSection('访问范围', '<p>Creator 和 VOXA 固定只监听本机。Play、玩家管理与登录门户可在“访问设置”中开放到局域网或公网。公网部署建议在前方配置 HTTPS 反向代理。</p>')}`,
    configuration: `<div class="guide-heading"><span>安装配置</span><h2>配置说明</h2><p>常用参数已分为三个类别。</p></div><div class="guide-grid">${helpSection('PostgreSQL · 选填', helpList(['填写地址后启用玩家管理和登录门户', '地图脚本数据使用 PostgreSQL 数据空间', '留空时切换到本机文件存储', 'SSL 由数据库服务端要求决定']))}${helpSection('Redis · 选填', helpList(['业务 DB 与缓存 DB 应使用不同编号', '留空时自动使用本机缓存', 'Redis 不保存唯一业务数据，可随时重建']))}${helpSection('访问设置', helpList(['127.0.0.1：仅当前电脑访问', '0.0.0.0：允许外部设备连接', '公开地址填写玩家实际访问的 IP 或域名']))}${helpSection('运行容量', helpList(['游玩运行时：同时活跃的地图/房间', '编辑运行时：同时打开的编辑项目', '创作预览：编辑器内运行实例', '上限越高，占用的内存越多']))}</div>`,
    workflow: `<div class="guide-heading"><span>日常使用</span><h2>创作与游玩</h2><p>Creator 管理源工程，Play 运行导出的游戏包。</p></div><div class="workflow-columns">${helpSection('Creator', helpList(['新建或导入地图工程', '主地图下可创建共享资源的副地图', '项目模型只属于当前项目，不修改本地模型原件', '共享脚本、图片、音频和角色在地图组内同步', '通过 VOXA 编辑模型后返回项目继续使用', '导出单地图工程、地图组工程或游戏包']))}${helpSection('Play', helpList(['导入 Creator 导出的游戏包', '玩家通过 /p/地图访问 ID 进入作品', '主地图负责地图组入口，副地图通常通过传送进入', '后台预热可降低首位玩家进入等待时间', '游玩包是只读运行快照，不作为源工程编辑']))}</div><div class="guide-callout"><strong>备份建议</strong><span>重要修改前导出地图组工程；游戏包用于部署，不能代替源工程备份。</span></div>`,
    players: `<div class="guide-heading"><span>需要 PostgreSQL</span><h2>玩家与权限</h2><p>玩家身份由独立玩家服务统一管理。</p></div><div class="guide-grid">${helpSection('账号资料', helpList(['记录用户名、显示名、注册与登录时间', '记录可信代理后的注册 IP、最后登录 IP', '支持绑定兼容用神岛 ID（boxId）', '可查看会话、设备与登录历史']))}${helpSection('权限层级', helpList(['服主：管理权限、管理员及账号删除', '管理员：按服主授予的权限执行管理', '协管员：处理指定范围的玩家事务', '玩家：进入游戏并访问自己的数据']))}${helpSection('安全操作', helpList(['支持临时封禁和永久封禁', '支持账号、IP 与设备维度封禁', '强制下线会撤销会话并通知运行时', '管理 API 必须携带服主配置的密钥']))}${helpSection('登录门户', '<p>内置门户用于快速部署和测试。正式运营时，服主也可以自行开发登录页，通过玩家服务公开 API 完成注册、登录和账号维护。</p>')}</div>`,
    operations: `<div class="guide-heading"><span>维护指南</span><h2>运维与排障</h2><p>先看状态，再看日志，最后检查外部依赖。</p></div><div class="diagnostic-list"><div><b>服务无法启动</b><span>确认 Docker Desktop 正在运行、磁盘空间充足，镜像架构与电脑一致。</span></div><div><b>无法进入地图</b><span>查看 Creator/Play 日志，检查运行时上限、地图资源完整性与脚本内存。</span></div><div><b>数据库不可用</b><span>检查安全组、防火墙、5432 端口、账号密码和 SSL 设置；可临时清空地址切回本机模式。</span></div><div><b>Redis 不可用</b><span>检查 6379 端口和密码；也可留空使用本机缓存，不会影响源工程。</span></div><div><b>外部设备打不开</b><span>监听地址设为 0.0.0.0，公开地址填写服务器 IP，并开放对应端口。</span></div><div><b>升级镜像</b><span>停止服务，备份应用数据目录，替换离线包后重新打开管理器；已有数据不会被程序目录覆盖。</span></div></div><div class="guide-callout"><strong>日志</strong><span>“运行日志”集中显示最近 500 行容器输出。反馈问题时，请同时提供服务名、发生时间和相关错误段。</span></div>`,
  }
  return chapters[state.helpSection] || chapters.welcome
}

function help() {
  return `<header><div><h1>帮助手册</h1></div></header><div class="help-layout"><nav class="help-nav">${helpChapters.map(helpNav).join('')}</nav><article class="guide-content">${helpContent()}</article></div>`
}

function render() {
  const content =
    state.page === 'setup'
      ? setup()
      : state.page === 'logs'
        ? logs()
        : state.page === 'help'
          ? help()
          : overview()
  document.querySelector('#app').innerHTML = shell(content)
  bindEvents()
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach((node) =>
    node.addEventListener('click', () => {
      state.page = node.dataset.page
      render()
    }),
  )
  document.querySelector('#refresh')?.addEventListener('click', refreshStatus)
  document.querySelector('#start')?.addEventListener('click', () => runAction('start_services'))
  document.querySelector('#stop')?.addEventListener('click', () => runAction('stop_services'))
  document.querySelector('#load-logs')?.addEventListener('click', loadLogs)
  document
    .querySelector('#copy-logs')
    ?.addEventListener('click', () => navigator.clipboard.writeText(state.logs))
  document
    .querySelectorAll('[data-open]')
    .forEach((node) =>
      node.addEventListener('click', () => invoke('open_service', { url: node.dataset.open })),
    )
  document.querySelector('#setup-form')?.addEventListener('submit', saveAndInstall)
  document.querySelectorAll('[data-setup-section]').forEach((node) =>
    node.addEventListener('click', () => {
      captureSetupForm()
      state.setupSection = node.dataset.setupSection
      render()
    }),
  )
  document.querySelectorAll('[data-help-section]').forEach((node) =>
    node.addEventListener('click', () => {
      state.helpSection = node.dataset.helpSection
      render()
    }),
  )
}

function captureSetupForm() {
  const form = document.querySelector('#setup-form')
  if (!form) return
  const values = Object.fromEntries(new FormData(form).entries())
  state.config = { ...state.config, ...values, databaseSsl: form.databaseSsl.checked }
}

async function refreshStatus() {
  try {
    state.status = await invoke('get_system_status')
    state.config = await invoke('get_install_config')
  } catch (error) {
    state.status = {
      dockerReady: false,
      dockerMessage: String(error),
      configured: false,
      services: [],
    }
  }
  render()
}

async function runAction(command, payload = {}) {
  if (state.busy) return
  state.busy = true
  state.error = ''
  render()
  try {
    await invoke(command, payload)
  } catch (error) {
    state.progress = { stage: 'error', message: String(error), percent: 100 }
    state.error = String(error)
  } finally {
    state.busy = false
    await refreshStatus()
  }
}

async function saveAndInstall(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const config = Object.fromEntries(form.entries())
  config.databaseSsl = form.has('databaseSsl')
  config.playRuntimes = Number(config.playRuntimes)
  config.creatorEditRuntimes = Number(config.creatorEditRuntimes)
  config.creatorPlayRuntimes = Number(config.creatorPlayRuntimes)
  config.redisDb = Number(config.redisDb)
  config.storageCacheRedisDb = Number(config.storageCacheRedisDb)
  state.config = {
    ...state.config,
    ...config,
    hasDatabasePassword: Boolean(config.databasePassword) || state.config?.hasDatabasePassword,
    hasRedisPassword: Boolean(config.redisPassword) || state.config?.hasRedisPassword,
  }
  await runAction('install_and_start', { config })
}

async function loadLogs() {
  try {
    state.logs = await invoke('get_logs')
  } catch (error) {
    state.logs = String(error)
  }
  render()
}

listen('install-progress', ({ payload }) => {
  state.progress = payload
  if (state.busy) render()
})

refreshStatus()
