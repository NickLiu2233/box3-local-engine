import {
  backupConfirmDialog,
  legalDocumentDialog,
  mapRuntimeProfileDialog,
  runtimeDestroyDialog,
  startScopeDialog,
} from './dialogs.js'
import { escapeHtml } from './html.js'
import { hasWebManagerToken, isWebManager } from '../infrastructure/transport.js'
import { icon } from './icons.js'
import { state } from '../core/state.js'
import { themeControl } from './theme.js'
import { updateDialog } from './update-dialog.js'

function navItem(page, iconName, label) {
  return `<button class="nav-item ${state.page === page ? 'active' : ''}" data-page="${page}">${icon(iconName)}<span>${label}</span></button>`
}

export function shell(content) {
  const webLoginRequired = isWebManager() && !hasWebManagerToken()
  const updateLabel = state.updateChecking
    ? '正在检测更新'
    : state.updateRelease
      ? '发现新版本，下载更新'
      : '检测版本更新'
  const updateControl = !isWebManager()
    ? `<button class="icon-button update-check${state.updateRelease ? ' update-available' : ''}" id="check-version-updates" title="${updateLabel}" aria-label="${updateLabel}" ${state.updateChecking ? 'disabled' : ''}>${icon('download')}</button>`
    : ''
  const primaryNavigation = webLoginRequired
    ? navItem('web-login', 'device', '管理登录')
    : `${navItem('overview', 'home', '服务总览')}${navItem('setup', 'settings', '数据配置')}${navItem('backups', 'archive', '数据与备份')}`
  return `<div class="shell" data-rendered-page="${state.page}">
    <aside>
      <div class="brand"><img class="brand-mark" src="/logo512.png" alt="BOX3 Engine"/><div><strong>BOX3 Engine</strong><span>本地部署</span></div></div>
      <nav>${primaryNavigation}${navItem('about', 'info', '关于')}</nav>
      <div class="sidebar-bottom">${isWebManager() && hasWebManagerToken() ? `<button class="web-logout" id="web-logout">${icon('logout')}<span>退出管理</span></button>` : ''}${themeControl()}${!webLoginRequired ? `<div class="sidebar-foot"><span class="status-dot ${state.status?.dockerReady ? 'good' : ''}"></span><span>${state.status?.dockerReady ? 'Docker 已连接' : 'Docker 未连接'}</span>${updateControl}</div>` : ''}</div>
    </aside>
    <main>${content}</main>
    ${feedbackToast()}
    ${state.startMenuOpen ? startScopeDialog() : ''}
    ${state.backupDialog ? backupConfirmDialog() : ''}
    ${state.runtimeDestroyDialog ? runtimeDestroyDialog() : ''}
    ${state.mapRuntimeProfileDialog ? mapRuntimeProfileDialog() : ''}
    ${state.legalDialog ? legalDocumentDialog() : ''}
    ${state.updateDialogOpen ? updateDialog() : ''}
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

export function progressPanel() {
  if (state.progress?.stage === 'image-download') {
    const percent = Math.max(0, Math.min(100, Number(state.progress.percent) || 0))
    return `<div class="progress-backdrop" role="alertdialog" aria-modal="true" aria-live="polite"><section class="progress-dialog image-download-dialog"><span class="progress-spinner" aria-hidden="true"></span><strong>正在下载服务镜像</strong><p>${escapeHtml(state.progress.message || '正在准备下载…')}</p><div class="image-download-progress" role="progressbar" aria-label="服务镜像下载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><small class="image-download-percent">${percent}%</small></section></div>`
  }
  if (state.progress?.stage === 'image-import') {
    return `<div class="progress-backdrop" role="alertdialog" aria-modal="true" aria-live="polite"><section class="progress-dialog"><span class="progress-spinner" aria-hidden="true"></span><strong>正在导入服务镜像</strong><p>${escapeHtml(state.progress.message || '镜像下载完成，正在导入 Docker…')}</p></section></div>`
  }
  return `<div class="progress-backdrop" role="alertdialog" aria-modal="true" aria-live="polite"><section class="progress-dialog"><span class="progress-spinner" aria-hidden="true"></span><strong>正在处理</strong><p>这可能需要几分钟，请耐心等待…</p></section></div>`
}
