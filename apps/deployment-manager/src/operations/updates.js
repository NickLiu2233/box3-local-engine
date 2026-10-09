import { state } from '../core/state.js'
import { render } from '../core/render-request.js'
import { invoke, isWebManager } from '../infrastructure/transport.js'
import { fetchLatestRelease } from '../infrastructure/releases.js'
import { isNewerVersion } from '../utils/releases.js'
import { captureSetupForm } from '../configuration/form.js'

let pending

function renderUpdateState() {
  if (state.page === 'setup') captureSetupForm()
  render()
}

export async function checkForUpdates(manual = false) {
  if (isWebManager()) return
  if (manual) {
    state.error = ''
    state.notice = ''
  }
  if (!pending) {
    state.updateChecking = true
    pending = Promise.all([invoke('get_about_info'), fetchLatestRelease()])
      .then(([info, release]) => ({
        release,
        newer: isNewerVersion(release.version, info.applicationVersion),
      }))
      .finally(() => {
        pending = null
        state.updateChecking = false
      })
  }
  if (manual) renderUpdateState()
  try {
    const result = await pending
    if (result.newer) {
      state.updateRelease = result.release
      state.updateDialogOpen = true
    } else {
      state.updateRelease = null
      state.updateDialogOpen = false
      if (manual) state.notice = '当前已是最新版本。'
    }
  } catch (error) {
    if (manual) state.error = `无法检测更新：${error?.message || String(error)}`
  }
  renderUpdateState()
}

export function openUpdateDialog() {
  state.updateDialogOpen = true
  renderUpdateState()
}

export function closeUpdateDialog() {
  state.updateDialogOpen = false
  renderUpdateState()
  document.querySelector('#check-version-updates')?.focus()
}
