import {
  dockerPlatform,
  openExternal,
  selectBackup,
  exportBackupFile,
  exportDiagnosticsFile,
  hasWebManagerToken,
  invoke,
  isWebManager,
  setWebManagerToken,
} from './transport.js'
import { listen } from './transport.js'
import './styles.css'

const services = [
  ['creator', '地图创作工具 / 创作作品管理', '地图编辑服务', 'creatorPort', 3127, '/'],
  ['voxa', '模型创作工具', '模型编辑服务', 'voxaPort', 3123, '/'],
  ['play', '游玩端', '作品游玩与服主管理', 'playPort', 3121, '/'],
  ['player-service', '账号服务', '账号、权限与封禁', 'playerServicePort', 3124, '/'],
  ['player-auth-portal', '登录页面', '玩家登录与注册', 'authPortalPort', 3125, '/'],
]

const managedServices = [
  ['managed-postgres', 'PostgreSQL', '玩家、权限与地图数据', 'postgresql'],
  ['managed-redis', 'Redis', '缓存与运行时协调', 'redis'],
]

const startPrompts = [
  '开始你的创作了吗？',
  '准备好让别人来游玩了吗？',
  '选择一个端，开始今天的工作吧。',
  '地图和模型，等你启动。',
]

const THEME_KEY = 'box-manager-theme'
const OVERVIEW_POLL_MS = 10000
const OVERVIEW_HIDDEN_POLL_MS = 60000
const PERFORMANCE_POLL_MS = 5000
const PERFORMANCE_HIDDEN_POLL_MS = 30000
const PROJECT_RUNTIME_POLL_MS = 3000
const PROJECT_RUNTIME_HIDDEN_POLL_MS = 10000
const PROJECT_RUNTIME_EMPTY_POLL_MS = 10000
const themes = [
  ['system', '跟随系统'],
  ['light', '亮色'],
  ['dark', '暗色'],
]

const UNLICENSED_PAGES = new Set(['license', 'about', 'web-login'])

const numericConfigFields = [
  'playRuntimes',
  'creatorEditRuntimes',
  'creatorPlayRuntimes',
  'creatorEditPrewarmRuntimes',
  'playPrewarmRuntimes',
  'playerLimit',
  'scriptMemoryMb',
  'runtimeIdleMinutes',
  'runtimeStartTimeoutMinutes',
  'teleportMaxRooms',
  'teleportRoomIdleMinutes',
  'databasePoolSize',
  'storageCacheRedisTtl',
  'playerServiceMemoryMb',
  'playerServiceCpuLimit',
  'authPortalMemoryMb',
  'authPortalCpuLimit',
  'creatorMemoryMb',
  'creatorCpuLimit',
  'playMemoryMb',
  'playCpuLimit',
  'redisDb',
  'storageCacheRedisDb',
  'autoBackupIntervalMinutes',
  'autoBackupRetentionCount',
  'autoBackupRetentionDays',
  'playPort',
  'voxaPort',
  'creatorPort',
  'playerServicePort',
  'authPortalPort',
]

const state = {
  page: 'overview',
  setupSection: 'data',
  busy: false,
  status: null,
  config: null,
  about: null,
  legal: null,
  license: null,
  licenseDeviceVisible: false,
  legalLoading: false,
  connectionTests: {},
  environmentFile: '',
  environmentFileLoaded: false,
  environmentFileSaving: false,
  environmentMessage: '',
  diagnosticPath: '',
  backups: [],
  backupsLoading: false,
  backupMessage: '',
  backupDialog: null,
  runtimeDestroyDialog: null,
  managedDatabaseInfo: null,
  managedRedisInfo: null,
  dataStorage: null,
  performance: null,
  performanceLoading: false,
  performanceError: '',
  projectRuntimes: { creator: [], play: [] },
  projectRuntimesLoading: false,
  projectRuntimesLoaded: false,
  projectRuntimesError: '',
  runtimeExpandedProjects: new Set(),
  runtimeCatalogTab: 'creator',
  theme: localStorage.getItem(THEME_KEY) || 'system',
  themeMenuOpen: false,
  startMenuOpen: false,
  startScopes: new Set(),
  startPrompt: '',
  serviceMenu: '',
  legalDialog: '',
  playAccessMode: '',
  ownerSecrets: null,
  ownerSecretsVisible: false,
  error: '',
  notice: '',
  dockerCheck: null,
  progress: { stage: 'idle', message: '等待操作', percent: 0 },
}

const icons = {
  'home': '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  'settings':
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.33.72.6 1 .3.3.7.44 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/>',
  'performance': '<path d="M4 19V9M10 19V5M16 19v-7M22 19V8"/><path d="M2 19h22"/>',
  'info': '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
  'archive': '<path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6M9 15h6"/>',
  'play': '<path d="m8 5 11 7-11 7Z"/>',
  'stop': '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  'refresh': '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
  'external': '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v6H5V6h6"/>',
  'sun':
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
  'moon': '<path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/>',
  'device': '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  'chevron': '<path d="m9 7 5 5-5 5"/>',
  'check': '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
  'copy':
    '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  'eye':
    '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  'eye-off':
    '<path d="m3 3 18 18M10.6 6.2A10.3 10.3 0 0 1 12 6c6 0 9.5 6 9.5 6a17.3 17.3 0 0 1-3 3.7M6.2 6.2A17.2 17.2 0 0 0 2.5 12s3.5 6 9.5 6c1.3 0 2.5-.3 3.5-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  'logout': '<path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/>',
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

function hasValidLicense() {
  return state.license?.valid === true
}

function normalizeLicensedPage() {
  if (isWebManager() && !hasWebManagerToken()) {
    if (!['web-login', 'about'].includes(state.page)) state.page = 'web-login'
    state.ownerSecrets = null
    state.ownerSecretsVisible = false
    return
  }
  if (!hasValidLicense() && !UNLICENSED_PAGES.has(state.page)) state.page = 'license'
  if (state.page === 'runtimes' && state.status && !runtimeServiceRunning()) state.page = 'overview'
}

function runtimeServiceRunning() {
  return Boolean(
    state.status?.services?.some(
      (service) => ['creator', 'play'].includes(service.name) && service.running,
    ),
  )
}

function applyTheme(theme) {
  state.theme = themes.some(([id]) => id === theme) ? theme : 'system'
  if (state.theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = state.theme
  localStorage.setItem(THEME_KEY, state.theme)
}

function themeControl() {
  const currentLabel = themes.find(([id]) => id === state.theme)?.[1] || '跟随系统'
  const themeIcon = (id) => icon(id === 'system' ? 'device' : id === 'light' ? 'sun' : 'moon')
  return `<div class="theme-picker">
    ${
      state.themeMenuOpen
        ? `<div class="theme-menu" role="menu" aria-label="界面主题">${themes
            .map(
              ([id, label]) =>
                `<button class="${state.theme === id ? 'active' : ''}" data-theme-choice="${id}" role="menuitemradio" aria-checked="${state.theme === id}">${themeIcon(id)}<span>${label}</span><i></i></button>`,
            )
            .join('')}</div>`
        : ''
    }
    <button class="theme-trigger ${state.themeMenuOpen ? 'open' : ''}" id="theme-trigger" aria-expanded="${state.themeMenuOpen}">${themeIcon(state.theme)}<span>外观</span><small>${currentLabel}</small>${icon('chevron')}</button>
  </div>`
}

function shell(content) {
  const webLoginRequired = isWebManager() && !hasWebManagerToken()
  const licensedNavigation = hasValidLicense()
    ? `${navItem('overview', 'home', '服务总览')}${runtimeServiceRunning() ? navItem('runtimes', 'play', '地图容器管理') : ''}${navItem('setup', 'settings', '数据配置')}${navItem('backups', 'archive', '数据与备份')}`
    : ''
  const primaryNavigation = webLoginRequired
    ? navItem('web-login', 'device', '管理登录')
    : `${licensedNavigation}${navItem('license', 'device', '许可证管理')}`
  return `<div class="shell" data-rendered-page="${state.page}">
    <aside>
      <div class="brand"><img class="brand-mark" src="/logo512.png" alt="BOX3 Engine"/><div><strong>BOX3 Engine</strong><span>本地部署</span></div></div>
      <nav>${primaryNavigation}${navItem('about', 'info', '关于')}</nav>
      <div class="sidebar-bottom">${isWebManager() && hasWebManagerToken() ? `<button class="web-logout" id="web-logout">${icon('logout')}<span>退出管理</span></button>` : ''}${themeControl()}${hasValidLicense() ? `<div class="sidebar-foot"><span class="status-dot ${state.status?.dockerReady ? 'good' : ''}"></span><span>${state.status?.dockerReady ? 'Docker 已连接' : 'Docker 未连接'}</span></div>` : ''}</div>
    </aside>
    <main>${content}</main>
    ${feedbackToast()}
    ${state.startMenuOpen ? startScopeDialog() : ''}
    ${state.backupDialog ? backupConfirmDialog() : ''}
    ${state.runtimeDestroyDialog ? runtimeDestroyDialog() : ''}
    ${state.legalDialog ? legalDocumentDialog() : ''}
  </div>`
}

function feedbackToast() {
  let type = ''
  let title = ''
  let message = ''
  if (state.error) {
    type = 'danger'
    title = '操作未完成'
    message = state.error
  } else if (state.notice) {
    type = 'success'
    title = '操作完成'
    message = state.notice
  } else if (state.backupMessage) {
    type = 'success'
    title = '数据与备份'
    message = state.backupMessage
  } else if (state.performanceError) {
    type = 'danger'
    title = '性能数据读取失败'
    message = state.performanceError
  } else if (state.diagnosticPath) {
    type = 'success'
    title = '诊断包已生成'
    message = state.diagnosticPath
  }
  if (!message) return ''
  if (type === 'success') {
    return `<div class="toast success" role="status"><span>${title}</span><small>${escapeHtml(message)}</small><button type="button" data-dismiss-feedback aria-label="关闭提示">×</button></div>`
  }
  return `<div class="toast danger" role="status"><span>${title}</span><small>${escapeHtml(message)}</small><button type="button" data-dismiss-feedback aria-label="关闭提示">×</button></div>`
}

function dismissFeedback() {
  clearFeedback()
  render()
}

function clearFeedback() {
  state.error = ''
  state.notice = ''
  state.backupMessage = ''
  state.performanceError = ''
  state.diagnosticPath = ''
  state.environmentMessage = ''
}

function startScopeDialog() {
  return `<div class="dialog-backdrop" data-start-dialog-dismiss><section class="start-dialog" role="dialog" aria-modal="true" aria-labelledby="start-dialog-title"><header><div><h2 id="start-dialog-title">启动服务</h2><p>选择本次需要运行的服务。</p></div><button class="dialog-close" id="cancel-start" aria-label="取消">×</button></header><div class="start-scope-list"><button data-start-scope="all"><strong>全部服务</strong><span>创作端、游玩与已配置的附属服务</span></button><button data-start-scope="play"><strong>游玩端</strong><span>Play 与游玩所需服务</span></button><button data-start-scope="creator"><strong>创作端</strong><span>地图创作工具及作品管理、模型创作工具与创作所需服务</span></button></div></section></div>`
}

function backupConfirmDialog() {
  const dialog = state.backupDialog
  const restoring = dialog.action === 'restore'
  const title = restoring ? '恢复此备份？' : '删除此备份？'
  const description = restoring
    ? '恢复会停止全部服务，并替换当前地图、游玩包和 VOXA 本地资源。当前未备份的修改将丢失。'
    : '删除后无法恢复此备份文件。'
  const confirmLabel = restoring ? '确认恢复' : '确认删除'
  return `<div class="dialog-backdrop" data-backup-dialog-dismiss><section class="start-dialog backup-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-dialog-title"><header><div><h2 id="backup-dialog-title">${title}</h2><p>${description}</p></div></header><div class="backup-dialog-file"><span>备份文件</span><strong>${escapeHtml(dialog.name)}</strong></div><div class="dialog-actions"><button class="button" id="cancel-backup-action-secondary">取消</button><button class="button ${restoring ? 'primary' : 'danger'}" id="confirm-backup-action">${confirmLabel}</button></div></section></div>`
}

function runtimeDestroyDialog() {
  const dialog = state.runtimeDestroyDialog
  const target = dialog.roomId ? `房间 ${dialog.roomId}` : '这个作品的运行实例'
  return `<div class="dialog-backdrop runtime-destroy-backdrop" data-runtime-destroy-dialog-dismiss><section class="start-dialog runtime-destroy-dialog" role="dialog" aria-modal="true" aria-labelledby="runtime-destroy-title"><header><div><h2 id="runtime-destroy-title">销毁运行实例？</h2><p>将销毁${escapeHtml(target)}，不会删除作品数据。</p></div></header><div class="dialog-actions"><button class="button" id="cancel-runtime-destroy-secondary">取消</button><button class="button danger" id="confirm-runtime-destroy">确认销毁</button></div></section></div>`
}

function legalDocumentDialog() {
  const legal = state.legal || {}
  const title = '发行许可证'
  const meta = legal.licenseName || 'BOX3 Engine 本地部署用户许可协议'
  const document = legal.licenseText || '正在读取许可证全文…'
  return `<div class="dialog-backdrop legal-dialog-backdrop" data-legal-dialog-dismiss><section class="legal-dialog" role="dialog" aria-modal="true" aria-labelledby="legal-dialog-title"><header><div><h2 id="legal-dialog-title">${title}</h2><p>${escapeHtml(meta)}</p></div><button class="dialog-close" id="close-legal-dialog" aria-label="关闭">×</button></header><pre class="legal-document-content">${escapeHtml(document)}</pre></section></div>`
}

function formatMetric(value, suffix = '%') {
  return `${Number(value || 0).toFixed(1)}${suffix}`
}

function performance() {
  const samples = state.performance?.services || []
  const running = samples.filter((service) => service.running)
  const totalCpu = running.reduce((sum, service) => sum + service.cpuPercent, 0)
  const sampledAt = state.performance?.sampledAt
    ? new Date(Number(state.performance.sampledAt)).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '尚未采样'
  return `<header><div><h1>性能监控</h1></div><div class="header-actions"><button class="button" data-page="overview">返回总览</button></div></header>
    <section class="metric-grid"><article><span>运行服务</span><strong>${running.length} / ${samples.filter((service) => service.enabled).length || 0}</strong><small>已启用服务</small></article><article><span>总 CPU</span><strong>${formatMetric(totalCpu)}</strong><small>当前容器合计</small></article><article><span>内存状态</span><strong>${running.length ? '正常采样' : '—'}</strong><small>${sampledAt}</small></article></section>
    <section class="performance-panel"><div class="performance-head"><span>服务</span><span>CPU</span><span>内存</span><span>占用率</span><span>进程</span><span>状态</span></div>${services
      .map(([id, name]) => {
        const item = samples.find((sample) => sample.name === id)
        const enabled = item?.enabled !== false
        const memoryPercent = Math.min(100, Math.max(0, item?.memoryPercent || 0))
        return `<article class="performance-row ${enabled ? '' : 'disabled'}"><div class="performance-name"><strong>${name}</strong></div><b>${formatMetric(item?.cpuPercent)}</b><div><b>${escapeHtml(item?.memoryUsage || '0 B')}</b><small>/ ${escapeHtml(item?.memoryLimit || '—')}</small></div><div class="memory-meter"><span><i style="width:${memoryPercent}%"></i></span><b>${formatMetric(memoryPercent)}</b></div><b>${item?.pids || 0}</b><span class="service-state ${item?.running ? 'running' : ''}"><i></i>${!enabled ? '未启用' : item?.running ? '运行中' : '已停止'}</span></article>`
      })
      .join('')}</section>`
}

function overview() {
  // 总览提供业务级启动入口，并将运行中的用户数据服务与本地基础设施分组展示。
  const dockerReady = state.status?.dockerReady === true
  const installed = state.status?.configured
  const allHealthy = Boolean(state.status?.allHealthy)
  const runningCount = state.status?.services?.filter((service) => service.running).length || 0
  const summaryLabel = allHealthy
    ? '运行正常'
    : installed && runningCount
      ? `${runningCount} 个服务正在运行中`
      : installed
        ? '未启动'
        : '尚未配置'
  const databaseReady =
    state.config?.databaseMode === 'external'
      ? Boolean(state.config.databaseHost)
      : Boolean(state.managedDatabaseInfo?.configured)
  const canStart = Boolean(installed && state.license?.valid && databaseReady && !state.busy)
  const runningServices = (state.status?.services || []).filter((service) => service.running)
  const environmentServiceIds = new Set(['creator', 'voxa', 'play'])
  const environmentRunning = runningServices.some((service) =>
    environmentServiceIds.has(service.name),
  )
  const action = (scope, label, detail) =>
    `<button type="button" class="overview-start-option ${state.startScopes.has(scope) ? 'selected' : ''}" data-start-scope="${scope}" aria-pressed="${state.startScopes.has(scope)}" ${canStart ? '' : 'disabled'}><span>${icon('play')}</span><strong>${label}</strong><small>${detail}</small></button>`
  const actions = !dockerReady
    ? `<div class="overview-required docker-required"><strong>Docker 服务未连接</strong><span>${dockerPlatform().hint}</span><button type="button" class="button primary" id="connect-docker" ${state.busy ? 'disabled' : ''}>${state.busy ? dockerPlatform().busy : dockerPlatform().action}</button></div>`
    : installed
      ? !databaseReady
        ? `<div class="overview-required"><strong>数据库还没有配置</strong><span>配置 PostgreSQL 后即可启动服务。</span><button type="button" class="button primary" data-page="setup">前往数据配置</button></div>`
        : state.license?.valid
          ? `${environmentRunning ? '' : `<div class="overview-start-options">${action('play', '游玩端', '启动游玩环境，供玩家进入地图')}${action('creator', '创作端', '启动创作环境，用于编辑地图和模型')}</div><button type="button" class="button primary overview-confirm-start" id="confirm-start-scopes" ${state.startScopes.size ? '' : 'disabled'}>确认启动</button>`}${runningCount ? `<button type="button" class="button overview-stop" id="stop" ${state.busy ? 'disabled' : ''}>${icon('stop')}停止所有服务</button>` : ''}`
          : `<button type="button" class="button primary" data-page="license">安装许可证后启动</button>`
      : `<button type="button" class="button primary" data-page="setup">开始配置</button>`
  const idle = Boolean(installed && !runningCount && databaseReady)
  const idlePrompt = idle
    ? state.startPrompt ||
      (state.startPrompt = startPrompts[Math.floor(Math.random() * startPrompts.length)])
    : ''
  const displayLabel = installed && !databaseReady ? '需要配置' : idle ? idlePrompt : summaryLabel
  const needsDatabase = Boolean(dockerReady && installed && !databaseReady)
  const dockerUnavailable = state.status && !dockerReady
  const overviewStatus = needsDatabase
    ? ''
    : dockerUnavailable
      ? ''
      : idle
        ? `<strong>${displayLabel}</strong>`
        : `<span class="status-dot ${allHealthy ? 'good' : ''}"></span><strong>${displayLabel}</strong>`
  const statusMarkup = overviewStatus ? `<div class="overview-status">${overviewStatus}</div>` : ''
  const userDataServiceIds = new Set(['player-service', 'player-auth-portal'])
  const infrastructureServiceIds = new Set(['managed-postgres', 'managed-redis'])
  const serviceNames = new Map(services.map(([id, name]) => [id, name]))
  serviceNames.set('managed-postgres', 'PostgreSQL')
  serviceNames.set('managed-redis', 'Redis')
  const serviceRows = (items, { openable = true, detail = '' } = {}) =>
    items
      .map((service) => {
        const name = serviceNames.get(service.name)
        if (!name) return ''
        const url = openable ? getServiceUrl(service.name) : ''
        const detailText = typeof detail === 'function' ? detail(service) : detail
        const detailMarkup = detailText
          ? `<code>${escapeHtml(detailText)}</code>`
          : '<span class="running-service-spacer" aria-hidden="true"></span>'
        return `<div class="running-service-row"><strong>${name}</strong>${detailMarkup}${url ? `<button type="button" class="button" data-open="${escapeHtml(url)}">打开</button>` : ''}</div>`
      })
      .join('')
  const environmentOrder = ['creator', 'voxa', 'play']
  const runningEnvironmentRows = serviceRows(
    environmentOrder
      .map((id) => runningServices.find((service) => service.name === id))
      .filter(Boolean),
  )
  const userDataRows = serviceRows(
    runningServices.filter((service) => userDataServiceIds.has(service.name)),
  )
  const configuredInfrastructureServices = runningServices.filter((service) => {
    if (service.name === 'managed-postgres') return state.config?.databaseMode === 'managed'
    if (service.name === 'managed-redis') return state.config?.redisMode === 'managed'
    return infrastructureServiceIds.has(service.name)
  })
  const externalInfrastructureServices = [
    state.config?.databaseMode === 'external' ? { name: 'managed-postgres', external: true } : null,
    state.config?.redisMode === 'external' ? { name: 'managed-redis', external: true } : null,
  ].filter(Boolean)
  const infrastructureRows = serviceRows(
    [...configuredInfrastructureServices, ...externalInfrastructureServices],
    {
      openable: false,
      detail: (service) => (service.external ? '外部服务' : '本机 Docker 服务'),
    },
  )
  const runningEnvironmentList = runningEnvironmentRows
    ? `<section class="running-services"><h2>运行中服务</h2><div class="running-service-list">${runningEnvironmentRows}</div></section>`
    : ''
  const userDataList = userDataRows
    ? `<section class="running-services"><h2>用户数据</h2><div class="running-service-list">${userDataRows}</div></section>`
    : ''
  const infrastructureList =
    infrastructureRows && runningCount
      ? `<section class="running-services infrastructure-services"><h2>基础设施</h2><div class="running-service-list">${infrastructureRows}</div></section>`
      : ''
  const supportLists =
    userDataList || infrastructureList
      ? `<div class="overview-support-groups ${userDataList && infrastructureList ? '' : 'single'}">${userDataList}${infrastructureList}</div>`
      : ''
  const performanceAction = runningCount
    ? `<button class="button" data-page="performance">${icon('performance')}性能</button>`
    : ''
  return `<header><div><h1>服务总览</h1></div>
    <div class="header-actions">${performanceAction}</div></header>
    ${state.busy ? progressPanel() : ''}
    <section class="overview-simple">${statusMarkup}${actions}${runningEnvironmentList}${supportLists}</section>`
}

function runtimePhase(status = {}) {
  const phase = status.phase || 'idle'
  if (phase === 'ready') return ['运行中', 'running']
  if (phase === 'starting' || phase === 'loading') return ['启动中', 'starting']
  if (phase === 'error') return ['异常', 'error']
  if (phase === 'unavailable') return ['未启动', '']
  return ['空闲', '']
}

function runtimeCell(status, projectId, mode) {
  const [labelText, stateClass] = runtimePhase(status)
  const detail =
    status?.message && !['运行时未启动', '等待启动'].includes(status.message) ? status.message : ''
  const progress = ['starting', 'loading'].includes(status?.phase)
    ? `<span class="runtime-progress"><i style="width:${Math.max(3, Math.min(100, Number(status?.percent) || 0))}%"></i></span>`
    : ''
  const metrics =
    status?.phase === 'ready'
      ? `<p class="runtime-metrics">CPU ${formatRuntimeCpu(status)} · 内存 ${status.memoryBytes ? formatRuntimeMemory(status.memoryBytes) : '—'} · ${formatRuntimeUptime(status.uptimeMs)}</p>`
      : ''
  const rooms = Array.isArray(status?.rooms) ? status.rooms : []
  const roomList = rooms.length
    ? `<div class="runtime-rooms"><strong>房间 ${rooms.length}</strong><div>${rooms
        .map(
          (room) =>
            `<span class="runtime-room ${room.active ? 'active' : ''}" title="${escapeHtml(room.roomId)}"><i></i>${escapeHtml(room.roomId.slice(0, 10))}<button type="button" class="icon-button runtime-destroy room" data-runtime-destroy="${escapeHtml(projectId)}" data-runtime-mode="${mode}" data-runtime-room="${escapeHtml(room.roomId)}" aria-label="销毁房间" title="销毁房间">${icon('stop')}</button></span>`,
        )
        .join('')}</div></div>`
    : ''
  const destroy =
    status?.phase === 'ready'
      ? `<button type="button" class="button danger runtime-destroy" data-runtime-destroy="${escapeHtml(projectId)}" data-runtime-mode="${mode}">${icon('stop')}销毁</button>`
      : ''
  return `<div class="runtime-mode"><div class="runtime-mode-info"><div class="runtime-mode-head"><span class="service-state ${stateClass}"><i></i>${labelText}</span></div>${metrics || (detail ? `<p>${escapeHtml(detail)}</p>` : '')}${roomList}${progress}</div>${destroy}</div>`
}

function formatRuntimeCpu(status = {}) {
  const cpuPercent = Number(status.cpuPercent)
  if (!Number.isFinite(cpuPercent)) return '—'
  const usedCores = Math.max(0, cpuPercent / 100)
  const availableCores = Math.max(
    1,
    Number(status.cpuCapacityCores) || Number(globalThis.navigator?.hardwareConcurrency) || 1,
  )
  const machinePercent = (usedCores / availableCores) * 100
  const usedText = usedCores >= 10 ? usedCores.toFixed(1) : usedCores.toFixed(2)
  const machineText = machinePercent >= 10 ? machinePercent.toFixed(0) : machinePercent.toFixed(1)
  return `${usedText} 核（${machineText}%）`
}

function formatRuntimeMemory(value) {
  const megabytes = Number(value) / 1024 / 1024
  return `${Math.max(1, Math.round(megabytes))} MB`
}

function formatRuntimeUptime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) / 1000))
  if (seconds < 60) return `已运行 ${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `已运行 ${minutes} 分钟`
  return `已运行 ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
}

function runtimes() {
  const catalog = state.projectRuntimes || { creator: [], play: [] }
  const creatorItems = (catalog.creator || []).filter((project) => project.edit?.phase === 'ready')
  const playItems = (catalog.play || []).filter((project) => project.play?.phase === 'ready')
  const catalogTab = state.runtimeCatalogTab === 'play' ? 'play' : 'creator'
  const items = catalogTab === 'play' ? playItems : creatorItems
  const submapsByMain = new Map()
  const mainMaps = []
  const activeProjectIds = new Set(items.map((project) => project.projectId))
  for (const project of items) {
    const isSubmap =
      project.mapRole === 'submap' ||
      (project.mainProjectId && project.mainProjectId !== project.projectId)
    if (isSubmap && activeProjectIds.has(project.mainProjectId)) {
      const submaps = submapsByMain.get(project.mainProjectId) || []
      submaps.push(project)
      submapsByMain.set(project.mainProjectId, submaps)
    } else {
      mainMaps.push(project)
    }
  }
  const runtimeCells = (project) =>
    catalogTab === 'creator'
      ? runtimeCell(project.edit, project.projectId, 'creator')
      : runtimeCell(project.play, project.projectId, 'play')
  const runtimeProject = (project, submaps = []) => {
    const expansionKey = `${catalogTab}:${project.projectId}`
    const submapSection = submaps.length
      ? `<details class="runtime-submaps" data-runtime-submaps="${escapeHtml(expansionKey)}" ${state.runtimeExpandedProjects.has(expansionKey) ? 'open' : ''}><summary><span class="runtime-submaps-title"><small>共 ${submaps.length} 张</small></span></summary><div class="runtime-submap-list">${submaps
          .map(
            (submap) =>
              `<article class="runtime-submap"><header><div><h3>${escapeHtml(submap.name || submap.projectId)}</h3><p>地图 ID：<code>${escapeHtml(submap.permanentMapId || submap.projectId)}</code></p></div></header><div class="runtime-mode-grid single">${runtimeCells(submap)}</div></article>`,
          )
          .join('')}</div></details>`
      : ''
    return `<article class="runtime-project"><header><div><h2>${escapeHtml(project.name || project.projectId)}</h2><p>地图 ID：<code>${escapeHtml(project.permanentMapId || project.projectId)}</code></p></div></header><div class="runtime-mode-grid single">${runtimeCells(project)}</div>${submapSection}</article>`
  }
  const body =
    state.projectRuntimesLoading && !items.length
      ? '<div class="runtime-empty">正在读取地图容器管理…</div>'
      : state.projectRuntimesError
        ? `<div class="runtime-empty">${escapeHtml(state.projectRuntimesError)}</div>`
        : !mainMaps.length
          ? `<div class="runtime-empty">${catalogTab === 'creator' ? '创作端当前没有地图容器管理。' : '游玩端当前没有地图容器管理。'}</div>`
          : `<div class="runtime-list">${mainMaps
              .map((project) => runtimeProject(project, submapsByMain.get(project.projectId) || []))
              .join('')}</div>`
  return `<header><div><h1>地图容器管理</h1></div></header><nav class="runtime-catalog-tabs" aria-label="运行时分类"><button type="button" data-runtime-catalog="creator" class="${catalogTab === 'creator' ? 'active' : ''}">创作端 <span>${creatorItems.length}</span></button><button type="button" data-runtime-catalog="play" class="${catalogTab === 'play' ? 'active' : ''}">游玩端 <span>${playItems.length}</span></button></nav>${body}`
}

function serviceCard([id, name, description, portKey, defaultPort], options = {}) {
  const service = state.status?.services?.find((item) => item.name === id)
  const enabled = service?.enabled !== false
  const running = service?.running
  const openable = options.openable !== false
  const url = openable ? getServiceUrl(id) : ''
  const port = portKey ? Number(state.config?.[portKey]) || defaultPort : null
  const host = portKey
    ? id === 'creator' || id === 'voxa'
      ? state.config?.creatorHost
      : state.config?.publicHost
    : ''
  const endpoint = options.endpoint || (port ? `${host || '127.0.0.1'}:${port}` : '')
  const availability = !enabled ? '需要 PostgreSQL 配置' : description
  const moreMenu =
    state.serviceMenu === id
      ? `<div class="service-more-menu">${running && url ? `<button data-copy-url="${escapeHtml(url)}">${icon('copy')}复制访问地址</button>` : ''}<button data-service-action="restart" data-service="${id}" ${!running ? 'disabled' : ''}>${icon('refresh')}重启服务</button></div>`
      : ''
  return `<article class="service-card ${enabled ? '' : 'disabled'}"><div class="service-copy"><h3>${name}</h3><p>${availability}${running && endpoint ? `<span>· ${escapeHtml(endpoint)}</span>` : ''}</p></div><span class="service-state ${running ? 'running' : ''}"><i></i>${!enabled ? '未启用' : running ? '运行中' : '已停止'}</span><div class="service-commands">${running && openable ? `<button class="service-open" data-open="${escapeHtml(url)}">打开</button>` : ''}<button class="service-action" data-service-action="${running ? 'stop' : 'start'}" data-service="${id}" ${!enabled || state.busy ? 'disabled' : ''}>${running ? '停止' : '启动'}</button><div class="service-more">${moreMenu}<button class="service-more-trigger" data-service-menu="${id}" aria-expanded="${state.serviceMenu === id}" title="更多操作">•••</button></div></div></article>`
}

function getServiceUrl(serviceId) {
  const service = services.find(([id]) => id === serviceId)
  if (!service) return ''
  const [, , , portKey, defaultPort, path] = service
  const host =
    serviceId === 'creator' || serviceId === 'voxa'
      ? state.config?.creatorHost || '127.0.0.1'
      : state.config?.publicHost || '127.0.0.1'
  const port = Number(state.config?.[portKey]) || defaultPort
  return `http://${host}:${port}${path}`
}

function progressPanel() {
  return `<div class="progress-backdrop" role="alertdialog" aria-modal="true" aria-live="polite"><section class="progress-dialog"><span class="progress-spinner" aria-hidden="true"></span><strong>正在处理</strong><p>这可能需要几分钟，请耐心等待…</p></section></div>`
}

function input(name, label, value = '', type = 'text', hint = '', required = false, limits = {}) {
  const numberLimits =
    type === 'number'
      ? `min="${limits.min ?? 0}"${limits.max === undefined ? '' : ` max="${limits.max}"`} step="${limits.step ?? 1}"`
      : ''
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${numberLimits} ${required ? 'required' : ''}/><small class="${hint ? '' : 'empty'}">${hint ? escapeHtml(hint) : '&nbsp;'}</small></label>`
}

function settingToggle(name, label, description, checked) {
  return `<label class="setting-toggle"><span><strong>${label}</strong><small>${description}</small></span><span class="config-switch"><input name="${name}" type="checkbox" ${checked ? 'checked' : ''}/><i aria-hidden="true"></i></span></label>`
}

function setupExplanation(title, items) {
  return `<details class="setup-explainer"><summary>${title}</summary><div class="setup-explainer-grid">${items.map(([name, description]) => `<div><strong>${name}</strong><span>${description}</span></div>`).join('')}</div></details>`
}

function setup() {
  const config = state.config || {}
  const databaseMode = config.databaseMode || 'managed'
  const redisMode = config.redisMode || 'disabled'
  const creatorHost = config.creatorHost || '127.0.0.1'
  const creatorAccessMode = config.creatorNetworkMode || 'local'
  const creatorPublicHost =
    creatorHost === '127.0.0.1' ||
    creatorHost === 'localhost' ||
    (config.lanIp && creatorHost === config.lanIp)
      ? ''
      : creatorHost
  const inferredPlayAccessMode =
    config.playNetworkMode ||
    (config.publicHost === '127.0.0.1' || config.publicHost === 'localhost'
      ? 'local'
      : config.lanIp && config.publicHost === config.lanIp
        ? 'lan'
        : 'public')
  const playAccessMode = state.playAccessMode || inferredPlayAccessMode
  const tab = (id, label) =>
    `<button type="button" class="setup-tab ${state.setupSection === id ? 'active' : ''}" data-setup-section="${id}">${label}</button>`
  const secretInput = (name, label, configured, hint) =>
    input(
      name,
      label,
      state.ownerSecretsVisible ? state.ownerSecrets?.[name] || '' : '',
      state.ownerSecretsVisible ? 'text' : 'password',
      state.ownerSecretsVisible
        ? '仅在本机当前页面显示；离开页面后自动隐藏'
        : config[name]
          ? '本次配置已输入，保存时会使用'
          : configured
            ? '留空保留当前密钥'
            : `首次保存时自动生成，可直接留空${hint ? ` · ${hint}` : ''}`,
    )
  const rawEnvironmentPanel = `<section class="setup-panel environment-panel ${state.setupSection === 'environment' ? 'active' : ''}" data-setup-panel="environment"><div class="config-group raw-config-group"><div class="group-title"><div><h2>原始 .env</h2><span>仅限服主使用 · 会显示密钥，请勿截图或转发</span></div><button type="button" class="text-button" id="reload-raw-environment" ${state.environmentFileSaving ? 'disabled' : ''}>重新读取</button></div><textarea id="raw-environment" class="raw-environment" spellcheck="false" ${state.environmentFileSaving ? 'disabled' : ''}>${escapeHtml(state.environmentFile)}</textarea></div>${setupExplanation(
    '配置说明：什么时候需要编辑原始 .env？',
    [
      ['适合场景', '需要调整模板中没有展示的高级参数，或排查服主部署问题时使用。'],
      ['保存生效', '保存只写入文件，不会自动重启；请回到总览重新启动受影响的服务。'],
      ['安全提醒', '这里会显示数据库密码和密钥，不要截图、提交到仓库或发送给其他人。'],
    ],
  )}</section>`
  const storagePath = state.dataStorage?.path || ''
  const dataStoragePanel = `<section class="setup-panel storage-panel ${state.setupSection === 'storage' ? 'active' : ''}" data-setup-panel="storage">
      <section class="config-group data-storage-group" aria-label="数据存储位置">
        <div class="group-title"><div><h2>${isWebManager() ? 'Linux 数据目录' : '数据目录'}</h2><span>地图、模型、构建产物和备份</span></div><button type="button" class="text-button" id="choose-data-storage" ${state.busy || !state.dataStorage ? 'disabled' : ''}>${isWebManager() ? '迁移到此目录' : '更改位置'}</button></div>
        ${isWebManager() ? `<input id="linux-data-directory" class="storage-path" type="text" value="${escapeHtml(storagePath)}" placeholder="/data/BoxEngineData" spellcheck="false"/>` : `<code class="storage-path">${escapeHtml(storagePath || '正在读取…')}</code>`}
      </section>
      ${setupExplanation('配置说明：数据目录如何迁移？', [
        ['迁移内容', '地图、模型、构建产物和备份会一并迁移。'],
        ['开始前', '请先停止全部服务；迁移完成后从服务总览重新启动。'],
        ['目录格式', isWebManager() ? '填写 Linux 服务器绝对路径，例如 /data/BoxEngineData。' : '请选择目标磁盘中的一个目录。'],
      ])}
    </section>`
  return `<header><div><h1>数据配置</h1></div></header>
    ${state.busy ? progressPanel() : ''}
    <form id="setup-form" novalidate class="${state.setupSection === 'environment' ? 'environment-mode' : ''}">
      <div class="setup-tabs">${tab('data', '数据服务')}${tab('storage', '数据存储')}${tab('network', '访问设置')}${tab('capacity', '运行容量')}${tab('backup', '地图备份')}${tab('security', '服主与安全')}${tab('environment', '原始 .env')}</div>
      <div class="setup-panels">
        <section class="setup-panel ${state.setupSection === 'data' ? 'active' : ''}" data-setup-panel="data">
          <div class="config-group"><div class="group-title"><div><h2>PostgreSQL</h2><span>保存玩家、权限与地图脚本数据</span></div>${databaseMode === 'external' ? '<button type="button" class="text-button" data-test-connection="postgresql">测试连接</button>' : ''}</div><input name="databaseMode" type="hidden" value="${databaseMode}"/><div class="database-mode-choice"><button type="button" class="${databaseMode === 'managed' ? 'active' : ''}" data-database-mode="managed"><strong>内置数据库</strong><span>启动器自动配置和维护</span></button><button type="button" class="${databaseMode === 'external' ? 'active' : ''}" data-database-mode="external"><strong>外部数据库</strong><span>连接已有的 PostgreSQL</span></button></div>${databaseMode === 'managed' ? managedServicePanel('postgresql', state.managedDatabaseInfo) : `<div class="form-grid compact three">${input('databaseHost', '地址', config.databaseHost === 'managed-postgres' ? '' : config.databaseHost, 'text', 'IP 或域名', true)}${input('databasePort', '端口', config.databasePort || '5432', 'number', '', true, { min: 1, max: 65535 })}${input('databaseName', '数据库', config.databaseName || 'box', 'text', '', true)}${input('databaseUser', '账号', config.databaseUser || 'box', 'text', '', true)}${input('databasePassword', '密码', '', 'password', config.databasePassword ? '本次配置已输入，保存时会使用' : config.hasDatabasePassword ? '留空保留原密码' : '首次保存时必填')}${input('databasePoolSize', '每运行时连接池', config.databasePoolSize ?? 10, 'number', '1–100', false, { min: 1, max: 100 })}<label class="check-field"><input name="databaseSsl" type="checkbox" ${config.databaseSsl ? 'checked' : ''}/><span>使用 SSL</span></label></div>`}</div>
          <div class="config-group"><div class="group-title"><div><h2>Redis</h2><span>可选缓存与运行时协调服务</span></div>${redisMode === 'external' ? '<button type="button" class="text-button" data-test-connection="redis">测试连接</button>' : ''}</div><input name="redisMode" type="hidden" value="${redisMode}"/><div class="database-mode-choice redis-mode-choice"><button type="button" class="${redisMode === 'disabled' ? 'active' : ''}" data-redis-mode="disabled"><strong>不启用</strong><span>保持最少依赖</span></button><button type="button" class="${redisMode === 'managed' ? 'active' : ''}" data-redis-mode="managed"><strong>内置 Redis</strong><span>启动器自动维护</span></button><button type="button" class="${redisMode === 'external' ? 'active' : ''}" data-redis-mode="external"><strong>外部 Redis</strong><span>连接已有服务</span></button></div>${redisMode === 'managed' ? managedServicePanel('redis', state.managedRedisInfo) : redisMode === 'external' ? `<div class="form-grid compact three">${input('redisHost', '地址', config.redisHost === 'managed-redis' ? '' : config.redisHost, 'text', 'IP 或域名', true)}${input('redisPort', '端口', config.redisPort || '6379', 'number', '', true, { min: 1, max: 65535 })}${input('redisPassword', '密码', '', 'password', config.redisPassword ? '本次配置已输入，保存时会使用' : config.hasRedisPassword ? '留空保留原密码' : '外部 Redis 无密码时可留空')}${input('redisDb', '业务 DB', config.redisDb ?? 0, 'number', '0–255', false, { min: 0, max: 255 })}${input('storageCacheRedisDb', '缓存 DB', config.storageCacheRedisDb ?? 1, 'number', '0–255', false, { min: 0, max: 255 })}${input('storageCacheRedisTtl', '构建缓存时间（秒）', config.storageCacheRedisTtl ?? 240, 'number', '0 表示关闭，最大 255', false, { min: 0, max: 255 })}</div>` : ''}</div>
          ${setupExplanation('配置说明：这些服务用来做什么？', [
            [
              'PostgreSQL',
              '用于保存玩家账号、权限和地图脚本等长期数据。桌面启动器可自动管理内置数据库，也可连接外部 PostgreSQL。',
            ],
            [
              'Redis',
              '用于缓存和运行时协调，可选择不启用、由启动器管理内置 Redis，或连接外部 Redis。它不是主要数据来源。',
            ],
            [
              '业务 DB / 缓存 DB',
              'Redis 中的两个逻辑空间。保持不同编号，避免业务数据和缓存互相影响。',
            ],
            ['连接池', '每个地图运行时可使用的 PostgreSQL 连接数；地图并发较多时不要盲目调高。'],
            ['构建缓存', 'Redis 中预烘焙构建结果的缓存秒数；设为 0 可关闭，推荐保持 240。'],
            [
              'SSL',
              '只有远程 PostgreSQL 要求加密连接时才勾选；不确定时按数据库服务商提供的连接要求填写。',
            ],
          ])}
        </section>
        ${dataStoragePanel}
        <section class="setup-panel ${state.setupSection === 'backup' ? 'active' : ''}" data-setup-panel="backup">
          <div class="config-group">
            <div class="group-title">
              <div><h2>自动备份</h2><span>按计划保存本地地图工程，不包含 PostgreSQL 或 Redis 数据</span></div>
              <label class="backup-switch"><input name="autoBackupEnabled" type="checkbox" ${config.autoBackupEnabled ? 'checked' : ''}/><span aria-hidden="true"></span><strong>启用</strong></label>
            </div>
            <div class="form-grid compact three">${input('autoBackupIntervalMinutes', '备份间隔（分钟）', config.autoBackupIntervalMinutes || 60, 'number', '1–10080')}${input('autoBackupRetentionCount', '每张地图保留份数', config.autoBackupRetentionCount || 24, 'number', '1–1000')}${input('autoBackupRetentionDays', '最长保留天数', config.autoBackupRetentionDays || 30, 'number', '1–3650')}</div>
          </div>
          ${setupExplanation('配置说明：自动备份会保存什么？', [
            [
              '备份范围',
              '按计划导出每个地图组工程，包含地图、资源库与地图配置；不包含 PostgreSQL、Redis 或用户账号数据。',
            ],
            [
              '保留规则',
              '每地图保留份数与最长保留天数同时生效，达到任一限制时，最早的自动备份会被清理。',
            ],
            [
              '关闭后的影响',
              '关闭后停止创建新的自动备份，不会删除已有备份；已有文件可在左侧“数据与备份”中导出、恢复或删除。',
            ],
            ['立即备份', '需要在重要修改前手动保存时，请前往“数据与备份”使用右上角的“立即备份”。'],
          ])}
        </section>
        <section class="setup-panel ${state.setupSection === 'network' ? 'active' : ''}" data-setup-panel="network"><div class="network-layout"><div class="network-primary-grid"><section class="network-service-card"><div class="network-card-heading"><h2>游玩端</h2></div><div class="access-choice"><button type="button" class="${playAccessMode === 'local' ? 'active' : ''}" data-play-network-mode="local">本机</button><button type="button" class="${playAccessMode === 'lan' ? 'active' : ''}" data-play-network-mode="lan" ${config.lanIp ? '' : 'disabled'}>局域网</button><button type="button" class="${playAccessMode === 'public' ? 'active' : ''}" data-play-network-mode="public">公网</button></div>${playAccessMode === 'public' ? input('publicHost', '公网 IP', config.publicHost) : `<input name="publicHost" type="hidden" value="${escapeHtml(config.publicHost || '127.0.0.1')}"/>`}<div class="form-grid single">${input('playPort', 'Play', config.playPort || 3121, 'number')}</div></section><section class="network-service-card"><div class="network-card-heading"><h2>创作端</h2></div><input name="creatorNetworkMode" type="hidden" value="${creatorAccessMode}"/><div class="access-choice"><button type="button" class="${creatorAccessMode === 'local' ? 'active' : ''}" data-creator-network-mode="local">本机</button><button type="button" class="${creatorAccessMode === 'lan' ? 'active' : ''}" data-creator-network-mode="lan" ${config.lanIp ? '' : 'disabled'}>局域网</button><button type="button" class="${creatorAccessMode === 'public' ? 'active' : ''}" data-creator-network-mode="public">公网</button></div>${creatorAccessMode === 'public' ? `${input('creatorHost', '公网 IP', creatorPublicHost)}<aside class="network-warning" role="note"><strong>不建议直接向公网开放创作端</strong><span>创作端可管理工程与资源，建议优先使用本机、局域网或 VPN。确需公网访问时，请配置 HTTPS 反向代理，并只授予可信账号创作者权限。</span></aside>` : `<input name="creatorHost" type="hidden" value="${escapeHtml(creatorHost)}"/>`}<div class="form-grid card-port-grid">${input('creatorPort', 'ARENA', config.creatorPort || 3127, 'number')}${input('voxaPort', 'VOXA', config.voxaPort || 3123, 'number')}</div></section></div><section class="network-service-card player-service-card"><div class="network-card-heading"><h2>账号服务</h2><span>沿用游玩端地址</span></div><div class="form-grid player-port-grid">${input('playerServicePort', '账号服务', config.playerServicePort || 3124, 'number')}${input('authPortalPort', '登录页面', config.authPortalPort || 3125, 'number')}</div></section></div>${setupExplanation(
          '配置说明：访问地址和端口有什么影响？',
          [
            [
              '创作端访问',
              '可选择本机、局域网或公网。公网模式只允许已获创作者授权的账号进入，生产环境建议使用 HTTPS 反向代理。',
            ],
            [
              '游玩访问',
              'Play、账号服务和登录页面可填写公网 IP 或域名；生产环境建议使用 HTTPS 反向代理。',
            ],
            ['端口', '每个服务使用独立端口，不能重复；修改后访问链接也会随之改变。'],
          ],
        )}</section>
        <section class="setup-panel ${state.setupSection === 'capacity' ? 'active' : ''}" data-setup-panel="capacity">
          <div class="config-group"><div class="group-title"><div><h2>实例容量</h2><span>控制同时运行的地图与单实例人数</span></div></div><div class="form-grid">${input('playRuntimes', '游玩运行时', config.playRuntimes || 8, 'number', '至少 1', false, { min: 1 })}${input('playerLimit', '单实例玩家上限', config.playerLimit || 70, 'number', '1–1000', false, { min: 1, max: 1000 })}${input('creatorEditRuntimes', '编辑运行时', config.creatorEditRuntimes || 6, 'number', '至少 1', false, { min: 1 })}${input('creatorPlayRuntimes', '创作预览', config.creatorPlayRuntimes || 4, 'number', '至少 1', false, { min: 1 })}</div></div>
          <div class="config-group"><div class="group-title"><div><h2>预热策略</h2><span>提前启动常用地图，数量不能超过对应运行时上限</span></div></div><div class="form-grid">${input('playPrewarmRuntimes', 'Play 预热', config.playPrewarmRuntimes ?? 0, 'number', '0 表示按需启动', false, { min: 0 })}${input('creatorEditPrewarmRuntimes', '编辑预热', config.creatorEditPrewarmRuntimes ?? 0, 'number', '0 表示按需启动', false, { min: 0 })}</div></div>
          <div class="config-group"><div class="group-title"><div><h2>脚本与容器资源</h2><span>内存单位为 MiB；修改后需重新创建对应容器</span></div></div><div class="form-grid three">${input('scriptMemoryMb', '单运行时脚本内存', config.scriptMemoryMb ?? 512, 'number', '128–8192 MiB', false, { min: 128, max: 8192 })}${input('playerServiceMemoryMb', '账号服务内存', config.playerServiceMemoryMb ?? 1024, 'number', '推荐 1024 MiB', false, { min: 128, max: 262144 })}${input('playerServiceCpuLimit', '账号服务 CPU', config.playerServiceCpuLimit ?? 1, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}${input('authPortalMemoryMb', '登录页面内存', config.authPortalMemoryMb ?? 128, 'number', '推荐 128 MiB', false, { min: 64, max: 262144 })}${input('authPortalCpuLimit', '登录页面 CPU', config.authPortalCpuLimit ?? 0.5, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}${input('creatorMemoryMb', 'Creator 内存', config.creatorMemoryMb ?? 6144, 'number', '推荐 6144 MiB', false, { min: 512, max: 262144 })}${input('creatorCpuLimit', 'Creator CPU', config.creatorCpuLimit ?? 4, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}${input('playMemoryMb', 'Play 内存', config.playMemoryMb ?? 4096, 'number', '推荐 4096 MiB', false, { min: 512, max: 262144 })}${input('playCpuLimit', 'Play CPU', config.playCpuLimit ?? 4, 'number', '0.1–256 核', false, { min: 0.1, max: 256, step: 'any' })}</div></div>
          <div class="config-group"><div class="group-title"><div><h2>回收与传送</h2><span>界面使用分钟，保存后自动转换为环境变量</span></div></div><div class="form-grid">${input('runtimeIdleMinutes', '运行时空闲回收（分钟）', config.runtimeIdleMinutes || 15, 'number', '1–10080')}${input('runtimeStartTimeoutMinutes', '运行时启动超时（分钟）', config.runtimeStartTimeoutMinutes || 30, 'number', '1–1440')}${input('teleportMaxRooms', 'Teleport 私有房间上限', config.teleportMaxRooms || 64, 'number', '1–1024')}${input('teleportRoomIdleMinutes', '房间空闲回收（分钟）', config.teleportRoomIdleMinutes || 15, 'number', '1–10080')}</div></div>
          ${setupExplanation('配置说明：容量和回收策略如何选择？', [
            ['游玩运行时', '同时活跃的游玩地图和传送房间数量。人数、地图数越多，需要的上限越高。'],
            ['单实例玩家', '一张地图的一个公共或私有运行实例能够同时容纳的玩家数量。'],
            ['编辑运行时', '同时打开进行编辑的地图数量；编辑器关闭后会按空闲策略回收。'],
            ['创作预览', '创作端点击运行时使用的预览实例数。'],
            [
              '预热数量',
              '提前常驻可减少首次访问等待，但会持续占用 CPU 和内存；设为 0 可按需启动。',
            ],
            ['脚本内存', '每个地图脚本运行时的独立上限，不是整个 Creator 或 Play 容器的总内存。'],
            ['运行时回收', '地图无人连接超过该时间后可被停止；再次访问时会自动启动。'],
            ['启动超时', '大型地图首次迁移和预烘焙允许等待的最长时间。'],
            ['私有房间', '限制 Teleport 可保留的私有房间数量；每个活跃房间仍占用一个游玩运行时。'],
            ['房间回收', '私有房间无人连接超过该时间后，房间 ID 与对应运行时都会失效。'],
            [
              '容量建议',
              '上限越高，Docker 可用内存需求越大。首次部署可保持默认，出现排队再逐步提高。',
            ],
          ])}</section>
        <section class="setup-panel ${state.setupSection === 'security' ? 'active' : ''}" data-setup-panel="security"><div class="config-group"><div class="group-title"><div><h2>玩家与地图权限</h2><span>关闭注册不影响已有账号登录或服主后台创建账号</span></div></div><div class="setting-toggle-list">${settingToggle('registrationEnabled', '允许新玩家注册', '关闭后登录页面不再接受自助注册', config.registrationEnabled !== false)}${settingToggle('libraryManagementEnabled', '允许网页管理地图包', '关闭后 Play 地图库只读，不能通过网页导入或删除地图包', config.libraryManagementEnabled !== false)}</div></div><div class="config-group"><div class="group-title"><div><h2>服主密钥</h2><span>首次保存配置时会自动生成；无需手动填写，修改后旧会话和旧 API 调用会失效</span></div><button type="button" class="text-button" id="toggle-owner-secrets">${state.ownerSecretsVisible ? '隐藏密钥' : '查看密钥'}</button></div><div class="form-grid three">${secretInput('playAdminToken', '服主操作令牌', config.hasPlayAdminToken, '用于 Play 服主管理接口')}${secretInput('playerAuthApiKey', '账号服务 API Key', config.hasPlayerAuthApiKey, '用于服主接入登录、注册接口')}${secretInput('permissionTokenSecret', '运行时身份密钥', config.hasPermissionTokenSecret, '用于 Creator / Play 身份签发')}</div></div>${setupExplanation(
          '配置说明：服主密钥分别做什么？',
          [
            ['自动生成', '首次保存配置时，三个密钥会自动生成；只有需要自定义时才填写新的值。'],
            ['开放注册', '关闭后新玩家不能自行注册，但已有玩家、服主和后台管理员仍可正常登录。'],
            [
              '地图包管理',
              '关闭后网页仍能展示和启动地图，但不能导入、覆盖或删除服务器上的地图包。',
            ],
            [
              '查看密钥',
              '点击“查看密钥”后仅在本机当前页面显示；切换页面或点击隐藏会立即清除显示。',
            ],
            ['服主操作令牌', '保护 Play 端的服主操作接口。'],
            ['账号服务 API Key', '供服主自建登录、注册或用户接入程序调用账号服务。'],
            ['运行时身份密钥', '用于 Creator 和 Play 之间签发、校验运行时身份。'],
            [
              '修改影响',
              '保存新密钥后，旧会话和使用旧密钥的 API 调用会失效；请安全备份，不要分享。',
            ],
          ],
        )}</section>
        ${rawEnvironmentPanel}
      </div>
      <div class="form-actions submit-actions">${state.setupSection === 'environment' ? `<button class="button primary" type="button" data-save-raw-environment ${state.environmentFileSaving ? 'disabled' : ''}>保存配置</button>` : `<button class="button primary" type="submit" ${state.busy ? 'disabled' : ''}>保存配置</button>`}</div>
    </form>`
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`
}

function formatBackupTime(value) {
  if (!value) return '未知时间'
  return new Date(Number(value) * 1000).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function backups() {
  const items = state.backups
    .map(
      (backup) =>
        `<article class="backup-row"><div><strong>${escapeHtml(backup.name)}</strong><span>${formatBackupTime(backup.modifiedAt)} · ${formatBytes(backup.sizeBytes)}</span></div><div class="backup-actions"><button class="button" data-export-backup="${escapeHtml(backup.path)}" ${state.busy ? 'disabled' : ''}>导出</button><button class="button" data-backup-action="restore" data-backup-path="${escapeHtml(backup.path)}" data-backup-name="${escapeHtml(backup.name)}" ${state.busy ? 'disabled' : ''}>恢复</button><button class="button danger" data-backup-action="delete" data-backup-path="${escapeHtml(backup.path)}" data-backup-name="${escapeHtml(backup.name)}" ${state.busy ? 'disabled' : ''}>删除</button></div></article>`,
    )
    .join('')
  return `<header><div><h1>数据与备份</h1></div><div class="header-actions"><button class="button" id="refresh-backups" ${state.backupsLoading || state.busy ? 'disabled' : ''}>${icon('refresh')}刷新</button><button class="button" id="import-backup" ${state.backupsLoading || state.busy ? 'disabled' : ''}>导入备份</button><button class="button primary" id="create-backup" ${state.backupsLoading || state.busy ? 'disabled' : ''}>${icon('archive')}立即备份</button></div></header>
    <section class="backup-list">${state.backupsLoading ? '<div class="empty-backup"><strong>正在读取备份…</strong></div>' : items || '<div class="empty-backup"><strong>尚无本地备份</strong><span>重要修改前可点击右上角“立即备份”。</span></div>'}</section>`
}

function licenseManagement() {
  const license = state.license || {}
  const statusLabel = license.valid ? '有效' : license.installed ? '不可用' : '未安装'
  const deviceId = license.deviceId || '读取中'
  const maskedDeviceId =
    deviceId.length > 18 ? `${deviceId.slice(0, 12)}***${deviceId.slice(-6)}` : deviceId
  const shownDeviceId = state.licenseDeviceVisible ? deviceId : maskedDeviceId
  const details = license.valid
    ? `<dl class="license-facts"><div><dt>许可证</dt><dd>${escapeHtml(license.licenseId)}</dd></div><div><dt>起始时间</dt><dd>${escapeHtml(formatBeijingBuildTime(license.issuedAt))}</dd></div><div><dt>到期时间</dt><dd>${escapeHtml(formatBeijingBuildTime(license.expiresAt))}</dd></div><div><dt>使用范围</dt><dd>仅限个人学习和非商业用途</dd></div></dl>`
    : ''
  return `<header class="license-header"><div><h1>许可证管理 <span class="license-state ${license.valid ? 'valid' : ''}">${statusLabel}</span></h1></div></header><section class="license-page">
    <article class="license-panel">
      <div class="license-status-row"><div class="license-status-main"><div><strong>个人学习许可证</strong></div><p>仅限个人学习、测试；不可商业使用或二次分发。</p></div><button class="license-group-link" type="button" data-open-community-group>申请个人学习许可证 ${icon('chevron')}</button></div>${details}
      <section class="license-section"><div class="license-device"><div><span>设备 ID</span><code class="${state.licenseDeviceVisible ? 'revealed' : ''}">${escapeHtml(shownDeviceId)}</code></div><div class="license-device-actions"><button class="icon-button" id="toggle-license-device" aria-label="${state.licenseDeviceVisible ? '隐藏设备 ID' : '显示设备 ID'}" title="${state.licenseDeviceVisible ? '隐藏设备 ID' : '显示设备 ID'}" ${license.deviceId ? '' : 'disabled'}>${icon(state.licenseDeviceVisible ? 'eye-off' : 'eye')}</button><button class="button" id="copy-license-device" ${license.deviceId ? '' : 'disabled'}>${icon('copy')}复制</button></div></div></section>
      <section class="license-section license-import"><label class="license-token-label" for="license-token">许可证密钥</label><textarea id="license-token" class="license-token-input" rows="5" placeholder="请粘贴许可证密钥" spellcheck="false"></textarea><button class="button primary" id="install-license" ${state.busy ? 'disabled' : ''}>验证并激活</button></section>
    </article>
  </section>`
}

function about() {
  const info = state.about || {}
  const legal = state.legal || {}
  const managementAvailable = !isWebManager() || hasWebManagerToken()
  // Add later releases at the top. The about page deliberately keeps this
  // public-facing: no internal URLs, credentials, or implementation details.
  const releaseNotes = [
    {
      version: '0.1.1',
      date: '2026 年 9 月',
      summary: '部署与数据兼容更新',
      items: [
        '优化服务总览分组展示，支持外部数据服务状态显示并验证数据库连接。',
        '新增首次安装向导，集中完成 Docker、许可证与数据服务配置。',
        '取消玩家注册次数限制，保留登录失败保护。',
        '修复无作品时打开工程运行时导致启动器卡死的问题。',
        '数据空间兼容 BOXES PostgreSQL 表结构并优化历史数据读取。',
        '新增用户 Key 绑定同步，并修复本地运行时身份与导出弹框标题显示问题。',
        '修复登录页面通过服务器 IP、局域网地址或域名访问时误报请求来源的问题。',
        '桌面启动器支持将地图、模型与备份数据迁移到自定义目录。',
      ],
    },
    {
      version: '0.1.0',
      date: '2026 年 9 月 4 日',
      summary: '本地部署版首次发布',
      items: [
        '创作端与游玩端分离部署：创作者编辑工程，玩家只运行已发布的游玩包。',
        '支持地图工程、游玩包和 VOXA 模型工程的导入、导出与本地备份。',
        '支持地图组与传送房间；同一作品可由主地图和多个独立副地图组成。',
        '模型、皮肤和动画可通过 VOXA 本地保存，并在创作和游玩中使用。',
        '提供账号服务与 PostgreSQL 数据空间，保存账号、权限、会话和地图脚本持久数据。',
        '提供桌面启动器与 Linux Web 管理端，集中管理服务、端口、数据和备份。',
      ],
    },
  ]
  const values = [
    ['启动器版本', info.applicationVersion || (managementAvailable ? '读取中' : '登录后查看')],
    ['引擎开发', '深圳奇梦岛科技有限公司'],
    ['构建时间', formatBeijingBuildTime(info.buildCreatedAt)],
  ]
  const serviceImages = Array.isArray(info.serviceImages) ? info.serviceImages : []
  const imageRows = serviceImages.length
    ? serviceImages
        .map(
          (service) => `<details class="about-image-row">
            <summary><span class="about-image-summary"><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.tag)} · ${escapeHtml(service.platform)} · ${escapeHtml(formatBeijingBuildTime(service.createdAt))}</small></span><span class="about-image-disclosure">详情</span></summary>
            <dl class="about-image-meta">
              <div><dt>镜像名称</dt><dd>${escapeHtml(service.image)}</dd></div>
              <div><dt>镜像标识</dt><dd>${escapeHtml(service.imageId)}</dd></div>
              <div><dt>构建提交</dt><dd>${escapeHtml(service.sourceRevision || '未知')}</dd></div>
              <div><dt>构建来源</dt><dd>${escapeHtml(formatBuildSource(service.buildSource))}</dd></div>
            </dl>
          </details>`,
        )
        .join('')
    : `<div class="about-image-empty">${managementAvailable ? '正在读取组件镜像信息…' : '登录管理平台后可查看组件镜像信息。'}</div>`
  const changelogRows = releaseNotes
    .map(
      (release, index) => `<details class="about-changelog-row" ${index === 0 ? 'open' : ''}>
        <summary>
          <span class="about-changelog-summary"><strong>v${escapeHtml(release.version)}</strong><small>${escapeHtml(release.date)} · ${escapeHtml(release.summary)}</small></span>
          <span class="about-image-disclosure">详情</span>
        </summary>
        <ul class="about-changelog-items">${release.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </details>`,
    )
    .join('')

  const protectedDocuments = managementAvailable
    ? `<button class="about-document-row" id="open-community-group"><span><strong>服主交流QQ群：1107448537</strong><small>加入交流群，与其他服主交流部署与运营经验。</small></span><em>加入</em>${icon('external')}</button><button class="about-document-row" id="export-about-diagnostics" ${state.busy ? 'disabled' : ''}><span><strong>导出脱敏诊断包</strong><small>包含服务状态与日志，不包含密码、密钥或 API Key。</small></span><em>导出</em>${icon('archive')}</button>`
    : ''
  const licenseDocument = `<button class="about-document-row" data-open-legal-document="license"><span><strong>发行许可证</strong><small>${escapeHtml(legal.licenseName || '正在读取许可证信息')}</small></span><em>查看全文</em>${icon('chevron')}</button>`
  return `<header><div><h1>关于</h1></div></header><section class="about-page">
    <article class="about-release-card"><dl class="about-release-facts">${values.map(([label, value, title = value]) => `<div><dt>${label}</dt><dd title="${escapeHtml(title || '')}">${escapeHtml(value)}</dd></div>`).join('')}</dl></article>
    ${managementAvailable ? `<article class="about-card"><div class="about-card-heading"><h2>更新日志</h2></div><div class="about-changelog-list">${changelogRows}</div></article>` : ''}
    ${managementAvailable ? `<article class="about-card"><div class="about-card-heading"><h2>服务组件</h2></div><div class="about-image-list">${imageRows}</div></article>` : ''}
    <article class="about-card"><div class="about-card-heading"><h2>${managementAvailable ? '社区与许可' : '许可证'}</h2></div><div class="about-document-list">${protectedDocuments}${licenseDocument}</div></article>
  </section>`
}

function formatBeijingBuildTime(value) {
  if (!value || value === '未知' || value === 'unknown') return '未知'
  const buildTime = new Date(value)
  if (Number.isNaN(buildTime.getTime())) return value
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(buildTime)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: part }) => [type, part]),
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

function formatBuildSource(value) {
  if (value === 'local-dirty') return '本地测试构建（含未提交修改）'
  if (value === 'local') return '本地构建'
  if (value === 'github-actions') return 'GitHub Actions 构建'
  return value || '未知'
}

function managedServicePanel(service, info) {
  const isDatabase = service === 'postgresql'
  const label = isDatabase ? 'PostgreSQL 16' : 'Redis 7'
  if (!info?.imageAvailable) {
    return `<div class="managed-install-card"><strong>尚未安装 ${label}</strong><button type="button" class="button primary" data-install-managed="${service}" ${state.busy ? 'disabled' : ''}>立即下载</button></div>`
  }
  if (!info?.configured) {
    return `<div class="managed-install-card"><strong>内置 ${label} 已下载</strong><button type="button" class="button primary" data-install-managed="${service}" ${state.busy ? 'disabled' : ''}>启用并启动</button></div>`
  }
  const fields = [
    ['地址', info.host],
    ['端口', info.port],
    ...(isDatabase
      ? [
          ['数据库', info.database],
          ['账号', info.user],
        ]
      : [
          ['业务 DB', info.database],
          ['缓存 DB', '1'],
        ]),
    ['密码', info.password],
  ]
  return `<div class="managed-connection-card"><div class="managed-connection-heading"><div><span class="managed-state ${info.running ? 'running' : 'stopped'}">${info.running ? '正在运行' : '当前未运行'}</span><strong>本机连接信息</strong><small>仅监听 127.0.0.1，不会暴露到局域网或公网。</small></div>${info.running ? '' : `<button type="button" class="button" data-install-managed="${service}" ${state.busy ? 'disabled' : ''}>启动服务</button>`}</div><dl class="managed-connection-grid">${fields
    .map(
      ([name, value]) =>
        `<div><dt>${name}</dt><dd><code>${escapeHtml(value)}</code><button type="button" class="copy-connection" data-copy-managed="${escapeHtml(value)}" aria-label="复制${name}" title="复制${name}">${icon('copy')}</button></dd></div>`,
    )
    .join(
      '',
    )}<div class="connection-url"><dt>连接地址</dt><dd><code>${escapeHtml(info.connectionUrl)}</code><button type="button" class="copy-connection" data-copy-managed="${escapeHtml(info.connectionUrl)}" aria-label="复制连接地址" title="复制连接地址">${icon('copy')}</button></dd></div></dl></div>`
}

function captureScrollPositions() {
  const shell = document.querySelector('.shell')
  if (!shell || shell.dataset.renderedPage !== state.page) return null
  const setupPanel = shell.querySelector('.setup-panel.active')
  const sameSetupSection = setupPanel?.dataset.setupPanel === state.setupSection
  return {
    main: shell.querySelector('main')?.scrollTop || 0,
    setupPanels: sameSetupSection ? shell.querySelector('.setup-panels')?.scrollTop || 0 : null,
  }
}

function restoreScrollPositions(positions) {
  if (!positions) return
  const main = document.querySelector('main')
  const setupPanels = document.querySelector('.setup-panels')
  if (main) main.scrollTop = positions.main
  if (setupPanels && positions.setupPanels !== null) {
    setupPanels.scrollTop = positions.setupPanels
  }
}

function webLogin() {
  return `<section class="manager-login-page"><article class="manager-login-card">
    <div class="manager-login-heading"><span class="manager-login-kicker">BOX3 ENGINE</span><h1>Box Engine 管理界面</h1></div>
    <form id="web-login-form" class="manager-login-form"><label class="field"><span>服主管理密钥</span><input name="token" type="password" minlength="32" autocomplete="current-password" placeholder="请输入管理密钥" required/><small>密钥仅保存在当前标签页；关闭标签页或退出管理后需要重新输入。</small></label><p id="web-login-error"></p><button class="button primary" type="submit">进入管理平台</button></form>
  </article></section>`
}

async function submitWebManagerToken(event) {
  event.preventDefault()
  const token = String(new FormData(event.currentTarget).get('token') || '').trim()
  const error = document.querySelector('#web-login-error')
  if (error) error.textContent = ''
  setWebManagerToken(token)
  try {
    await invoke('get_system_status')
    // Leave the gate before refreshing; otherwise render() keeps drawing the
    // login panel even though the console is already authenticated.
    state.page = 'overview'
    await refreshStatus()
  } catch (failure) {
    setWebManagerToken('')
    if (error) error.textContent = String(failure.message || failure)
  }
}

function render() {
  normalizeLicensedPage()
  const scrollPositions = captureScrollPositions()
  const content =
    state.page === 'web-login'
      ? webLogin()
      : state.page === 'setup'
        ? setup()
        : state.page === 'runtimes'
          ? runtimes()
          : state.page === 'performance'
            ? performance()
            : state.page === 'backups'
              ? backups()
              : state.page === 'license'
                ? licenseManagement()
                : state.page === 'about'
                  ? about()
                  : overview()
  document.querySelector('#app').innerHTML = shell(content)
  restoreScrollPositions(scrollPositions)
  bindEvents()
  syncOverviewPolling()
  syncPerformancePolling()
  syncProjectRuntimePolling()
}

function bindEvents() {
  document.removeEventListener('click', closeServiceMenuOnOutside)
  document.addEventListener('click', closeServiceMenuOnOutside)
  document.querySelectorAll('[data-page]').forEach((node) =>
    node.addEventListener('click', () => {
      if (
        isWebManager() &&
        !hasWebManagerToken() &&
        !['web-login', 'about'].includes(node.dataset.page)
      ) {
        state.page = 'web-login'
        render()
        return
      }
      if (!hasValidLicense() && !UNLICENSED_PAGES.has(node.dataset.page)) {
        state.page = 'license'
        render()
        return
      }
      if (node.dataset.page !== 'setup') {
        state.ownerSecrets = null
        state.ownerSecretsVisible = false
      }
      state.page = node.dataset.page
      if (state.page === 'runtimes' && !state.projectRuntimesLoaded) {
        state.projectRuntimesLoading = true
      }
      render()
      if (state.page === 'backups') loadBackups()
      if (state.page === 'about') loadLegalNotices()
      if (state.page === 'license') refreshLicenseStatus()
      if (state.page === 'setup') refreshManagedServiceInfo()
      if (state.page === 'runtimes') scheduleProjectRuntimeRefresh()
    }),
  )
  document.querySelector('[data-dismiss-feedback]')?.addEventListener('click', dismissFeedback)
  document.querySelector('#web-logout')?.addEventListener('click', () => {
    setWebManagerToken('')
    state.page = 'web-login'
    state.status = null
    state.config = null
    state.about = null
    state.legal = null
    state.license = null
    state.environmentFile = ''
    state.environmentFileLoaded = false
    state.ownerSecrets = null
    state.ownerSecretsVisible = false
    state.backups = []
    state.performance = null
    state.projectRuntimes = { creator: [], play: [] }
    state.projectRuntimesLoaded = false
    state.error = ''
    state.notice = ''
    render()
  })
  document.querySelector('#connect-docker')?.addEventListener('click', () => {
    void (dockerPlatform().canStart ? startDockerDesktop() : recheckDocker())
  })
  document.querySelector('#install-license')?.addEventListener('click', () => installLicenseToken())
  document.querySelector('#toggle-license-device')?.addEventListener('click', () => {
    state.licenseDeviceVisible = !state.licenseDeviceVisible
    render()
  })
  document.querySelector('#copy-license-device')?.addEventListener('click', async () => {
    if (!state.license?.deviceId) return
    await navigator.clipboard.writeText(state.license.deviceId)
    state.notice = '设备 ID 已复制。'
    render()
  })
  document.querySelectorAll('[data-runtime-submaps]').forEach((node) =>
    node.addEventListener('toggle', () => {
      const projectId = node.dataset.runtimeSubmaps
      if (!projectId) return
      if (node.open) state.runtimeExpandedProjects.add(projectId)
      else state.runtimeExpandedProjects.delete(projectId)
    }),
  )
  document.querySelectorAll('[data-runtime-destroy]').forEach((node) =>
    node.addEventListener('click', () => {
      const projectId = node.dataset.runtimeDestroy
      const mode = node.dataset.runtimeMode
      const roomId = node.dataset.runtimeRoom || undefined
      if (!projectId || !mode) return
      state.runtimeDestroyDialog = { projectId, mode, roomId }
      render()
    }),
  )
  document
    .querySelector('[data-runtime-destroy-dialog-dismiss]')
    ?.addEventListener('click', (event) => {
      if (event.target !== event.currentTarget) return
      state.runtimeDestroyDialog = null
      render()
    })
  document.querySelector('#cancel-runtime-destroy-secondary')?.addEventListener('click', () => {
    state.runtimeDestroyDialog = null
    render()
  })
  document.querySelector('#confirm-runtime-destroy')?.addEventListener('click', () => {
    const dialog = state.runtimeDestroyDialog
    state.runtimeDestroyDialog = null
    if (dialog) void destroyProjectRuntime(dialog.projectId, dialog.mode, dialog.roomId)
  })
  document.querySelectorAll('[data-runtime-catalog]').forEach((node) =>
    node.addEventListener('click', () => {
      state.runtimeCatalogTab = node.dataset.runtimeCatalog === 'play' ? 'play' : 'creator'
      render()
    }),
  )
  document.querySelector('#refresh-backups')?.addEventListener('click', loadBackups)
  document.querySelector('#create-backup')?.addEventListener('click', createBackup)
  document.querySelector('#import-backup')?.addEventListener('click', importBackup)
  document.querySelectorAll('[data-backup-action]').forEach((node) =>
    node.addEventListener('click', () => {
      state.backupDialog = {
        action: node.dataset.backupAction,
        archive: node.dataset.backupPath,
        name: node.dataset.backupName,
      }
      render()
    }),
  )
  document
    .querySelectorAll('[data-export-backup]')
    .forEach((node) =>
      node.addEventListener('click', () => exportBackup(node.dataset.exportBackup)),
    )
  document
    .querySelector('#cancel-backup-action-secondary')
    ?.addEventListener('click', closeBackupDialog)
  document.querySelector('[data-backup-dialog-dismiss]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeBackupDialog()
  })
  document.querySelector('#confirm-backup-action')?.addEventListener('click', confirmBackupAction)
  document.querySelector('#close-legal-dialog')?.addEventListener('click', closeLegalDialog)
  document.querySelector('[data-legal-dialog-dismiss]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeLegalDialog()
  })
  document
    .querySelectorAll('[data-open-legal-document]')
    .forEach((node) =>
      node.addEventListener('click', () => openLegalDocument(node.dataset.openLegalDocument)),
    )
  document.querySelector('#theme-trigger')?.addEventListener('click', () => {
    state.themeMenuOpen = !state.themeMenuOpen
    render()
  })
  document.querySelector('#start')?.addEventListener('click', () => {
    state.startMenuOpen = true
    render()
  })
  document.querySelectorAll('[data-start-scope]').forEach((node) =>
    node.addEventListener('click', () => {
      const scope = node.dataset.startScope
      if (!scope) return
      if (state.startScopes.has(scope)) state.startScopes.delete(scope)
      else state.startScopes.add(scope)
      render()
    }),
  )
  document.querySelector('#confirm-start-scopes')?.addEventListener('click', () => {
    const scope = state.startScopes.size > 1 ? 'all' : [...state.startScopes][0]
    if (!scope) return
    void runAction('start_services', { scope })
  })
  document.querySelector('#cancel-start')?.addEventListener('click', () => {
    state.startMenuOpen = false
    render()
  })
  document.querySelector('[data-start-dialog-dismiss]')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) return
    state.startMenuOpen = false
    render()
  })
  document
    .querySelectorAll('[data-install-managed]')
    .forEach((node) =>
      node.addEventListener('click', () => installManagedService(node.dataset.installManaged)),
    )
  document.querySelectorAll('[data-copy-managed]').forEach((node) =>
    node.addEventListener('click', async () => {
      await navigator.clipboard.writeText(node.dataset.copyManaged)
      node.classList.add('copied')
      node.title = '已复制'
    }),
  )
  document.querySelector('#stop')?.addEventListener('click', () => runAction('stop_services'))
  document.querySelectorAll('[data-open]').forEach((node) =>
    node.addEventListener('click', async () => {
      try {
        await openExternal(node.dataset.open)
      } catch (error) {
        state.error = String(error)
        render()
      }
    }),
  )
  document.querySelectorAll('[data-copy-url]').forEach((node) =>
    node.addEventListener('click', async () => {
      await navigator.clipboard.writeText(node.dataset.copyUrl)
      node.title = '已复制'
    }),
  )
  document.querySelectorAll('[data-service-action]').forEach((node) =>
    node.addEventListener('click', () => {
      state.serviceMenu = ''
      runAction('control_service', {
        service: node.dataset.service,
        action: node.dataset.serviceAction,
      })
    }),
  )
  document.querySelectorAll('[data-service-menu]').forEach((node) =>
    node.addEventListener('click', () => {
      state.serviceMenu =
        state.serviceMenu === node.dataset.serviceMenu ? '' : node.dataset.serviceMenu
      render()
    }),
  )
  document.querySelector('#setup-form')?.addEventListener('submit', saveConfiguration)
  document.querySelector('#web-login-form')?.addEventListener('submit', submitWebManagerToken)
  document.querySelector('#web-login-form input')?.focus()
  document
    .querySelector('[data-save-raw-environment]')
    ?.addEventListener('click', saveRawEnvironment)
  document.querySelector('#reload-raw-environment')?.addEventListener('click', reloadRawEnvironment)
  document.querySelector('#toggle-owner-secrets')?.addEventListener('click', toggleOwnerSecrets)
  document.querySelector('#choose-data-storage')?.addEventListener('click', relocateDataStorage)
  document
    .querySelectorAll('[data-test-connection]')
    .forEach((node) =>
      node.addEventListener('click', () => testConnection(node.dataset.testConnection)),
    )
  document.querySelector('#export-about-diagnostics')?.addEventListener('click', exportDiagnostics)
  document.querySelectorAll('#open-community-group, [data-open-community-group]').forEach((node) =>
    node.addEventListener('click', () => {
      openExternal('https://qm.qq.com/q/oMdzAAN49a', 'open_community_group')
    }),
  )
  document.querySelectorAll('[data-setup-section]').forEach((node) =>
    node.addEventListener('click', (event) => {
      // These tabs live in a form. Keep the interaction explicit so a WebView
      // never treats a tab click as an implicit form action, and preserve any
      // values already typed before changing the visible section.
      event.preventDefault()
      switchSetupSection(node.dataset.setupSection)
    }),
  )
  document.querySelectorAll('[data-database-mode]').forEach((node) =>
    node.addEventListener('click', () => {
      captureSetupForm()
      const mode = node.dataset.databaseMode
      if (!mode) return
      state.config.databaseMode = mode
      if (mode === 'external' && state.config.databaseHost === 'managed-postgres') {
        state.config.databasePassword = ''
        state.config.hasDatabasePassword = false
      }
      clearFeedback()
      render()
    }),
  )
  document.querySelectorAll('[data-redis-mode]').forEach((node) =>
    node.addEventListener('click', () => {
      captureSetupForm()
      const mode = node.dataset.redisMode
      if (!mode) return
      state.config.redisMode = mode
      if (mode === 'external' && state.config.redisHost === 'managed-redis') {
        state.config.redisPassword = ''
        state.config.hasRedisPassword = false
      }
      clearFeedback()
      render()
    }),
  )
  document.querySelectorAll('[data-creator-network-mode]').forEach((node) =>
    node.addEventListener('click', () => {
      captureSetupForm()
      const mode = node.dataset.creatorNetworkMode
      if (!mode) return
      state.config.creatorNetworkMode = mode
      if (mode === 'local') state.config.creatorHost = '127.0.0.1'
      if (mode === 'lan' && state.config.lanIp) state.config.creatorHost = state.config.lanIp
      if (
        mode === 'public' &&
        ['127.0.0.1', 'localhost', state.config.lanIp].includes(state.config.creatorHost)
      ) {
        state.config.creatorHost = ''
      }
      render()
    }),
  )
  document.querySelectorAll('[data-play-network-mode]').forEach((node) =>
    node.addEventListener('click', () => {
      captureSetupForm()
      const mode = node.dataset.playNetworkMode
      if (mode === 'local') state.config.publicHost = '127.0.0.1'
      if (mode === 'lan' && state.config.lanIp) state.config.publicHost = state.config.lanIp
      if (
        mode === 'public' &&
        ['127.0.0.1', 'localhost', state.config.lanIp].includes(state.config.publicHost)
      ) {
        state.config.publicHost = ''
      }
      state.playAccessMode = mode || ''
      render()
    }),
  )
  document.querySelectorAll('[data-theme-choice]').forEach((node) =>
    node.addEventListener('click', () => {
      applyTheme(node.dataset.themeChoice)
      state.themeMenuOpen = false
      render()
    }),
  )
}

function closeServiceMenuOnOutside(event) {
  if (!state.serviceMenu) return
  const target = event.target
  if (target instanceof Element && target.closest('.service-more')) return
  state.serviceMenu = ''
  render()
}

let overviewStatusTimer
let overviewStatusLoading = false
let dockerStartupPollTimer
let performanceTimer
let projectRuntimeTimer
let projectRuntimeLoading = false
let projectRuntimeRefreshTimer
let progressRenderTimer

function syncOverviewPolling() {
  clearInterval(overviewStatusTimer)
  overviewStatusTimer = undefined
  if (state.page !== 'overview') {
    clearTimeout(dockerStartupPollTimer)
    dockerStartupPollTimer = undefined
    return
  }
  overviewStatusTimer = window.setInterval(
    refreshOverviewStatus,
    document.hidden ? OVERVIEW_HIDDEN_POLL_MS : OVERVIEW_POLL_MS,
  )
}

async function refreshOverviewStatus() {
  if (overviewStatusLoading || state.page !== 'overview') return
  overviewStatusLoading = true
  try {
    const status = await invoke('get_system_status')
    state.status = status
    state.dockerCheck = {
      cliAvailable: status.dockerCliAvailable,
      cliVersion: status.dockerCliVersion,
      engineReady: status.dockerReady,
      message: status.dockerMessage,
    }
  } catch (error) {
    state.status = {
      dockerReady: false,
      dockerCliAvailable: false,
      dockerCliVersion: '',
      dockerMessage: String(error),
      configured: false,
      services: [],
    }
    state.dockerCheck = null
  } finally {
    overviewStatusLoading = false
    if (state.page === 'overview') render()
  }
}

async function refreshManagedServiceInfo() {
  try {
    const [managedDatabaseInfo, managedRedisInfo] = await Promise.all([
      invoke('get_managed_service_info', { service: 'postgresql' }),
      invoke('get_managed_service_info', { service: 'redis' }),
    ])
    if (state.page === 'setup') captureSetupForm()
    state.managedDatabaseInfo = managedDatabaseInfo
    state.managedRedisInfo = managedRedisInfo
  } catch (error) {
    state.error = String(error)
  } finally {
    if (state.page === 'setup') render()
  }
}

function syncPerformancePolling() {
  clearInterval(performanceTimer)
  performanceTimer = undefined
  if (state.page !== 'performance') return
  if (!state.performance && !state.performanceLoading) refreshPerformance()
  performanceTimer = window.setInterval(
    refreshPerformance,
    document.hidden ? PERFORMANCE_HIDDEN_POLL_MS : PERFORMANCE_POLL_MS,
  )
}

async function refreshPerformance() {
  if (state.performanceLoading || state.page !== 'performance') return
  state.performanceLoading = true
  clearFeedback()
  render()
  try {
    state.performance = await invoke('get_performance_status')
  } catch (error) {
    state.performanceError = String(error)
  } finally {
    state.performanceLoading = false
    if (state.page === 'performance') render()
  }
}

function syncProjectRuntimePolling() {
  clearInterval(projectRuntimeTimer)
  projectRuntimeTimer = undefined
  if (state.page !== 'runtimes') {
    clearTimeout(projectRuntimeRefreshTimer)
    projectRuntimeRefreshTimer = undefined
    return
  }
  const hasProjects = state.projectRuntimes.creator?.length || state.projectRuntimes.play?.length
  if (!hasProjects) {
    if (!state.projectRuntimesLoaded && !projectRuntimeLoading) scheduleProjectRuntimeRefresh()
  }
  projectRuntimeTimer = window.setInterval(
    refreshProjectRuntimes,
    hasProjects
      ? document.hidden
        ? PROJECT_RUNTIME_HIDDEN_POLL_MS
        : PROJECT_RUNTIME_POLL_MS
      : PROJECT_RUNTIME_EMPTY_POLL_MS,
  )
}

function scheduleProjectRuntimeRefresh() {
  if (projectRuntimeRefreshTimer || projectRuntimeLoading || state.page !== 'runtimes') return
  projectRuntimeRefreshTimer = window.setTimeout(() => {
    projectRuntimeRefreshTimer = undefined
    refreshProjectRuntimes()
  }, 0)
}

document.addEventListener('visibilitychange', () => {
  syncOverviewPolling()
  syncPerformancePolling()
  syncProjectRuntimePolling()
  if (!document.hidden) {
    if (state.page === 'overview') refreshOverviewStatus()
    if (state.page === 'performance') refreshPerformance()
    scheduleProjectRuntimeRefresh()
  }
})

async function refreshProjectRuntimes() {
  if (projectRuntimeLoading || state.page !== 'runtimes') return
  projectRuntimeLoading = true
  const previousRuntimes = JSON.stringify(state.projectRuntimes)
  const wasLoaded = state.projectRuntimesLoaded
  const previousError = state.projectRuntimesError
  state.projectRuntimesLoading = true
  state.projectRuntimesError = ''
  try {
    state.projectRuntimes = await invoke('get_project_runtime_status')
  } catch (error) {
    state.projectRuntimesError = String(error)
  } finally {
    projectRuntimeLoading = false
    state.projectRuntimesLoading = false
    state.projectRuntimesLoaded = true
    const runtimesChanged = previousRuntimes !== JSON.stringify(state.projectRuntimes)
    const errorChanged = previousError !== state.projectRuntimesError
    if (
      state.page === 'runtimes' &&
      !state.runtimeDestroyDialog &&
      (!wasLoaded || runtimesChanged || errorChanged)
    ) {
      render()
    }
  }
}

async function destroyProjectRuntime(projectId, mode, roomId) {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  render()
  try {
    await invoke('destroy_project_runtime', { projectId, mode, roomId })
    state.notice = roomId ? '房间已销毁。' : '运行实例已销毁。'
    state.projectRuntimesLoaded = false
    await refreshProjectRuntimes()
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    if (state.page === 'runtimes') render()
  }
}

function captureSetupForm() {
  const form = document.querySelector('#setup-form')
  if (!form) return
  const values = Object.fromEntries(new FormData(form).entries())
  for (const key of ['permissionTokenSecret', 'playerAuthApiKey', 'playAdminToken']) {
    if (state.ownerSecretsVisible && values[key] === state.ownerSecrets?.[key]) delete values[key]
  }
  const databaseSsl = form.elements.namedItem('databaseSsl')
  const autoBackupEnabled = form.elements.namedItem('autoBackupEnabled')
  const registrationEnabled = form.elements.namedItem('registrationEnabled')
  const libraryManagementEnabled = form.elements.namedItem('libraryManagementEnabled')
  const next = {
    ...state.config,
    ...values,
    playNetworkMode: state.playAccessMode || state.config?.playNetworkMode || 'local',
    databaseSsl: databaseSsl instanceof HTMLInputElement ? databaseSsl.checked : false,
    autoBackupEnabled:
      autoBackupEnabled instanceof HTMLInputElement ? autoBackupEnabled.checked : false,
    registrationEnabled:
      registrationEnabled instanceof HTMLInputElement ? registrationEnabled.checked : false,
    libraryManagementEnabled:
      libraryManagementEnabled instanceof HTMLInputElement
        ? libraryManagementEnabled.checked
        : false,
  }
  // Password inputs are intentionally blank after rendering. An empty field
  // means “keep the saved/session value”, not “erase it”, unless the user has
  // explicitly cleared the database address (which disables that service).
  if (!values.databasePassword && state.config?.databasePassword) {
    next.databasePassword = state.config.databasePassword
  }
  if (!values.redisPassword && state.config?.redisPassword) {
    next.redisPassword = state.config.redisPassword
  }
  for (const key of ['permissionTokenSecret', 'playerAuthApiKey', 'playAdminToken']) {
    if (!values[key] && state.config?.[key]) {
      next[key] = state.config[key]
    }
  }
  state.config = next
}

function revealInvalidSetupField(form) {
  const invalid = form.querySelector(':invalid')
  if (!invalid) return false
  const panel = invalid.closest('[data-setup-panel]')
  const label = invalid.closest('label')?.querySelector('span')?.textContent?.trim()
  captureRawEnvironment()
  captureSetupForm()
  if (panel?.dataset.setupPanel) state.setupSection = panel.dataset.setupPanel
  const range = [
    invalid.min !== '' ? `最小 ${invalid.min}` : '',
    invalid.max !== '' ? `最大 ${invalid.max}` : '',
  ]
    .filter(Boolean)
    .join('，')
  const reason = invalid.validity.valueMissing
    ? '请填写'
    : range
      ? `取值范围 ${range}`
      : '请检查填写的值'
  state.error = `${label || invalid.name || '配置项'}：${reason}`
  render()
  const target = invalid.name
    ? document.querySelector(`#setup-form [name="${CSS.escape(invalid.name)}"]`)
    : null
  if (target) {
    target.focus()
    target.reportValidity()
  }
  return true
}

function switchSetupSection(section) {
  if (!section || section === state.setupSection) return
  captureRawEnvironment()
  captureSetupForm()
  if (section !== 'security') {
    state.ownerSecrets = null
    state.ownerSecretsVisible = false
  }
  state.setupSection = section
  clearFeedback()
  render()
}

async function toggleOwnerSecrets() {
  captureSetupForm()
  clearFeedback()
  if (state.ownerSecretsVisible) {
    state.ownerSecrets = null
    state.ownerSecretsVisible = false
    render()
    return
  }
  try {
    state.ownerSecrets = await invoke('get_owner_secrets')
    state.ownerSecretsVisible = true
  } catch (error) {
    state.error = String(error)
  }
  render()
}

function captureRawEnvironment() {
  const textarea = document.querySelector('#raw-environment')
  if (textarea) state.environmentFile = textarea.value
}

function normalizedConfig() {
  const config = { ...(state.config || {}) }
  for (const key of numericConfigFields) {
    config[key] = Number(config[key])
  }
  return config
}

async function testConnection(kind) {
  captureSetupForm()
  clearFeedback()
  const config = state.config || {}
  const isPostgresql = kind === 'postgresql'
  const host = isPostgresql ? config.databaseHost : config.redisHost
  const port = isPostgresql ? config.databasePort : config.redisPort
  if (!host) {
    state.error = `请先填写 ${kind === 'postgresql' ? 'PostgreSQL' : 'Redis'} 地址。`
    render()
    return
  }
  state.notice = `正在验证 ${kind === 'postgresql' ? 'PostgreSQL' : 'Redis'} 服务连接…`
  render()
  try {
    state.connectionTests[kind] = await invoke('test_remote_connection', {
      kind,
      host,
      port,
      database: isPostgresql ? config.databaseName : '',
      user: isPostgresql ? config.databaseUser : '',
      password: isPostgresql ? config.databasePassword || '' : config.redisPassword || '',
      redisDb: isPostgresql ? 0 : Number(config.redisDb || 0),
    })
    if (state.connectionTests[kind].ok) {
      state.notice = `${kind === 'postgresql' ? 'PostgreSQL' : 'Redis'} 服务连接并认证成功。`
    } else {
      state.error = state.connectionTests[kind].message
    }
  } catch (error) {
    state.connectionTests[kind] = { ok: false, message: String(error) }
    state.error = String(error)
  }
  render()
}

async function exportDiagnostics() {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  render()
  try {
    state.diagnosticPath = (await exportDiagnosticsFile()) || ''
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    render()
  }
}

async function loadBackups() {
  if (state.backupsLoading) return
  state.backupsLoading = true
  if (state.page === 'backups') render()
  try {
    state.backups = await invoke('list_backups')
  } catch (error) {
    state.error = String(error)
  } finally {
    state.backupsLoading = false
    if (state.page === 'backups') render()
  }
}

async function createBackup() {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  render()
  try {
    const path = await invoke('create_backup')
    state.backupMessage = `备份已创建：${path}`
    await loadBackups()
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    if (state.page === 'backups') render()
  }
}

async function importBackup() {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  render()
  try {
    const path = await selectBackup()
    if (path) {
      state.backupMessage = `备份已导入：${path}`
      await loadBackups()
    }
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    if (state.page === 'backups') render()
  }
}

async function exportBackup(archive) {
  if (state.busy || !archive) return
  state.busy = true
  clearFeedback()
  render()
  try {
    state.backupMessage = await exportBackupFile(archive)
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    if (state.page === 'backups') render()
  }
}

function closeBackupDialog() {
  state.backupDialog = null
  render()
}

async function confirmBackupAction() {
  const dialog = state.backupDialog
  if (state.busy || !dialog?.archive) return
  state.backupDialog = null
  state.busy = true
  clearFeedback()
  render()
  try {
    if (dialog.action === 'delete') {
      await invoke('delete_backup', { archive: dialog.archive })
      state.backupMessage = '备份已删除。'
      await loadBackups()
    } else {
      const cleanupWarning = await invoke('restore_backup', { archive: dialog.archive })
      state.backupMessage = '恢复完成，请在服务总览检查并按需启动服务。'
      if (cleanupWarning) state.backupMessage += ` 清理提示：${cleanupWarning}`
      await refreshStatus()
    }
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    if (state.page === 'backups') render()
  }
}

async function refreshStatus() {
  try {
    const [status, config, about, managedDatabaseInfo, managedRedisInfo, license, dataStorage] =
      await Promise.all([
        invoke('get_system_status'),
        invoke('get_install_config'),
        invoke('get_about_info'),
        invoke('get_managed_service_info', { service: 'postgresql' }),
        invoke('get_managed_service_info', { service: 'redis' }),
        invoke('get_license_status'),
        invoke('get_data_storage_info'),
      ])
    state.status = status
    state.dockerCheck = {
      cliAvailable: status.dockerCliAvailable,
      cliVersion: status.dockerCliVersion,
      engineReady: status.dockerReady,
      message: status.dockerMessage,
    }
    state.config = config
    state.about = about
    state.managedDatabaseInfo = managedDatabaseInfo
    state.managedRedisInfo = managedRedisInfo
    state.license = license
    state.dataStorage = dataStorage
    state.playAccessMode = ''
    state.environmentFile = await invoke('get_raw_environment')
    state.environmentFileLoaded = true
  } catch (error) {
    state.status = {
      dockerReady: false,
      dockerCliAvailable: false,
      dockerCliVersion: '',
      dockerMessage: String(error),
      configured: false,
      services: [],
    }
    state.dockerCheck = null
  }
  render()
}

async function relocateDataStorage() {
  if (state.busy) return
  clearFeedback()
  try {
    const directory = isWebManager()
      ? document.querySelector('#linux-data-directory')?.value.trim()
      : await invoke('choose_data_storage_directory')
    if (!directory) return
    state.busy = true
    state.progress = {
      stage: 'data-preflight',
      message: '正在检查数据目录和服务状态…',
      percent: 5,
    }
    render()
    state.dataStorage = await invoke('relocate_data_storage', { directory })
    state.notice = '数据目录已迁移，请从服务总览重新启动服务。'
    state.progress = { stage: 'complete', message: '数据目录已迁移', percent: 100 }
  } catch (error) {
    state.progress = { stage: 'error', message: String(error), percent: 100 }
    state.error = String(error)
  } finally {
    state.busy = false
    render()
  }
}

async function recheckDocker() {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  state.progress = {
    stage: 'docker-check',
    message: `正在检测 ${dockerPlatform().name}…`,
    percent: 20,
  }
  render()
  try {
    const timeout = new Promise((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`${dockerPlatform().name} 未在 8 秒内响应。请确认它已启动后重试。`)),
        8000,
      )
    })
    const check = await Promise.race([invoke('get_docker_check'), timeout])
    state.dockerCheck = check
    state.status = {
      ...(state.status || {}),
      dockerReady: check.engineReady,
      dockerCliAvailable: check.cliAvailable,
      dockerCliVersion: check.cliVersion,
      dockerMessage: check.message,
    }
    if (check.engineReady) {
      state.notice = `${dockerPlatform().name} 已连接。`
      state.progress = {
        stage: 'docker-ready',
        message: `${dockerPlatform().name} 已就绪`,
        percent: 100,
      }
    } else if (check.cliAvailable) {
      state.notice = `Docker CLI 已检测到；${dockerPlatform().name} 尚未启动。${dockerPlatform().hint}`
      state.progress = { stage: 'docker-waiting', message: check.message, percent: 100 }
    } else {
      state.error = check.message || `未检测到可用的 ${dockerPlatform().name}。`
      state.progress = { stage: 'docker-unavailable', message: state.error, percent: 100 }
    }
  } catch (error) {
    state.error = String(error)
    state.progress = { stage: 'docker-timeout', message: state.error, percent: 100 }
  } finally {
    state.busy = false
    render()
  }
}

async function startDockerDesktop() {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  state.progress = { stage: 'docker-start', message: '正在启动 Docker Desktop…', percent: 20 }
  render()
  try {
    await invoke('start_docker_desktop')
    state.notice = '已发送启动请求。Docker Desktop 初始化可能需要一点时间，请稍后重新检测。'
    state.progress = { stage: 'docker-started', message: state.notice, percent: 100 }
  } catch (error) {
    state.error = String(error)
    state.progress = { stage: 'docker-start-error', message: state.error, percent: 100 }
  } finally {
    state.busy = false
    render()
    scheduleDockerStartupCheck()
  }
}

function scheduleDockerStartupCheck() {
  clearTimeout(dockerStartupPollTimer)
  if (state.page !== 'overview' || state.status?.dockerReady) return
  dockerStartupPollTimer = window.setTimeout(async () => {
    await recheckDocker()
    if (!state.status?.dockerReady) scheduleDockerStartupCheck()
  }, 3000)
}

async function refreshLicenseStatus() {
  try {
    state.license = await invoke('get_license_status')
  } catch (error) {
    state.error = String(error)
  }
  if (state.page === 'license') render()
}

async function installLicenseToken() {
  const tokenInput = document.querySelector('#license-token')
  const token = tokenInput?.value.trim()
  if (!token || state.busy) {
    state.error = '请先粘贴许可证密钥。'
    render()
    return
  }
  state.busy = true
  clearFeedback()
  render()
  try {
    state.license = await invoke('install_license', { token })
    state.notice = '许可证已验证并安装。'
    state.page = 'overview'
  } catch (error) {
    state.error = String(error)
  } finally {
    state.busy = false
    render()
  }
}

async function loadLegalNotices() {
  if (state.legalLoading || state.legal) return
  state.legalLoading = true
  render()
  try {
    state.legal = await invoke('get_legal_notices')
  } catch (error) {
    state.legal = {
      licenseText: '无法读取许可证信息。',
      thirdPartyNotices: String(error),
      thirdPartyGeneratedAt: '读取失败',
    }
  } finally {
    state.legalLoading = false
    if (state.page === 'about') render()
  }
}

function closeLegalDialog() {
  state.legalDialog = ''
  render()
}

function openLegalDocument() {
  state.legalDialog = 'license'
  render()
  loadLegalNotices()
}

async function runAction(command, payload = {}) {
  if (state.busy) return
  const startsDockerWork =
    command === 'start_services' ||
    (command === 'control_service' && ['start', 'restart'].includes(payload.action))
  if (startsDockerWork && !state.status?.dockerReady) {
    state.error = dockerPlatform().hint
    state.progress = { stage: 'docker-required', message: state.error, percent: 100 }
    state.page = 'overview'
    render()
    return
  }
  state.busy = true
  clearFeedback()
  render()
  try {
    await invoke(command, payload)
    state.notice =
      {
        start_services: '服务已启动。',
        stop_services: '服务已停止。',
        control_service: '服务操作已完成。',
      }[command] || '操作已完成。'
  } catch (error) {
    state.progress = { stage: 'error', message: String(error), percent: 100 }
    state.error = String(error)
  } finally {
    state.busy = false
    await refreshStatus()
  }
}

async function saveConfiguration(event) {
  event.preventDefault()
  // The panel that holds an out-of-range field is often hidden, and the browser
  // then refuses to submit with "invalid form control is not focusable". Detect
  // it ourselves so the offending section is revealed with a real message.
  if (!event.currentTarget.checkValidity() && revealInvalidSetupField(event.currentTarget)) {
    return
  }
  const form = new FormData(event.currentTarget)
  const submitted = Object.fromEntries(form.entries())
  // Password fields deliberately render empty after every UI refresh. Keep a
  // password entered during this setup session (for example before clicking
  // “测试连接”) so the subsequent install does not accidentally submit it as
  // an empty value. Existing saved secrets remain server-side when no new
  // password has been entered.
  const config = { ...(state.config || {}), ...submitted }
  if (!submitted.databasePassword && state.config?.databasePassword) {
    config.databasePassword = state.config.databasePassword
  }
  if (!submitted.redisPassword && state.config?.redisPassword) {
    config.redisPassword = state.config.redisPassword
  }
  for (const key of ['permissionTokenSecret', 'playerAuthApiKey', 'playAdminToken']) {
    if (!submitted[key] && state.config?.[key]) {
      config[key] = state.config[key]
    }
  }
  config.databaseSsl = form.has('databaseSsl')
  config.autoBackupEnabled = form.has('autoBackupEnabled')
  config.registrationEnabled = form.has('registrationEnabled')
  config.libraryManagementEnabled = form.has('libraryManagementEnabled')
  for (const key of numericConfigFields) config[key] = Number(config[key])
  state.config = {
    ...state.config,
    ...config,
    hasDatabasePassword: Boolean(config.databasePassword) || state.config?.hasDatabasePassword,
    hasRedisPassword: Boolean(config.redisPassword) || state.config?.hasRedisPassword,
    hasPermissionTokenSecret:
      Boolean(config.permissionTokenSecret) || state.config?.hasPermissionTokenSecret,
    hasPlayerAuthApiKey: Boolean(config.playerAuthApiKey) || state.config?.hasPlayerAuthApiKey,
    hasPlayAdminToken: Boolean(config.playAdminToken) || state.config?.hasPlayAdminToken,
  }
  await persistConfiguration(config)
}

async function installManagedService(service) {
  if (state.busy || !['postgresql', 'redis'].includes(service)) return
  captureSetupForm()
  const config = normalizedConfig()
  if (service === 'postgresql') config.databaseMode = 'managed'
  else config.redisMode = 'managed'
  state.config = { ...state.config, ...config }
  state.busy = true
  clearFeedback()
  state.progress = {
    stage: 'managed-preflight',
    message: `正在检查 Docker 和 ${service === 'postgresql' ? 'PostgreSQL' : 'Redis'} 镜像…`,
    percent: 5,
  }
  render()
  try {
    await invoke(service === 'postgresql' ? 'prepare_managed_database' : 'prepare_managed_redis')
    await invoke('save_configuration_command', { config })
    await invoke('start_managed_service', { service })
    state.notice = `${service === 'postgresql' ? 'PostgreSQL' : 'Redis'} 已安装并可供本机程序连接。`
  } catch (error) {
    state.progress = { stage: 'error', message: String(error), percent: 100 }
    state.error = String(error)
  } finally {
    state.busy = false
    await refreshStatus()
  }
}

async function persistConfiguration(config) {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  render()
  try {
    await invoke('save_configuration_command', { config })
    state.notice = '已保存在当前页面，服务不会自动启动。'
    state.progress = { stage: 'saved', message: '配置已保存', percent: 100 }
  } catch (error) {
    state.progress = { stage: 'error', message: String(error), percent: 100 }
    state.error = String(error)
  } finally {
    state.busy = false
    await refreshStatus()
  }
}

async function saveRawEnvironment() {
  const textarea = document.querySelector('#raw-environment')
  if (!textarea || state.environmentFileSaving) return
  state.environmentFileSaving = true
  clearFeedback()
  state.environmentFile = textarea.value
  render()
  try {
    const creatorPolicyCorrected = await invoke('save_raw_environment', {
      content: state.environmentFile,
    })
    state.environmentMessage = creatorPolicyCorrected
      ? '环境变量已保存；创作端的公网配置已自动改回本机或局域网范围。'
      : '环境变量已保存，不会自动重启服务。'
    state.notice = state.environmentMessage
    state.progress = { stage: 'saved', message: '环境变量已保存', percent: 100 }
  } catch (error) {
    state.error = String(error)
  } finally {
    state.environmentFileSaving = false
    await refreshStatus()
  }
}

async function reloadRawEnvironment() {
  if (state.environmentFileSaving) return
  clearFeedback()
  try {
    state.environmentFile = await invoke('get_raw_environment')
    state.environmentMessage = '已重新读取磁盘中的 .env。'
    state.notice = state.environmentMessage
  } catch (error) {
    state.error = String(error)
  }
  render()
}

function scheduleProgressRender() {
  if (progressRenderTimer || !state.busy) return
  progressRenderTimer = window.setTimeout(() => {
    progressRenderTimer = undefined
    if (state.busy) render()
  }, 50)
}

listen('install-progress', ({ payload }) => {
  state.progress = payload
  scheduleProgressRender()
})

document.addEventListener('contextmenu', (event) => event.preventDefault())

applyTheme(state.theme)

function startWebManager() {
  if (!hasWebManagerToken()) {
    state.page = 'web-login'
    render()
    return
  }
  // A rotated or expired token must return to the gate. Without this check the
  // console renders as if Docker were unreachable, which hides the real cause.
  invoke('get_system_status')
    .then(() => refreshStatus())
    .catch(() => {
      setWebManagerToken('')
      state.page = 'web-login'
      render()
    })
}

if (isWebManager()) startWebManager()
else refreshStatus()
