import { clearFeedback } from './feedback.js'
import { invoke } from '../infrastructure/transport.js'
import { render } from '../core/render-request.js'
import { state } from '../core/state.js'

export async function refreshLicenseStatus() {
  try {
    state.license = await invoke('get_license_status')
  } catch (error) {
    state.error = String(error)
  }
  if (state.page === 'license') render()
}

export async function installLicenseToken() {
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

export async function loadLegalNotices() {
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

export function closeLegalDialog() {
  state.legalDialog = ''
  render()
}

export function openLegalDocument() {
  state.legalDialog = 'license'
  render()
  loadLegalNotices()
}
