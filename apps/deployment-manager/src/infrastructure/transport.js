/**
 * The deployment console deliberately knows nothing about its host runtime.
 *
 * Desktop uses Tauri commands while the headless package uses the same command
 * names over an authenticated HTTP endpoint.  Keeping this boundary here
 * prevents UI code from gradually growing `if (tauri)` branches.
 */
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen } from '@tauri-apps/api/event'
import { ApiClient } from '@box/apis'

const WEB_TOKEN_KEY = 'box-server-manager-token'

function isTauri() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}

function webToken() {
  return sessionStorage.getItem(WEB_TOKEN_KEY) || ''
}

export function isWebManager() {
  return !isTauri()
}

export function setWebManagerToken(token) {
  if (token) sessionStorage.setItem(WEB_TOKEN_KEY, token)
  else sessionStorage.removeItem(WEB_TOKEN_KEY)
}

export function hasWebManagerToken() {
  return Boolean(webToken())
}

function managerApi(authenticated = true) {
  const token = authenticated ? webToken() : ''
  if (authenticated && !token) throw new Error('请先输入 Linux Web 管理令牌')
  return {
    token,
    api: new ApiClient({
      credentials: 'same-origin',
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      defaultErrorMessage: '服务器管理请求失败',
    }),
  }
}

function unwrapManagerResult(result, token = '') {
  const body = result.data || result.error || {}
  if (!result.response.ok) {
    if (result.response.status === 401 && token && webToken() === token) setWebManagerToken('')
    throw new Error(body.message || `请求失败：${result.response.status}`)
  }
  return { body, response: result.response }
}

// Explicit opt-in: background reads must never publish into the active task's progress.
const PROGRESS_COMMANDS = new Set([
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
  'relocate_data_storage',
])

const progressHandlers = new Set()
const operations = new Set()

// getRandomValues also works on HTTP LAN origins where randomUUID is unavailable.
function operationId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function trackProgress(id) {
  let stopped = false
  let timer
  let controller
  const stop = () => {
    stopped = true
    clearTimeout(timer)
    controller?.abort()
    operations.delete(stop)
  }
  const poll = async () => {
    if (stopped || !progressHandlers.size || !hasWebManagerToken()) return stop()
    controller = new AbortController()
    try {
      const { api, token } = managerApi()
      const result = await api.getApiOperationsIdRaw({
        params: { path: { id } },
        signal: controller.signal,
      })
      const { body: progress } = unwrapManagerResult(result, token)
      if (!stopped) {
        for (const handler of [...progressHandlers]) {
          if (stopped || !progressHandlers.has(handler)) continue
          try {
            handler({ payload: progress })
          } catch {
            /* Observers cannot fail commands. */
          }
        }
      }
    } catch {
      /* Progress is best effort, including 404 before the operation exists. */
    }
    if (!stopped && hasWebManagerToken()) timer = setTimeout(poll, 750)
    else stop()
  }
  operations.add(stop)
  timer = setTimeout(poll, 750)
  return stop
}

export async function invoke(command, payload = {}) {
  if (isTauri()) return tauriInvoke(command, payload)
  const id = PROGRESS_COMMANDS.has(command) ? operationId() : null
  const stop = id && progressHandlers.size && hasWebManagerToken() ? trackProgress(id) : () => {}
  try {
    const { api, token } = managerApi(command !== 'get_legal_notices')
    const result = await api.postApiCommandsNameRaw({
      params: { path: { name: command } },
      headers: id ? { 'X-Operation-Id': id } : undefined,
      body: payload,
    })
    const { body } = unwrapManagerResult(result, token)
    return body.result
  } finally {
    stop()
  }
}

export async function listen(event, handler) {
  if (isTauri()) return tauriListen(event, handler)
  if (event !== 'install-progress') return () => {}
  // Each subscription has an independent lifetime, even for the same callback.
  const subscription = (value) => handler(value)
  progressHandlers.add(subscription)
  return () => {
    progressHandlers.delete(subscription)
    if (!progressHandlers.size) for (const stop of operations) stop()
  }
}

export function dockerPlatform() {
  return isWebManager()
    ? {
        name: '服务器 Docker',
        hint: 'Docker 服务未连接。此管理页运行在 Docker 内；请通过 SSH 执行 `sudo systemctl start docker`，然后重新检测。',
        action: '重新检测 Docker',
        busy: '正在检测…',
        canStart: false,
      }
    : {
        name: 'Docker Desktop',
        hint: '请先启动 Docker Desktop，连接成功后才能配置和启动服务。',
        action: '启动 Docker 服务',
        busy: '正在启动…',
        canStart: true,
      }
}

export async function openExternal(url, nativeCommand = 'open_service') {
  if (isTauri()) return invoke(nativeCommand, nativeCommand === 'open_service' ? { url } : {})
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function selectBackup() {
  if (isTauri()) return invoke('import_backup')
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip,.tar,.tar.gz,application/zip,application/gzip'
  input.hidden = true
  document.body.append(input)
  const file = await new Promise((resolve) => {
    const finish = (file) => {
      input.removeEventListener('change', change)
      input.removeEventListener('cancel', cancel)
      input.remove()
      resolve(file)
    }
    const change = () => finish(input.files?.[0] || null)
    const cancel = () => finish(null)
    input.addEventListener('change', change)
    input.addEventListener('cancel', cancel)
    input.click()
  })
  return file ? uploadBackup(file) : null
}

export async function exportBackupFile(archive) {
  if (isTauri()) {
    const path = await invoke('export_backup', { archive })
    return path ? `备份已导出：${path}` : ''
  }
  await downloadBackup(archive)
  return '备份下载已开始。'
}

export async function exportDiagnosticsFile() {
  const destination = await invoke('export_diagnostics')
  if (!destination || isTauri()) return destination
  await downloadDiagnostics(destination)
  return '诊断文件下载已开始。'
}

export async function uploadBackup(file) {
  if (!isWebManager()) throw new Error('此操作仅用于 Linux Web 管理端')
  const { api, token } = managerApi()
  const result = await api.postApiBackupsUploadRaw({
    headers: {
      'X-Backup-Name': encodeURIComponent(file.name),
    },
    body: file,
    bodySerializer: (body) => body,
  })
  const { body } = unwrapManagerResult(result, token)
  return body.path
}

async function downloadAuthenticated(request, filename) {
  const { api, token } = managerApi()
  const { body } = unwrapManagerResult(await request(api), token)
  const blob = body instanceof Blob ? body : new Blob([body])
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export async function downloadDiagnostics(archive) {
  if (!isWebManager()) throw new Error('此操作仅用于 Linux Web 管理端')
  await downloadAuthenticated(
    (api) =>
      api.getApiDiagnosticsArchiveDownloadRaw({
        params: { path: { archive } },
        parseAs: 'blob',
      }),
    archive,
  )
}

export async function downloadBackup(archive) {
  if (!isWebManager()) throw new Error('此操作仅用于 Linux Web 管理端')
  await downloadAuthenticated(
    (api) =>
      api.getApiBackupsArchiveDownloadRaw({
        params: { path: { archive } },
        parseAs: 'blob',
      }),
    archive,
  )
}
