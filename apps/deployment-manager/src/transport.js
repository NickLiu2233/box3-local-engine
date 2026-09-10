/**
 * The deployment console deliberately knows nothing about its host runtime.
 *
 * Desktop uses Tauri commands while the headless package uses the same command
 * names over an authenticated HTTP endpoint.  Keeping this boundary here
 * prevents UI code from gradually growing `if (tauri)` branches.
 */
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen } from '@tauri-apps/api/event'

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

export async function invoke(command, payload = {}) {
  if (isTauri()) return tauriInvoke(command, payload)

  const token = webToken()
  if (!token) throw new Error('请先输入 Linux Web 管理令牌')
  const response = await fetch(`/api/commands/${encodeURIComponent(command)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) setWebManagerToken('')
    throw new Error(body.message || `请求失败：${response.status}`)
  }
  return body.result
}

// Long-running desktop commands emit progress events. The HTTP API returns
// only after the command completes; callers can still render their existing
// busy state, so a no-op unlisten keeps the UI contract identical.
export async function listen(event, handler) {
  if (isTauri()) return tauriListen(event, handler)
  return () => {}
}

export async function uploadBackup(file) {
  if (!isWebManager()) throw new Error('此操作仅用于 Linux Web 管理端')
  const response = await fetch('/api/backups/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${webToken()}`, 'X-Backup-Name': encodeURIComponent(file.name) },
    body: file,
    credentials: 'same-origin',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `上传失败：${response.status}`)
  return body.path
}

async function downloadAuthenticated(path, filename) {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${webToken()}` },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `下载失败：${response.status}`)
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(await response.blob())
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export async function downloadDiagnostics(archive) {
  if (!isWebManager()) throw new Error('此操作仅用于 Linux Web 管理端')
  await downloadAuthenticated(`/api/diagnostics/${encodeURIComponent(archive)}/download`, archive)
}

export async function downloadBackup(archive) {
  if (!isWebManager()) throw new Error('此操作仅用于 Linux Web 管理端')
  await downloadAuthenticated(`/api/backups/${encodeURIComponent(archive)}/download`, archive)
}
