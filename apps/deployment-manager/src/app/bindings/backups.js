import { closeBackupDialog, confirmBackupAction, createBackup, exportBackup, importBackup, loadBackups } from '../../operations/backups.js'
import { render } from '../../core/render-request.js'
import { state } from '../../core/state.js'



export function bindBackupsEvents() {
  document.querySelector('#refresh-backups')?.addEventListener('click', loadBackups)
  
  document.querySelector('#create-backup')?.addEventListener('click', createBackup)
  
  document.querySelector('#import-backup')?.addEventListener('click', importBackup)
  
  document.querySelectorAll('[data-backup-action]').forEach((node) =>
      node.addEventListener('click', () => {
        state.backupDialog = {
          action: node.dataset.backupAction,
          archive: node.dataset.backupPath,
          name: node.dataset.backupName,
        }
        render()
      }),
    )
  
  document
      .querySelectorAll('[data-export-backup]')
      .forEach((node) =>
        node.addEventListener('click', () => exportBackup(node.dataset.exportBackup)),
      )
  
  document
      .querySelector('#cancel-backup-action-secondary')
      ?.addEventListener('click', closeBackupDialog)
  
  document.querySelector('[data-backup-dialog-dismiss]')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeBackupDialog()
    })
  
  document.querySelector('#confirm-backup-action')?.addEventListener('click', confirmBackupAction)
}
