import { isPublicMode, publicEndpoints } from '../../configuration/public-access.js'
import { captureSetupForm, switchSetupSection } from '../../configuration/form.js'
import { clearFeedback } from '../../operations/feedback.js'
import { copyOwnerSecret, toggleOwnerSecretEditor } from '../../operations/owner-secrets.js'
import { copyText } from '../../utils/clipboard.js'
import { installManagedService, reloadRawEnvironment, relocateDataStorage, saveConfiguration, saveRawEnvironment, testConnection } from '../../operations/configuration.js'
import { render } from '../../core/render-request.js'
import { state } from '../../core/state.js'
import { restoreDefaultAuthPortalImage } from '../../operations/auth-portal.js'
import { applySsl, captureSslDraft, refreshSsl, selectSslFile, stopSsl, chooseNginx, downloadNginx, enableNginx, deleteSslCertificate } from '../../operations/ssl.js'



export function bindConfigurationEvents() {
  if (state.page !== 'setup' || state.setupSection !== 'network') state.sslFiles = {}
  for (const [id, handler] of [['ssl-apply', applySsl], ['ssl-stop', stopSsl], ['ssl-apply-network', applySsl], ['nginx-download', downloadNginx], ['nginx-enable', enableNginx]]) {
    document.querySelector(`#${id}`)?.addEventListener('click', handler)
  }
  document.querySelectorAll('[data-ssl-kind]').forEach(node => node.addEventListener('change', async event => {
    const valid = await selectSslFile(node.dataset.sslKind, event.target.files?.[0], node.dataset.sslService)
    const name = state.sslFiles?.[node.dataset.sslService]?.[node.dataset.sslKind === 'certificate' ? 'certificateName' : 'keyName']
    if (valid && name) {
      node.closest('label').querySelector('.file-picker-name').textContent = name
      try {
        const endpoints = publicEndpoints()
        document.querySelectorAll('[data-public-preview]').forEach(preview => {
          const endpoint = endpoints.find(endpoint => endpoint.service === preview.dataset.publicPreview)
          if (endpoint) preview.querySelector('code').textContent = endpoint.url
        })
      } catch {}
    }
  }))
  document.querySelectorAll('[data-nginx-mode]').forEach(node => node.addEventListener('click', () => chooseNginx(node.dataset.nginxMode)))
  document.querySelectorAll('[data-delete-ssl]').forEach(node => node.addEventListener('click', () => deleteSslCertificate(node.dataset.deleteSsl)))
  document.querySelectorAll('[name="sharedPublicAddress"], [name^="publicPath-"], [name$="PublicAddressOverride"], [name="playPort"], [name="creatorPort"], [name="voxaPort"], [name="playerServicePort"], [name="authPortalPort"]').forEach(node => node.addEventListener('change', () => { captureSetupForm(); render() }))
  if (state.page === 'setup' && ['network', 'data'].includes(state.setupSection) && !state.sslLoaded) void refreshSsl()
  document.querySelector('#restore-default-login-image')?.addEventListener('click', restoreDefaultAuthPortalImage)
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
        state.config.playNetworkMode = isPublicMode(mode) ? 'public' : mode
        state.config.creatorNetworkMode = isPublicMode(mode) ? 'public' : mode
        if (mode === 'public-shared') {
          state.config.publicAddressMode = 'shared'
          if (!state.config.sharedPublicAddress && state.config.playPublicAddressOverride) {
            try { const address = state.config.playPublicAddressOverride; const url = new URL(address.includes('://') ? address : `http://${address}`); state.config.sharedPublicAddress = `${url.protocol}//${url.hostname}` } catch {}
          }
        }
        else if (isPublicMode(mode)) state.config.publicAddressMode = 'independent'
        if (!isPublicMode(mode)) state.sslFiles = {}
        state.accessMode = mode
        render()
      }),
    )
}
