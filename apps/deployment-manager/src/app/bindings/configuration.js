import { captureSetupForm, switchSetupSection } from '../../configuration/form.js'
import { clearFeedback } from '../../operations/feedback.js'
import { copyOwnerSecret, toggleOwnerSecretEditor } from '../../operations/owner-secrets.js'
import { copyText } from '../../utils/clipboard.js'
import { installManagedService, reloadRawEnvironment, relocateDataStorage, saveConfiguration, saveRawEnvironment, testConnection } from '../../operations/configuration.js'
import { render } from '../../core/render-request.js'
import { state } from '../../core/state.js'



export function bindConfigurationEvents() {
  document
      .querySelectorAll('[data-install-managed]')
      .forEach((node) =>
        node.addEventListener('click', () => installManagedService(node.dataset.installManaged)),
      )
  
  document.querySelectorAll('[data-copy-managed]').forEach((node) =>
      node.addEventListener('click', async () => {
        await copyText(node.dataset.copyManaged)
        node.classList.add('copied')
        node.title = '已复制'
      }),
    )
  
  document.querySelector('#setup-form')?.addEventListener('submit', saveConfiguration)
  
  document
      .querySelector('[data-save-raw-environment]')
      ?.addEventListener('click', saveRawEnvironment)
  
  document.querySelector('#reload-raw-environment')?.addEventListener('click', reloadRawEnvironment)
  
  document
      .querySelectorAll('[data-secret-edit]')
      .forEach((node) =>
        node.addEventListener('click', () => void toggleOwnerSecretEditor(node.dataset.secretEdit)),
      )
  
  document
      .querySelectorAll('[data-secret-copy]')
      .forEach((node) =>
        node.addEventListener('click', () => void copyOwnerSecret(node.dataset.secretCopy)),
      )
  
  document.querySelector('#choose-data-storage')?.addEventListener('click', relocateDataStorage)
  
  document
      .querySelectorAll('[data-test-connection]')
      .forEach((node) =>
        node.addEventListener('click', () => testConnection(node.dataset.testConnection)),
      )
  
  document.querySelectorAll('[data-setup-section]').forEach((node) =>
      node.addEventListener('click', (event) => {
        // These tabs live in a form. Keep the interaction explicit so a WebView
        // never treats a tab click as an implicit form action, and preserve any
        // values already typed before changing the visible section.
        event.preventDefault()
        switchSetupSection(node.dataset.setupSection)
      }),
    )
  
  document.querySelectorAll('[data-database-mode]').forEach((node) =>
      node.addEventListener('click', () => {
        captureSetupForm()
        const mode = node.dataset.databaseMode
        if (!mode) return
        state.config.databaseMode = mode
        if (mode === 'external' && state.config.databaseHost === 'managed-postgres') {
          state.config.databasePassword = ''
          state.config.hasDatabasePassword = false
        }
        clearFeedback()
        render()
      }),
    )
  
  document.querySelectorAll('[data-redis-mode]').forEach((node) =>
      node.addEventListener('click', () => {
        captureSetupForm()
        const mode = node.dataset.redisMode
        if (!mode) return
        state.config.redisMode = mode
        if (mode === 'external' && state.config.redisHost === 'managed-redis') {
          state.config.redisPassword = ''
          state.config.hasRedisPassword = false
        }
        clearFeedback()
        render()
      }),
    )
  
  document.querySelectorAll('[data-network-mode]').forEach((node) =>
      node.addEventListener('click', () => {
        captureSetupForm()
        const mode = node.dataset.networkMode
        if (!mode) return
        state.config.playNetworkMode = mode
        state.config.creatorNetworkMode = mode
        state.accessMode = mode
        render()
      }),
    )
}
