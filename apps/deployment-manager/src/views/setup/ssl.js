import { state } from '../../core/state.js'
import { fileInput } from '../../ui/forms.js'
import { escapeHtml } from '../../ui/html.js'
import { nginxMode } from '../../configuration/ssl.js'
import { icon } from '../../ui/icons.js'

export function nginxSetting() {
  const mode = nginxMode()
  const disabled = state.sslBusy || state.busy ? 'disabled' : ''
  const available = state.sslStatus?.imageAvailable
  const label = `Nginx ${escapeHtml(state.sslStatus?.imageVersion || '稳定版')}`
  const panel = state.sslStatus?.running
    ? `<div class="managed-connection-card"><div class="managed-connection-heading"><div><span class="managed-state running">正在运行</span><strong>内置 ${label}</strong></div></div></div>`
    : `<div class="managed-install-card"><strong>${available ? `内置 ${label} 已下载` : '尚未安装 Nginx 最新稳定版'}</strong><button type="button" class="button primary" id="${available ? 'nginx-enable' : 'nginx-download'}" ${disabled}>${available ? '启用并启动' : '立即下载'}</button></div>`
  return `<div class="config-group"><div class="group-title"><h2>Nginx</h2></div>
    <input type="hidden" id="ssl-mode" value="${mode}"/>
    <div class="database-mode-choice">${[
      ['managed', '内置 Nginx', '启动器自动维护'],
      ['external', '已有外部 Nginx', '连接已有服务'],
    ].map(([value, title, description]) => `<button type="button" class="${mode === value ? 'active' : ''}" data-nginx-mode="${value}"><strong>${title}</strong><span>${description}</span></button>`).join('')}</div>
    ${mode === 'managed' ? panel : externalNginxPanel()}
  </div>`
}

function externalNginxPanel() {
  const info = state.sslStatus?.externalNginx
  const error = state.sslDetectionError || info?.error
  if (state.sslDetecting || (!state.sslLoaded && !error)) return '<div class="database-download-note" role="status"><span>正在检测本机 Nginx…</span></div>'
  if (state.sslDetectionError) return `<div class="database-download-note" role="status"><span>检测失败：${escapeHtml(state.sslDetectionError)}</span></div>`
  if (!info && !error) return '<div class="database-download-note" role="status"><span>暂未获取本机 Nginx 检测结果，重新选择外部 Nginx 可再次检测。</span></div>'
  if (info?.installed) {
    const field = (label, value) => `<div class="connection-url"><dt>${label}</dt><dd><code>${escapeHtml(value || '')}</code><button type="button" class="copy-connection" data-copy-managed="${escapeHtml(value || '')}" aria-label="复制${label}" title="复制${label}">${icon('copy')}</button></dd></div>`
    return `<div class="managed-connection-card external-nginx-info"><div class="managed-connection-heading"><div><span class="managed-state">已安装</span><strong>本机 Nginx ${escapeHtml(info.version || '')}</strong></div></div><dl class="managed-connection-grid">${field('可执行文件', info.executablePath)}${field('主配置文件', info.configPath)}</dl>${error ? `<div class="database-download-note" role="status"><span>${escapeHtml(error)}</span></div>` : ''}</div>`
  }
  return `<div class="database-download-note" role="status"><span>${error ? `检测失败：${escapeHtml(error)}` : '未检测到本机 Nginx。可先保存配置，安装并启动后再次保存即可应用 SSL。'}</span></div>`
}

export function sslCertificateSetting(service) {
  const files = state.sslFiles?.[service] || {}
  const saved = state.sslStatus?.config
  const expiry = saved?.certificateExpiries?.[service] || (saved?.settings?.routes?.some(route => route.service === service) ? saved.expiresAt : null)
  const remaining = Date.parse(expiry) - Date.now()
  const expiryClass = remaining <= 0 ? 'expired' : remaining <= 30 * 86400000 ? 'expiring' : ''
  const expiryHint = expiryClass === 'expired' ? '（已过期，请更换）' : expiryClass === 'expiring' ? '（即将到期，请更换）' : ''
  const titleStatus = expiryClass === 'expired' ? '已配置 · 已过期' : expiryClass === 'expiring' ? '已配置 · 即将到期' : '已配置'
  const picker = (kind, title, accept, filename, hint) => fileInput(title, filename, { 'data-ssl-service': service, 'data-ssl-kind': kind, accept }, hint)
  return `<details class="setup-explainer ssl-address-certificate"><summary><span>SSL 证书</span>${expiry ? `<span class="ssl-title-status ${expiryClass}">（${titleStatus}）</span>` : ''}</summary>

    ${nginxMode() === 'external' && state.sslStatus?.config?.pendingLocal ? '<div class="database-download-note"><span>SSL 配置已保存，需要安装并启动本机 Nginx 才能启用；安装后再次点击“保存配置”即可应用。</span></div>' : ''}
    ${expiry ? `<div class="database-download-note ssl-expiry-card ${expiryClass}"><span>有效期至 ${escapeHtml(new Date(expiry).toLocaleDateString('zh-CN'))}${expiryHint}</span><button type="button" class="ssl-delete-certificate" data-delete-ssl="${escapeHtml(service)}" title="删除该服务的 SSL 证书和私钥" aria-label="删除 SSL 证书" ${state.busy || state.sslBusy ? 'disabled' : ''}>${icon('trash')}</button></div>` : ''}
    <div class="form-grid single">
      ${picker('certificate', '证书文件（.pem / .crt / .cer）', '.pem,.crt,.cer', files.certificateName)}
      ${picker('privateKey', '证书密钥文件（.key / .pem）', '.pem,.key', files.keyName)}
    </div>
  </details>`

}
