import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import './styles.css'

const services = [
  ['creator', 'ARENA', '地图编辑服务', 'creatorPort', 3002, '/'],
  ['voxa', 'VOXA', '模型编辑服务', 'voxaPort', 3001, '/'],
  ['play', '游玩端', '作品游玩与服主管理', 'playPort', 3000, '/'],
  ['player-service', '玩家管理', '账号、权限与封禁', 'playerServicePort', 3213, '/players'],
  ['player-auth-portal', '登录门户', '玩家登录与注册', 'authPortalPort', 3214, '/'],
]

const THEME_KEY = 'box-manager-theme'
const themes = [
  ['system', '跟随系统'],
  ['light', '亮色'],
  ['dark', '暗色'],
]

const state = {
  page: 'overview',
  setupSection: 'data',
  helpSection: 'welcome',
  busy: false,
  status: null,
  config: null,
  about: null,
  legal: null,
  legalLoading: false,
  logs: '',
  logLoading: false,
  logService: '',
  environmentChecks: [],
  checkingEnvironment: false,
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
  performance: null,
  performanceLoading: false,
  performanceError: '',
  theme: localStorage.getItem(THEME_KEY) || 'system',
  themeMenuOpen: false,
  startMenuOpen: false,
  serviceMenu: '',
  legalDialog: '',
  playAccessMode: '',
  ownerSecrets: null,
  ownerSecretsVisible: false,
  error: '',
  notice: '',
  progress: { stage: 'idle', message: '等待操作', percent: 0 },
}

const icons = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.33.72.6 1 .3.3.7.44 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/>',
  logs: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  performance: '<path d="M4 19V9M10 19V5M16 19v-7M22 19V8"/><path d="M2 19h22"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.8 1.95c-.94.66-1.5 1.03-1.5 2.05M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>',
  archive: '<path d="M4 7h16v13H4z"/><path d="M3 4h18v3H3zM9 11h6M9 15h6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v6H5V6h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
  moon: '<path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/>',
  device: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  chevron: '<path d="m9 7 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
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
  return `<div class="shell">
    <aside>
      <div class="brand"><img class="brand-mark" src="/logo512.png" alt="BOX3 Engine"/><div><strong>BOX3 Engine</strong><span>本地部署</span></div></div>
      <nav>${navItem('overview', 'home', '服务总览')}${navItem('setup', 'settings', '数据配置')}${navItem('backups', 'archive', '数据与备份')}${navItem('logs', 'logs', '运行日志')}${navItem('help', 'help', '帮助手册')}${navItem('about', 'info', '关于')}</nav>
      <div class="sidebar-bottom">${themeControl()}<div class="sidebar-foot"><span class="status-dot ${state.status?.dockerReady ? 'good' : ''}"></span><span>${state.status?.dockerReady ? 'Docker 已连接' : 'Docker 未连接'}</span></div></div>
    </aside>
    <main>${content}</main>
    ${feedbackToast()}
    ${state.startMenuOpen ? startScopeDialog() : ''}
    ${state.backupDialog ? backupConfirmDialog() : ''}
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
  return `<div class="dialog-backdrop" data-start-dialog-dismiss><section class="start-dialog" role="dialog" aria-modal="true" aria-labelledby="start-dialog-title"><header><div><h2 id="start-dialog-title">启动服务</h2><p>选择本次需要运行的服务。</p></div><button class="dialog-close" id="cancel-start" aria-label="取消">×</button></header><div class="start-scope-list"><button data-start-scope="all"><strong>全部服务</strong><span>创作端、游玩与已配置的附属服务</span></button><button data-start-scope="play"><strong>游玩端</strong><span>Play 与游玩所需服务</span></button><button data-start-scope="creator"><strong>创作端</strong><span>ARENA、VOXA 与创作所需服务</span></button></div></section></div>`
}

function backupConfirmDialog() {
  const dialog = state.backupDialog
  const restoring = dialog.action === 'restore'
  const title = restoring ? '恢复此备份？' : '删除此备份？'
  const description = restoring
    ? '恢复会停止全部服务，并替换当前地图、游玩包和 VOXA 本地资源。当前未备份的修改将丢失。'
    : '删除后无法恢复此备份文件。'
  const confirmLabel = restoring ? '确认恢复' : '确认删除'
  return `<div class="dialog-backdrop" data-backup-dialog-dismiss><section class="start-dialog backup-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-dialog-title"><header><div><h2 id="backup-dialog-title">${title}</h2><p>${description}</p></div><button class="dialog-close" id="cancel-backup-action" aria-label="取消">×</button></header><div class="backup-dialog-file"><span>备份文件</span><strong>${escapeHtml(dialog.name)}</strong></div><div class="dialog-actions"><button class="button" id="cancel-backup-action-secondary">取消</button><button class="button ${restoring ? 'primary' : 'danger'}" id="confirm-backup-action">${confirmLabel}</button></div></section></div>`
}

function legalDocumentDialog() {
  const legal = state.legal || {}
  const title = '发行许可证'
  const meta = legal.licenseName || 'BOX3 Engine 非商业本地部署最终用户许可协议'
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
  return `<header><div><h1>性能监控</h1></div><div class="header-actions"><button class="button" data-page="overview">返回总览</button><button class="button" id="refresh-performance" ${state.performanceLoading ? 'disabled' : ''}>${icon('refresh')}${state.performanceLoading ? '采样中' : '刷新'}</button></div></header>
    <section class="metric-grid"><article><span>运行服务</span><strong>${running.length} / ${samples.filter((service) => service.enabled).length || 0}</strong><small>已启用服务</small></article><article><span>总 CPU</span><strong>${formatMetric(totalCpu)}</strong><small>当前容器合计</small></article><article><span>内存状态</span><strong>${running.length ? '正常采样' : '—'}</strong><small>${sampledAt}</small></article></section>
    <section class="performance-panel"><div class="performance-head"><span>服务</span><span>CPU</span><span>内存</span><span>占用率</span><span>进程</span><span>状态</span></div>${services
      .map(([id, name]) => {
        const item = samples.find((sample) => sample.name === id)
        const enabled = item?.enabled !== false
        const memoryPercent = Math.min(100, Math.max(0, item?.memoryPercent || 0))
        return `<article class="performance-row ${enabled ? '' : 'disabled'}"><div class="performance-name"><strong>${name}</strong></div><b>${formatMetric(item?.cpuPercent)}</b><div><b>${escapeHtml(item?.memoryUsage || '0 B')}</b><small>/ ${escapeHtml(item?.memoryLimit || '—')}</small></div><div class="memory-meter"><span><i style="width:${memoryPercent}%"></i></span><b>${formatMetric(memoryPercent)}</b></div><b>${item?.pids || 0}</b><span class="service-state ${item?.running ? 'running' : ''}"><i></i>${!enabled ? '未启用' : item?.running ? '运行中' : '已停止'}</span></article>`
      })
      .join(
        '',
      )}</section><p class="performance-note">仅在本页打开时每 5 秒采样一次；离开页面后自动停止。</p>`
}

function overview() {
  const installed = state.status?.configured
  const allHealthy = Boolean(state.status?.allHealthy)
  const enabledCount =
    state.status?.services?.filter((service) => service.enabled !== false).length || 0
  const runningCount = state.status?.services?.filter((service) => service.running).length || 0
  const summaryLabel = allHealthy
    ? '运行正常'
    : installed && runningCount
      ? '部分服务运行'
      : installed
        ? '等待启动'
        : '尚未配置'
  const summaryDetail = installed
    ? `${runningCount} / ${enabledCount} 个服务运行中`
    : '完成配置后即可启动'
  return `<header><div><h1>服务总览</h1></div>
    <div class="header-actions"><button class="button" data-page="diagnostics">${icon('check')}环境检查</button><button class="button" data-page="performance">${icon('performance')}性能</button><button class="icon-button" id="refresh" title="刷新">${icon('refresh')}</button></div></header>
    ${state.busy ? progressPanel() : ''}
    <section class="summary-bar"><div><span class="status-dot ${allHealthy ? 'good' : ''}"></span><div><strong>${summaryLabel}</strong><span>${summaryDetail}</span></div></div>
      <div class="hero-actions">${installed ? `${allHealthy ? '' : `<button class="button primary" id="start" ${state.busy ? 'disabled' : ''}>${icon('play')}启动</button>`}${runningCount ? `<button class="button" id="stop" ${state.busy ? 'disabled' : ''}>${icon('stop')}停止</button>` : ''}` : `<button class="button primary" data-page="setup">配置</button>`}</div></section>
    <div class="section-title"><h2>应用服务</h2></div>
    <div class="service-grid">${services.map(serviceCard).join('')}</div>`
}

function serviceCard([id, name, description, portKey, defaultPort, path]) {
  const service = state.status?.services?.find((item) => item.name === id)
  const enabled = service?.enabled !== false
  const running = service?.running
  const url = getServiceUrl(id)
  const port = Number(state.config?.[portKey]) || defaultPort
  const host =
    id === 'creator' || id === 'voxa' ? state.config?.creatorHost : state.config?.publicHost
  const endpoint = `${host || '127.0.0.1'}:${port}`
  const availability = !enabled ? '需要 PostgreSQL 配置' : description
  const moreMenu =
    state.serviceMenu === id
      ? `<div class="service-more-menu">${running ? `<button data-copy-url="${escapeHtml(url)}">${icon('copy')}复制访问地址</button>` : ''}<button data-service-logs="${id}">${icon('logs')}查看运行日志</button><button data-service-action="restart" data-service="${id}" ${!running ? 'disabled' : ''}>${icon('refresh')}重启服务</button></div>`
      : ''
  return `<article class="service-card ${enabled ? '' : 'disabled'}"><div class="service-copy"><h3>${name}</h3><p>${availability}${running ? `<span>· ${escapeHtml(endpoint)}</span>` : ''}</p></div><span class="service-state ${running ? 'running' : ''}"><i></i>${!enabled ? '未启用' : running ? '运行中' : '已停止'}</span><div class="service-commands">${running ? `<button class="service-open" data-open="${escapeHtml(url)}">打开</button>` : ''}<button class="service-action" data-service-action="${running ? 'stop' : 'start'}" data-service="${id}" ${!enabled || state.busy ? 'disabled' : ''}>${running ? '停止' : '启动'}</button><div class="service-more">${moreMenu}<button class="service-more-trigger" data-service-menu="${id}" aria-expanded="${state.serviceMenu === id}" title="更多操作">•••</button></div></div></article>`
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

function diagnostics() {
  const checks = state.environmentChecks
  return `<header><div><h1>环境检查</h1></div><div class="header-actions"><button class="button" data-page="overview">返回总览</button><button class="button" id="export-diagnostics" ${state.busy ? 'disabled' : ''}>${icon('logs')}生成诊断包</button><button class="button primary" id="run-environment-checks" ${state.checkingEnvironment ? 'disabled' : ''}>${icon('check')}${state.checkingEnvironment ? '检查中' : '开始检查'}</button></div></header>
    <section class="check-panel">${
      checks.length
        ? checks
            .map(
              (item) =>
                `<article class="check-row ${item.level}"><i></i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.message)}</span></div><b>${item.level === 'success' ? '正常' : item.level === 'error' ? '需处理' : '未启用'}</b></article>`,
            )
            .join('')
        : '<div class="empty-check"><strong>尚未执行检查</strong><span>点击“开始检查”确认当前配置是否适合启动服务。</span></div>'
    }</section><p class="performance-note">远程服务检查确认地址和端口可达；账号权限会在正式启动服务时继续验证。</p>`
}

function progressPanel() {
  return `<section class="progress-panel"><div><strong>${escapeHtml(state.progress.message)}</strong><span>${Math.max(0, Math.min(100, state.progress.percent))}%</span></div><div class="progress-track"><i style="width:${state.progress.percent}%"></i></div></section>`
}

function input(name, label, value = '', type = 'text', hint = '', required = false) {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${type === 'number' ? 'min="0"' : ''} ${required ? 'required' : ''}/><small class="${hint ? '' : 'empty'}">${hint ? escapeHtml(hint) : '&nbsp;'}</small></label>`
}

function setupExplanation(title, items) {
  return `<details class="setup-explainer"><summary>${title}</summary><div class="setup-explainer-grid">${items.map(([name, description]) => `<div><strong>${name}</strong><span>${description}</span></div>`).join('')}</div></details>`
}

function setup() {
  const config = state.config || {}
  const creatorHost = config.creatorHost || '127.0.0.1'
  const localSelected = creatorHost === '127.0.0.1' || creatorHost === 'localhost'
  const lanSelected = Boolean(config.lanIp) && creatorHost === config.lanIp
  const inferredPlayAccessMode =
    config.publicHost === '127.0.0.1' || config.publicHost === 'localhost'
      ? 'local'
      : config.lanIp && config.publicHost === config.lanIp
        ? 'lan'
        : 'public'
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
  return `<header><div><h1>数据配置</h1></div></header>
    ${state.busy ? progressPanel() : ''}
    <form id="setup-form" class="${state.setupSection === 'environment' ? 'environment-mode' : ''}">
      <div class="setup-tabs">${tab('data', '数据服务')}${tab('network', '访问设置')}${tab('capacity', '运行容量')}${tab('backup', '地图备份')}${tab('security', '服主与安全')}${tab('environment', '原始 .env')}</div>
      <div class="setup-panels">
        <section class="setup-panel ${state.setupSection === 'data' ? 'active' : ''}" data-setup-panel="data">
          <div class="config-group"><div class="group-title"><div><h2>PostgreSQL</h2><span>必填 · 保存玩家、权限与地图脚本数据</span></div><button type="button" class="text-button" data-test-connection="postgresql">测试连接</button></div><div class="form-grid compact three">${input('databaseHost', '地址', config.databaseHost, 'text', 'IP 或域名', true)}${input('databasePort', '端口', config.databasePort || '5432', 'number', '', true)}${input('databaseName', '数据库', config.databaseName || 'box', 'text', '', true)}${input('databaseUser', '账号', config.databaseUser || 'box', 'text', '', true)}${input('databasePassword', '密码', '', 'password', config.databasePassword ? '本次配置已输入，保存时会使用' : config.hasDatabasePassword ? '留空保留原密码' : '首次保存时必填')}<label class="check-field"><input name="databaseSsl" type="checkbox" ${config.databaseSsl ? 'checked' : ''}/><span>使用 SSL</span></label></div></div>
          <div class="config-group"><div class="group-title"><div><h2>Redis</h2><span>选填 · 留空则不启用缓存服务</span></div><button type="button" class="text-button" data-test-connection="redis">测试连接</button></div><div class="form-grid compact three">${input('redisHost', '地址', config.redisHost, 'text', 'IP 或域名')}${input('redisPort', '端口', config.redisPort || '6379', 'number')}${input('redisPassword', '密码', '', 'password', config.redisPassword ? '本次配置已输入，保存时会使用' : config.hasRedisPassword ? '留空保留原密码' : '')}${input('redisDb', '业务 DB', config.redisDb ?? 0, 'number')}${input('storageCacheRedisDb', '缓存 DB', config.storageCacheRedisDb ?? 1, 'number')}</div></div>
          ${setupExplanation('配置说明：这些服务用来做什么？', [
            [
              'PostgreSQL',
              '必须配置。用于保存玩家账号、权限和地图脚本等需要长期保留的数据；未完成配置时不能启动服务。',
            ],
            [
              'Redis',
              '用于缓存和运行时协调，帮助服务更快响应；它不是主要数据来源，留空不会删除地图或模型。',
            ],
            [
              '业务 DB / 缓存 DB',
              'Redis 中的两个逻辑空间。保持不同编号，避免业务数据和缓存互相影响。',
            ],
            [
              'SSL',
              '只有远程 PostgreSQL 要求加密连接时才勾选；不确定时按数据库服务商提供的连接要求填写。',
            ],
          ])}
        </section>
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
        <section class="setup-panel ${state.setupSection === 'network' ? 'active' : ''}" data-setup-panel="network"><div class="network-layout"><div class="network-primary-grid"><section class="network-service-card"><div class="network-card-heading"><h2>游玩端</h2></div><div class="access-choice"><button type="button" class="${playAccessMode === 'local' ? 'active' : ''}" data-play-network-mode="local">本机</button><button type="button" class="${playAccessMode === 'lan' ? 'active' : ''}" data-play-network-mode="lan" ${config.lanIp ? '' : 'disabled'}>局域网</button><button type="button" class="${playAccessMode === 'public' ? 'active' : ''}" data-play-network-mode="public">公网</button></div>${playAccessMode === 'public' ? input('publicHost', '公网 IP', config.publicHost) : `<input name="publicHost" type="hidden" value="${escapeHtml(config.publicHost || '127.0.0.1')}"/>`}<div class="form-grid single">${input('playPort', 'Play', config.playPort || 3000, 'number')}</div></section><section class="network-service-card"><div class="network-card-heading"><h2>创作端</h2></div><input name="creatorHost" type="hidden" value="${escapeHtml(creatorHost)}"/><div class="creator-network-choice"><button type="button" class="${localSelected ? 'active' : ''}" data-creator-network-host="127.0.0.1">本机</button><button type="button" class="${lanSelected ? 'active' : ''}" data-creator-network-host="${escapeHtml(config.lanIp || '')}" ${config.lanIp ? '' : 'disabled'}>局域网</button></div><div class="form-grid card-port-grid">${input('creatorPort', 'ARENA', config.creatorPort || 3002, 'number')}${input('voxaPort', 'VOXA', config.voxaPort || 3001, 'number')}</div></section></div><section class="network-service-card player-service-card"><div class="network-card-heading"><h2>玩家服务</h2><span>沿用游玩端地址</span></div><div class="form-grid player-port-grid">${input('playerServicePort', '玩家管理', config.playerServicePort || 3213, 'number')}${input('authPortalPort', '登录门户', config.authPortalPort || 3214, 'number')}</div></section></div>${setupExplanation(
          '配置说明：访问地址和端口有什么影响？',
          [
            ['创作端限制', 'ARENA 与 VOXA 只可绑定本机或局域网私有 IP，不能使用公网 IP 或域名。'],
            [
              '游玩访问',
              'Play、玩家管理和登录门户可填写公网 IP 或域名；生产环境建议使用 HTTPS 反向代理。',
            ],
            ['端口', '每个服务使用独立端口，不能重复；修改后访问链接也会随之改变。'],
          ],
        )}</section>
        <section class="setup-panel ${state.setupSection === 'capacity' ? 'active' : ''}" data-setup-panel="capacity"><div class="config-group"><div class="group-title"><div><h2>运行时上限</h2><span>按服务器内存调整</span></div></div><div class="form-grid three">${input('playRuntimes', '游玩运行时', config.playRuntimes || 8, 'number')}${input('creatorEditRuntimes', '编辑运行时', config.creatorEditRuntimes || 6, 'number')}${input('creatorPlayRuntimes', '创作预览', config.creatorPlayRuntimes || 4, 'number')}</div></div>${setupExplanation(
          '配置说明：运行时上限如何选择？',
          [
            ['游玩运行时', '同时活跃的游玩地图和传送房间数量。人数、地图数越多，需要的上限越高。'],
            ['编辑运行时', '同时打开进行编辑的地图数量；编辑器关闭后会按空闲策略回收。'],
            ['创作预览', '创作端点击运行时使用的预览实例数。'],
            [
              '容量建议',
              '上限越高，Docker 可用内存需求越大。首次部署可保持默认，出现排队再逐步提高。',
            ],
          ],
        )}</section>
        <section class="setup-panel ${state.setupSection === 'security' ? 'active' : ''}" data-setup-panel="security"><div class="config-group"><div class="group-title"><div><h2>服主密钥</h2><span>首次保存配置时会自动生成；无需手动填写，修改后旧会话和旧 API 调用会失效</span></div><button type="button" class="text-button" id="toggle-owner-secrets">${state.ownerSecretsVisible ? '隐藏密钥' : '查看密钥'}</button></div><div class="form-grid three">${secretInput('playAdminToken', '服主操作令牌', config.hasPlayAdminToken, '用于 Play 服主管理接口')}${secretInput('playerAuthApiKey', '玩家服务 API Key', config.hasPlayerAuthApiKey, '用于服主接入登录、注册接口')}${secretInput('permissionTokenSecret', '运行时身份密钥', config.hasPermissionTokenSecret, '用于 Creator / Play 身份签发')}</div></div>${setupExplanation(
          '配置说明：服主密钥分别做什么？',
          [
            ['自动生成', '首次保存配置时，三个密钥会自动生成；只有需要自定义时才填写新的值。'],
            [
              '查看密钥',
              '点击“查看密钥”后仅在本机当前页面显示；切换页面或点击隐藏会立即清除显示。',
            ],
            ['服主操作令牌', '保护 Play 端的服主操作接口。'],
            ['玩家服务 API Key', '供服主自建登录、注册或用户接入程序调用玩家服务。'],
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

function logs() {
  const selectedLabel = services.find(([id]) => id === state.logService)?.[1] || '全部服务'
  return `<section class="logs-page"><header><div><h1>运行日志</h1></div><div class="header-actions"><span class="log-live-status" id="log-live-status"><i></i>实时</span></div></header><div class="log-filters"><button class="${state.logService ? '' : 'active'}" data-log-service="">全部</button>${services.map(([id, name]) => `<button class="${state.logService === id ? 'active' : ''}" data-log-service="${id}">${name}</button>`).join('')}</div>
    <section class="log-card"><pre id="log-output">${escapeHtml(state.logs || '正在连接日志流…')}</pre></section></section>`
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
    welcome: `<div class="guide-heading"><h2>BOX3 Engine</h2></div><div class="guide-grid">${helpSection('能做什么', helpList(['在本机或服务器运行 Creator 与 Play', '管理地图、地图组、模型和游玩包', '使用 VOXA 编辑本地模型', '按需启用玩家账号、权限与封禁']))}${helpSection('产品定位', '<p>本项目保留 BOX 核心引擎与创作流程，并将平台依赖替换为本地服务。它不是 BOX 云平台的完整复制品，不包含云社区、商业化、平台审核与数据分析。</p>')}${helpSection('部署组成', '<div class="tag-row"><span>Creator</span><span>Play</span><span>玩家服务</span><span>登录门户</span><span>VOXA</span></div>')}${helpSection('数据原则', '<p>地图、模型和运行缓存保存在应用数据目录。配置 PostgreSQL 后，玩家与地图脚本数据写入远程数据库；Redis 仅用于缓存和运行时协调。</p>')}</div>`,
    quickstart: `<div class="guide-heading"><span>首次使用</span><h2>快速部署</h2><p>准备 Docker Desktop，几步完成本机部署。</p></div><ol class="step-list"><li><b>启动 Docker</b><span>安装 Docker Desktop，并保持 Linux containers 模式。</span></li><li><b>打开管理器</b><span>Windows 运行 EXE，macOS 打开 APP。</span></li><li><b>填写 PostgreSQL</b><span>PostgreSQL 为必填；Redis 可留空。保存配置不会启动容器。</span></li><li><b>选择启动范围</b><span>回到总览，选择全部服务、创作端或游玩端；管理器会导入所需离线镜像并启动对应服务。</span></li><li><b>开始使用</b><span>状态变为“运行正常”后点击对应服务的打开按钮。</span></li></ol><div class="guide-callout"><strong>数据服务要求</strong><span>启动前必须完成 PostgreSQL 配置。Redis 仅用于缓存和运行时协调，未配置时会使用本地回退能力。</span></div>`,
    services: `<div class="guide-heading"><span>系统组成</span><h2>服务与端口</h2><p>每个模块职责独立，可以从总览直接打开。</p></div><div class="service-table"><div class="table-head"><span>服务</span><span>默认地址</span><span>用途</span></div><div><b>Creator</b><code>:3002</code><span>地图和项目资源创作</span></div><div><b>Play</b><code>:3000</code><span>玩家游玩与作品管理</span></div><div><b>玩家管理</b><code>:3213</code><span>账号、角色、封禁和审计</span></div><div><b>登录门户</b><code>:3214</code><span>示例登录与注册入口</span></div><div><b>VOXA</b><code>:3001</code><span>模型创建和编辑</span></div></div>${helpSection('访问范围', '<p>Play、玩家管理和登录门户可使用本机、局域网或公网地址。Creator 与 VOXA 仅允许本机或局域网私有 IP，启动器会强制阻止公网 IP 和域名。公网游玩建议配置 HTTPS 反向代理、访问权限和防火墙。</p>')}`,
    configuration: `<div class="guide-heading"><span>数据配置</span><h2>配置说明</h2><p>常用参数分为五个页面，配置保存与服务启动彼此独立。</p></div><div class="guide-grid">${helpSection('PostgreSQL · 必填', helpList(['保存前会检查地址和端口是否可达', '玩家管理、登录门户与地图脚本数据都使用 PostgreSQL', '地址、数据库名、账号与首次密码都必须填写', 'SSL 由数据库服务端要求决定']))}${helpSection('Redis · 选填', helpList(['业务 DB 与缓存 DB 应使用不同编号', '留空时不启用 Redis 缓存', 'Redis 不保存唯一业务数据，可随时重建']))}${helpSection('访问设置', helpList(['127.0.0.1：仅当前电脑访问', 'Play、玩家管理和登录门户可使用局域网或公网 IP', 'Creator 与 VOXA 仅支持本机或局域网私有 IP，不能部署到公网或域名']))}${helpSection('服主与安全', helpList(['可替换服主操作令牌、玩家服务 API Key 和运行时身份密钥', '密钥至少 16 个字符；留空会保留当前值', '修改密钥后旧会话或 API 调用会失效']))}${helpSection('原始 .env', helpList(['显示当前 .env 原文，适合高级配置和排障', '会显示密码与密钥，请勿截图或转发', '保存后不会自动重启服务，需在总览手动启动或重启']))}${helpSection('运行容量', helpList(['游玩运行时：同时活跃的地图/房间', '编辑运行时：同时打开的编辑项目', '创作预览：编辑器内运行实例', '上限越高，占用的内存越多']))}</div>`,
    workflow: `<div class="guide-heading"><span>日常使用</span><h2>创作与游玩</h2><p>Creator 管理源工程，Play 运行导出的游戏包。</p></div><div class="workflow-columns">${helpSection('Creator', helpList(['新建或导入地图工程', '主地图下可创建共享资源的副地图', '项目模型只属于当前项目，不修改本地模型原件', '共享脚本、图片、音频和角色在地图组内同步', '通过 VOXA 编辑模型后返回项目继续使用', '导出单地图工程、地图组工程或游戏包']))}${helpSection('Play', helpList(['导入 Creator 导出的游戏包', '玩家通过 /p/地图访问 ID 进入作品', '主地图负责地图组入口，副地图通常通过传送进入', '后台预热可降低首位玩家进入等待时间', '游玩包是只读运行快照，不作为源工程编辑']))}</div><div class="guide-callout"><strong>备份建议</strong><span>重要修改前导出地图组工程；游戏包用于部署，不能代替源工程备份。</span></div>`,
    players: `<div class="guide-heading"><span>需要 PostgreSQL</span><h2>玩家与权限</h2><p>玩家身份由独立玩家服务统一管理。</p></div><div class="guide-grid">${helpSection('账号资料', helpList(['记录用户名、显示名、注册与登录时间', '记录可信代理后的注册 IP、最后登录 IP', '支持绑定兼容用神岛 ID（boxId）', '可查看会话、设备与登录历史']))}${helpSection('权限层级', helpList(['服主：管理权限、管理员及账号删除', '管理员：按服主授予的权限执行管理', '协管员：处理指定范围的玩家事务', '玩家：进入游戏并访问自己的数据']))}${helpSection('安全操作', helpList(['支持临时封禁和永久封禁', '支持账号、IP 与设备维度封禁', '强制下线会撤销会话并通知运行时', '管理 API 必须携带服主配置的密钥']))}${helpSection('登录门户', '<p>内置门户用于快速部署和测试。正式运营时，服主也可以自行开发登录页，通过玩家服务公开 API 完成注册、登录和账号维护。</p>')}</div>`,
    operations: `<div class="guide-heading"><span>维护指南</span><h2>运维与排障</h2><p>先看状态，再看日志，最后检查外部依赖。</p></div><div class="diagnostic-list"><div><b>服务无法启动</b><span>确认 Docker Desktop 正在运行、PostgreSQL 已配置且可连接、磁盘空间充足，镜像架构与电脑一致。</span></div><div><b>无法进入地图</b><span>查看 Creator/Play 日志，检查运行时上限、地图资源完整性与脚本内存。</span></div><div><b>数据库不可用</b><span>检查安全组、防火墙、5432 端口、账号密码和 SSL 设置；PostgreSQL 为必填，修复后重新保存配置。</span></div><div><b>Redis 不可用</b><span>检查 6379 端口和密码；清空地址会停用 Redis 缓存，不会影响源工程。</span></div><div><b>外部设备打不开</b><span>访问地址填写服务器 IP 或域名，并在防火墙中开放对应端口。</span></div><div><b>升级镜像</b><span>停止服务，备份应用数据目录，替换离线包后重新打开管理器；已有数据不会被程序目录覆盖。</span></div></div><div class="guide-callout"><strong>备份与恢复</strong><span>本地备份包含地图工程、游玩包、VOXA 本地模型与资源；不包含 .env、服主密钥、密码、远程 PostgreSQL 数据和 Redis 缓存。玩家与脚本数据请由数据库服务商或服主自行备份。备份可导出分享，导入后仍需点击“恢复”并确认才会写入本机。</span></div><div class="guide-callout"><strong>日志</strong><span>“运行日志”集中显示最近 500 行容器输出。反馈问题时，请同时提供服务名、发生时间和相关错误段。</span></div>`,
  }
  return chapters[state.helpSection] || chapters.welcome
}

function help() {
  return `<header><div><h1>帮助手册</h1></div></header><div class="help-layout"><nav class="help-nav">${helpChapters.map(helpNav).join('')}</nav><article class="guide-content">${helpContent()}</article></div>`
}

function about() {
  const info = state.about || {}
  const legal = state.legal || {}
  const values = [
    ['启动器版本', info.applicationVersion || '读取中'],
    ['镜像版本', info.imageTag || '读取中'],
    ['运行平台', [info.platform, info.architecture].filter(Boolean).join(' / ') || '未知'],
    ['构建提交', info.sourceRevision || '未知'],
    ['构建时间', formatBeijingBuildTime(info.buildCreatedAt)],
    ['构建来源', formatBuildSource(info.buildSource)],
  ]
  return `<header><div><h1>关于</h1></div></header><section class="about-page"><article class="about-card"><div class="about-card-heading"><h2>版本信息</h2></div><dl class="about-facts">${values.map(([label, value, title = value]) => `<div><dt>${label}</dt>${label === '构建提交' ? `<dd class="about-build-revision" title="${escapeHtml(title || '')}"><code>${escapeHtml(value)}</code><button class="about-copy-button" type="button" data-copy-build-revision="${escapeHtml(value)}" aria-label="复制构建提交" title="复制构建提交">${icon('copy')}</button></dd>` : `<dd title="${escapeHtml(title || '')}">${escapeHtml(value)}</dd>`}</div>`).join('')}</dl></article><article class="about-card"><div class="about-card-heading"><h2>发行许可</h2></div><div class="about-document-list"><button class="about-document-row" data-open-legal-document="license"><span><strong>发行许可证</strong><small>${escapeHtml(legal.licenseName || '正在读取许可证信息')}</small></span><em>查看全文</em>${icon('chevron')}</button></div></article></section>`
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
  return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}:${parts.second}（北京时间）`
}

function formatBuildSource(value) {
  if (value === 'local-dirty') return '本地测试构建（含未提交修改）'
  if (value === 'local') return '本地构建'
  if (value === 'github-actions') return 'GitHub Actions 构建'
  return value || '未知'
}

function render() {
  const content =
    state.page === 'setup'
      ? setup()
      : state.page === 'diagnostics'
        ? diagnostics()
        : state.page === 'performance'
          ? performance()
          : state.page === 'backups'
            ? backups()
            : state.page === 'logs'
              ? logs()
              : state.page === 'help'
                ? help()
                : state.page === 'about'
                  ? about()
                  : overview()
  document.querySelector('#app').innerHTML = shell(content)
  bindEvents()
  syncPerformancePolling()
  syncLogPolling()
}

function bindEvents() {
  document.removeEventListener('click', closeServiceMenuOnOutside)
  document.addEventListener('click', closeServiceMenuOnOutside)
  document.querySelectorAll('[data-page]').forEach((node) =>
    node.addEventListener('click', () => {
      if (node.dataset.page !== 'setup') {
        state.ownerSecrets = null
        state.ownerSecretsVisible = false
      }
      state.page = node.dataset.page
      render()
      if (state.page === 'backups') loadBackups()
      if (state.page === 'about') loadLegalNotices()
    }),
  )
  document.querySelector('#refresh')?.addEventListener('click', refreshStatus)
  document.querySelector('[data-dismiss-feedback]')?.addEventListener('click', dismissFeedback)
  document.querySelector('#refresh-performance')?.addEventListener('click', refreshPerformance)
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
  for (const selector of ['#cancel-backup-action', '#cancel-backup-action-secondary']) {
    document.querySelector(selector)?.addEventListener('click', closeBackupDialog)
  }
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
  document.querySelector('#cancel-start')?.addEventListener('click', () => {
    state.startMenuOpen = false
    render()
  })
  document.querySelector('[data-start-dialog-dismiss]')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) return
    state.startMenuOpen = false
    render()
  })
  document.querySelectorAll('[data-start-scope]').forEach((node) =>
    node.addEventListener('click', () => {
      state.startMenuOpen = false
      runAction('start_services', { scope: node.dataset.startScope })
    }),
  )
  document.querySelector('#stop')?.addEventListener('click', () => runAction('stop_services'))
  document
    .querySelectorAll('[data-open]')
    .forEach((node) =>
      node.addEventListener('click', () => invoke('open_service', { url: node.dataset.open })),
    )
  document.querySelectorAll('[data-copy-url]').forEach((node) =>
    node.addEventListener('click', async () => {
      await navigator.clipboard.writeText(node.dataset.copyUrl)
      node.title = '已复制'
    }),
  )
  document.querySelectorAll('[data-copy-build-revision]').forEach((node) =>
    node.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(node.dataset.copyBuildRevision)
        state.notice = '构建提交已复制。'
      } catch (error) {
        state.error = `复制构建提交失败：${String(error)}`
      }
      render()
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
  document.querySelectorAll('[data-service-logs]').forEach((node) =>
    node.addEventListener('click', async () => {
      state.logService = node.dataset.serviceLogs
      state.page = 'logs'
      state.logs = ''
      render()
      await loadLogs()
    }),
  )
  document.querySelector('#setup-form')?.addEventListener('submit', saveConfiguration)
  document
    .querySelector('[data-save-raw-environment]')
    ?.addEventListener('click', saveRawEnvironment)
  document.querySelector('#reload-raw-environment')?.addEventListener('click', reloadRawEnvironment)
  document.querySelector('#toggle-owner-secrets')?.addEventListener('click', toggleOwnerSecrets)
  document
    .querySelectorAll('[data-test-connection]')
    .forEach((node) =>
      node.addEventListener('click', () => testConnection(node.dataset.testConnection)),
    )
  document.querySelector('#run-environment-checks')?.addEventListener('click', runEnvironmentChecks)
  document.querySelector('#export-diagnostics')?.addEventListener('click', exportDiagnostics)
  document.querySelectorAll('[data-log-service]').forEach((node) =>
    node.addEventListener('click', async () => {
      state.logService = node.dataset.logService
      state.logs = ''
      render()
      await loadLogs()
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
  document.querySelectorAll('[data-creator-network-host]').forEach((node) =>
    node.addEventListener('click', () => {
      const host = node.dataset.creatorNetworkHost
      if (!host) return
      const input = document.querySelector('[name="creatorHost"]')
      if (input) input.value = host
      captureSetupForm()
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
  document.querySelectorAll('[data-help-section]').forEach((node) =>
    node.addEventListener('click', () => {
      state.helpSection = node.dataset.helpSection
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

let performanceTimer
let logTimer

function syncPerformancePolling() {
  clearInterval(performanceTimer)
  performanceTimer = undefined
  if (state.page !== 'performance') return
  if (!state.performance && !state.performanceLoading) refreshPerformance()
  performanceTimer = window.setInterval(refreshPerformance, 5000)
}

function syncLogPolling() {
  clearInterval(logTimer)
  logTimer = undefined
  if (state.page !== 'logs') return
  if (!state.logs && !state.logLoading) loadLogs({ renderPage: false })
  logTimer = window.setInterval(() => loadLogs({ renderPage: false }), 1500)
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

function captureSetupForm() {
  const form = document.querySelector('#setup-form')
  if (!form) return
  const values = Object.fromEntries(new FormData(form).entries())
  for (const key of ['permissionTokenSecret', 'playerAuthApiKey', 'playAdminToken']) {
    if (state.ownerSecretsVisible && values[key] === state.ownerSecrets?.[key]) delete values[key]
  }
  const databaseSsl = form.elements.namedItem('databaseSsl')
  const autoBackupEnabled = form.elements.namedItem('autoBackupEnabled')
  const next = {
    ...state.config,
    ...values,
    databaseSsl: databaseSsl instanceof HTMLInputElement ? databaseSsl.checked : false,
    autoBackupEnabled:
      autoBackupEnabled instanceof HTMLInputElement ? autoBackupEnabled.checked : false,
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
  for (const key of [
    'playRuntimes',
    'creatorEditRuntimes',
    'creatorPlayRuntimes',
    'redisDb',
    'storageCacheRedisDb',
    'playPort',
    'voxaPort',
    'creatorPort',
    'playerServicePort',
    'authPortalPort',
  ]) {
    config[key] = Number(config[key])
  }
  return config
}

async function testConnection(kind) {
  captureSetupForm()
  clearFeedback()
  const config = state.config || {}
  const host = kind === 'postgresql' ? config.databaseHost : config.redisHost
  const port = kind === 'postgresql' ? config.databasePort : config.redisPort
  if (!host) {
    state.error = `请先填写 ${kind === 'postgresql' ? 'PostgreSQL' : 'Redis'} 地址。`
    render()
    return
  }
  state.notice = `正在测试 ${kind === 'postgresql' ? 'PostgreSQL' : 'Redis'} 连接…`
  render()
  try {
    state.connectionTests[kind] = await invoke('test_remote_connection', { kind, host, port })
    if (state.connectionTests[kind].ok) {
      state.notice = `${kind === 'postgresql' ? 'PostgreSQL' : 'Redis'} 连接正常。`
    } else {
      state.error = state.connectionTests[kind].message
    }
  } catch (error) {
    state.connectionTests[kind] = { ok: false, message: String(error) }
    state.error = String(error)
  }
  render()
}

async function runEnvironmentChecks() {
  if (state.checkingEnvironment) return
  state.checkingEnvironment = true
  clearFeedback()
  render()
  try {
    state.environmentChecks = await invoke('run_environment_checks', {
      config: normalizedConfig(),
    })
  } catch (error) {
    state.error = String(error)
  } finally {
    state.checkingEnvironment = false
    render()
  }
}

async function exportDiagnostics() {
  if (state.busy) return
  state.busy = true
  clearFeedback()
  render()
  try {
    state.diagnosticPath = await invoke('export_diagnostics')
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
    const path = await invoke('import_backup')
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
    const path = await invoke('export_backup', { archive })
    if (path) state.backupMessage = `备份已导出：${path}`
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
      await invoke('restore_backup', { archive: dialog.archive })
      state.backupMessage = '恢复完成。服务已停止，请在服务总览按需重新启动。'
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
    state.status = await invoke('get_system_status')
    state.config = await invoke('get_install_config')
    state.about = await invoke('get_about_info')
    state.playAccessMode = ''
    state.environmentFile = await invoke('get_raw_environment')
    state.environmentFileLoaded = true
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
  config.playRuntimes = Number(config.playRuntimes)
  config.creatorEditRuntimes = Number(config.creatorEditRuntimes)
  config.creatorPlayRuntimes = Number(config.creatorPlayRuntimes)
  config.redisDb = Number(config.redisDb)
  config.storageCacheRedisDb = Number(config.storageCacheRedisDb)
  config.autoBackupIntervalMinutes = Number(config.autoBackupIntervalMinutes)
  config.autoBackupRetentionCount = Number(config.autoBackupRetentionCount)
  config.autoBackupRetentionDays = Number(config.autoBackupRetentionDays)
  config.playPort = Number(config.playPort)
  config.voxaPort = Number(config.voxaPort)
  config.creatorPort = Number(config.creatorPort)
  config.playerServicePort = Number(config.playerServicePort)
  config.authPortalPort = Number(config.authPortalPort)
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

async function loadLogs({ renderPage = true } = {}) {
  if (state.logLoading) return
  state.logLoading = true
  const requestedService = state.logService
  const refreshButton = renderPage ? document.querySelector('#load-logs') : null
  if (refreshButton) refreshButton.disabled = true
  try {
    const nextLogs = requestedService
      ? await invoke('get_service_logs', { service: requestedService })
      : await invoke('get_logs')
    if (state.logService !== requestedService) return
    state.logs = String(nextLogs)
  } catch (error) {
    if (state.logService !== requestedService) return
    state.logs = String(error)
  } finally {
    state.logLoading = false
    if (refreshButton) refreshButton.disabled = false
  }
  const output = document.querySelector('#log-output')
  if (output) {
    const followTail = output.scrollHeight - output.scrollTop - output.clientHeight < 48
    output.textContent = state.logs || '暂无日志输出。'
    if (followTail) output.scrollTop = output.scrollHeight
  }
}

listen('install-progress', ({ payload }) => {
  state.progress = payload
  if (state.busy) render()
})

document.addEventListener('contextmenu', (event) => event.preventDefault())

applyTheme(state.theme)
refreshStatus()
