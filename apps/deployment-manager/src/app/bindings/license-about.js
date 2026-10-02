import { applyTheme } from '../../ui/theme.js'
import { closeLegalDialog, installLicenseToken, openLegalDocument } from '../../operations/license.js'
import { copyText } from '../../utils/clipboard.js'
import { exportDiagnostics } from '../../operations/backups.js'
import { openExternal } from '../../infrastructure/transport.js'
import { render } from '../../core/render-request.js'
import { state } from '../../core/state.js'



export function bindLicenseAboutEvents() {
  document.querySelector('#install-license')?.addEventListener('click', () => installLicenseToken())
  
  document.querySelector('#toggle-license-device')?.addEventListener('click', () => {
      state.licenseDeviceVisible = !state.licenseDeviceVisible
      render()
    })
  
  document.querySelector('#copy-license-device')?.addEventListener('click', async () => {
      if (!state.license?.deviceId) return
      try {
        await copyText(state.license.deviceId)
        state.notice = '设备 ID 已复制。'
      } catch (error) {
        state.error = `复制失败：${String(error)}`
      }
      render()
    })
  
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
  
  document.querySelector('#export-about-diagnostics')?.addEventListener('click', exportDiagnostics)
  
  document.querySelectorAll('#open-community-group, [data-open-community-group]').forEach((node) =>
      node.addEventListener('click', () => {
        openExternal('https://qm.qq.com/q/oMdzAAN49a', 'open_community_group')
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
