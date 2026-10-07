import { captureSetupForm } from '../configuration/form.js'
import { invoke } from '../infrastructure/transport.js'
import { render } from '../core/render-request.js'
import { state } from '../core/state.js'

export async function refreshManagedServiceInfo() {
  try {
    const [managedDatabaseInfo, managedRedisInfo] = await Promise.all([
      invoke('get_managed_service_info', { service: 'postgresql' }),
      invoke('get_managed_service_info', { service: 'redis' }),
    ])
    if (state.page === 'setup') captureSetupForm()
    state.managedDatabaseInfo = managedDatabaseInfo
    state.managedRedisInfo = managedRedisInfo
  } catch (error) {
    state.error = String(error)
  } finally {
    if (state.page === 'setup') render()
  }
}

export async function refreshStatus() {
  try {
    const [status, config, about, managedDatabaseInfo, managedRedisInfo, dataStorage] =
      await Promise.all([
        invoke('get_system_status'),
        invoke('get_install_config'),
        invoke('get_about_info'),
        invoke('get_managed_service_info', { service: 'postgresql' }),
        invoke('get_managed_service_info', { service: 'redis' }),
        invoke('get_data_storage_info'),
      ])
    state.status = status
    state.dockerCheck = {
      cliAvailable: status.dockerCliAvailable,
      cliVersion: status.dockerCliVersion,
      engineReady: status.dockerReady,
      message: status.dockerMessage,
    }
    state.config = config
    state.savedAuthPortalImage = config.authPortalImage || ''
    state.about = about
    state.managedDatabaseInfo = managedDatabaseInfo
    state.managedRedisInfo = managedRedisInfo
    state.dataStorage = dataStorage
    state.accessMode = ''
    state.environmentFile = await invoke('get_raw_environment')
    state.environmentFileLoaded = true
  } catch (error) {
    state.status = {
      dockerReady: false,
      dockerCliAvailable: false,
      dockerCliVersion: '',
      dockerMessage: String(error),
      configured: false,
      services: [],
    }
    state.dockerCheck = null
  }
  render()
}
