import { state } from '../core/state.js'
import { render } from '../core/render-request.js'
import { invoke, isWebManager, listen } from '../infrastructure/transport.js'
import { fetchLatestRelease } from '../infrastructure/releases.js'
import { installerTarget, isNewerVersion } from '../utils/releases.js'
import { captureSetupForm } from '../configuration/form.js'
import { updateDownloadProgress } from '../ui/update-dialog.js'

let pending

function renderUpdateState() {
  if (state.page === 'setup') captureSetupForm()
  render()
}

export async function checkForUpdates(manual = false) {
  if (isWebManager() || state.updateDownloading || state.updateReady) return
  if (manual) {
    state.error = ''
    state.notice = ''
  }
  if (!pending) {
    state.updateChecking = true
    pending = Promise.all([invoke('get_about_info'), fetchLatestRelease()])
      .then(([info, release]) => ({
        release,
        info,
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
      state.updateDownloadTarget = installerTarget(result.info)
      state.updateRelease = result.release
      state.updateDialogOpen = true
    } else {
      state.updateRelease = null
      state.updateDownloadTarget = null
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

export async function downloadUpdate() {
  if (
    !state.updateRelease ||
    !state.updateDownloadTarget ||
    state.updateDownloading ||
    state.updateReady
  )
    return
  state.updateDownloading = true
  state.updateError = ''
  state.updateProgress = { bytes: 0, total: 0 }
  renderUpdateState()
  let stop
  try {
    stop = await listen('launcher-update-progress', ({ payload }) => {
      state.updateProgress = payload
      updateDownloadProgress()
    })
    await invoke('download_launcher_update', {
      url: `https://assets.box3.fun/local-engine/BOX-Local-Engine-${state.updateRelease.version.replace(/^v/, '')}-${state.updateDownloadTarget}.zip`,
    })
    state.updateReady = true
  } catch (error) {
    state.updateError = String(error)
  } finally {
    stop?.()
    state.updateDownloading = false
    renderUpdateState()
  }
}

export async function restartAndUpdate() {
  if (!state.updateReady || state.updateRestarting) return
  state.updateRestarting = true
  state.updateError = ''
  renderUpdateState()
  try {
    await invoke('apply_launcher_update', { cleanupOldImages: state.updateCleanupOldImages })
  } catch (error) {
    state.updateError = String(error)
    state.updateRestarting = false
    renderUpdateState()
  }
}

export function closeUpdateDialog() {
  state.updateDialogOpen = false
  renderUpdateState()
  document.querySelector('#check-version-updates')?.focus()
}
