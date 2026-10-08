import { invoke, exportSslConfiguration } from '../infrastructure/transport.js'
import { state } from '../core/state.js'
import { render } from '../core/render-request.js'
import { captureSetupForm } from '../configuration/form.js'
import { nginxMode, sslRoutes } from '../configuration/ssl.js'
import { clearFeedback } from './feedback.js'

export function captureSslDraft() {
  state.sslDraft ||= { mode: nginxMode(), httpsPort: 443 }
  const mode = document.querySelector('#ssl-mode')
  if (mode) state.sslDraft.mode = mode.value
}
export async function selectSslFile(kind, file, service) {
  if (!file) return
  const limit = kind === 'certificate' ? 256 * 1024 : 64 * 1024
  if (file.size > limit) { state.error = '证书或私钥文件过大'; render(); return }
  try {
    const extensions = kind === 'certificate' ? /\.(pem|crt|cer)$/i : /\.(pem|key)$/i
    if (!extensions.test(file.name)) throw new Error(kind === 'certificate' ? '请选择 .pem、.crt 或 .cer 证书文件' : '请选择 .key 或 .pem 证书密钥文件')
    const text = (await file.text()).trim()
    const block = kind === 'certificate'
      ? /^-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+\s+-----END CERTIFICATE-----$/
      : /^-----BEGIN (PRIVATE KEY|RSA PRIVATE KEY|EC PRIVATE KEY)-----\s+[A-Za-z0-9+/=\s]+\s+-----END \1-----$/
    const blocks = kind === 'certificate' ? text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) : [text]
    if (!blocks?.length || blocks.some(value => !block.test(value)) || (kind === 'certificate' && text.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, '').trim())) throw new Error(kind === 'certificate' ? '证书内容无效，请导入 PEM 格式证书文件' : '密钥内容无效，请导入未加密的 PEM 格式密钥文件')
    state.sslFiles ||= {}
    state.sslFiles[service] ||= {}
    state.sslFiles[service][kind] = text
    state.sslFiles[service][kind === 'certificate' ? 'certificateName' : 'keyName'] = file.name
    state.error = ''
    return true
  } catch (error) { state.error = String(error); render(); return false }
}
async function task(action) {
  if (state.busy || state.sslBusy) return
  captureSetupForm(); captureSslDraft()
  state.sslBusy = true; state.error = ''; state.notice = ''
  render()
  try { await action() } catch (error) { state.error = String(error) }
  finally { state.sslBusy = false; render() }
}
export async function refreshSsl() {
  state.sslLoaded = true
  const request = state.sslRequestId = (state.sslRequestId || 0) + 1
  state.sslDetecting = true
  state.sslDetectionError = ''
  render()
  try {
    const status = await invoke('get_ssl_status')
    if (request === state.sslRequestId) state.sslStatus = status
  } catch (error) {
    if (request === state.sslRequestId) state.sslDetectionError = String(error)
  } finally {
    if (request === state.sslRequestId) {
      if (state.page === 'setup') captureSetupForm()
      state.sslDetecting = false
      render()
    }
  }
}
export function chooseNginx(mode) {
  if (!['managed', 'external'].includes(mode)) return
  if (mode === nginxMode()) {
    if (mode === 'external') return refreshSsl()
    return
  }
  captureSetupForm()
  state.sslDraft = { ...state.sslDraft, mode }
  state.nginxSelectionDirty = true
  clearFeedback()
  render()
  if (mode === 'external') return refreshSsl()
}
export async function persistNginxSelection() {
  if (!state.nginxSelectionDirty) return
  const mode = nginxMode()
  if (mode !== state.sslStatus?.provider) {
    if (state.sslStatus?.running && mode === 'external') {
      if (!window.confirm('保存外部 Nginx 配置将停止内置 HTTPS 入口，是否继续？')) throw new Error('Nginx 切换未保存，内置入口继续运行')
      await invoke('stop_ssl_proxy')
    }
    await invoke('set_nginx_provider', { mode })
    await refreshSsl()
  }
  state.nginxSelectionDirty = false
}
export function downloadNginx() {
  return task(async () => {
    await persistNginxSelection()
    await invoke('install_nginx_image')
    await refreshSsl()
    state.notice = '内置 Nginx 已下载，点击“启用并启动”配置 HTTPS 入口。'
  })
}
export function enableNginx() {
  return task(async () => {
    await persistNginxSelection()
    if (!state.sslStatus?.config) {
      state.setupSection = 'network'
      state.accessMode = 'public'
      state.config.playNetworkMode = 'public'
      state.config.creatorNetworkMode = 'public'
      state.notice = '请填写 HTTPS 公网地址并选择证书文件，保存配置后将启动内置 Nginx。'
      return
    }
    await applyCertificateConfiguration()
    state.notice = '内置 Nginx 已启用并启动，HTTPS 配置已应用。'
  })
}
export function shouldApplySsl() {
  const mode = nginxMode()
  if (state.setupSection !== 'network' || (state.accessMode || state.config?.playNetworkMode) !== 'public' || !['managed', 'external'].includes(mode)) return false
  return Object.entries(state.sslFiles || {}).some(([service, files]) => service !== 'shared' && (files.certificate || files.privateKey))
    || Boolean(state.sslStatus?.config && (mode === 'external'
      || mode !== state.sslStatus.config.settings?.mode
      || JSON.stringify(sslRoutes()) !== JSON.stringify(state.sslStatus.config.settings?.routes)))
}
export function validateSslRoutes(routes) {
  const domains = new Set()
  for (const route of routes) {
    if (domains.has(route.domain)) throw new Error('HTTPS 统一使用 443，同一域名不能同时分配给多个服务。请为各服务填写不同的独立 HTTPS 公网地址。')
    domains.add(route.domain)
  }
}
export function applySsl() { return task(applyCertificateConfiguration) }
export async function applyCertificateConfiguration() {
    const mode = nginxMode()
    if (!['managed', 'external'].includes(mode)) throw new Error('请先在数据服务选择 Nginx 使用方式')
    const routes = sslRoutes()
    if (!routes.length) throw new Error('请先填写至少一个 HTTPS 公网地址')
    validateSslRoutes(routes)
    const certificates = {}
    for (const route of routes) {
      const local = state.sslFiles?.[route.service]
      const files = local
      if (!files?.certificate && !files?.privateKey) continue
      if (!files.certificate || !files.privateKey) throw new Error('请为选定证书同时选择完整证书链和私钥')
      certificates[route.service] = { source: 'independent', certificate: files.certificate, privateKey: files.privateKey }
    }
    state.sslStatus = await invoke('apply_ssl_config', { config: { settings: { mode, httpsPort: 443, routes }, externalLocal: mode === 'external', certificates } })
    state.sslFiles = {}
    state.notice = state.sslStatus.sslWarning || (mode === 'managed' ? '配置已保存，内置 Nginx 已自动更新。公网地址变更后，请重新启动相关引擎服务。' : '配置已保存，本机外部 Nginx 已自动更新并重载。')
    await refreshSsl()
}
export function stopSsl() {
  if (!window.confirm('停用后 HTTPS/WSS 入口将断开，内部引擎服务继续运行。是否停用？')) return
  return task(async () => { state.sslStatus = await invoke('stop_ssl_proxy'); state.notice = '托管 HTTPS 入口已停用，证书保留。' })
}
export function deleteSslCertificate(service) {
  return task(async () => {
    state.sslStatus = await invoke('delete_ssl_certificate', { service })
    if (state.sslFiles) delete state.sslFiles[service]
    state.notice = '该服务的 SSL 证书和私钥已删除，HTTPS 路由已停用。'
  })
}
export function exportSsl() {
  return task(async () => {
    const exported = await exportSslConfiguration(state.sslStatus.config.externalConfig)
    if (exported) state.notice = '配置已导出；请复制证书、调整上游地址并执行 nginx -t 后重载。'
  })
}
