import { applyTheme } from '../../ui/theme.js'
import { closeLegalDialog, openLegalDocument } from '../../operations/legal.js'
import { exportDiagnostics } from '../../operations/backups.js'
import { openExternal } from '../../infrastructure/transport.js'
import { render } from '../../core/render-request.js'
import { state } from '../../core/state.js'



export function bindAboutEvents() {
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
