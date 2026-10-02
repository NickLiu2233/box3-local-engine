import { bindServicesEvents } from './bindings/services.js'
import { bindNavigationEvents } from './bindings/navigation.js'
import { bindLicenseAboutEvents } from './bindings/license-about.js'
import { bindRuntimesEvents } from './bindings/runtimes.js'
import { bindBackupsEvents } from './bindings/backups.js'
import { bindConfigurationEvents } from './bindings/configuration.js'

export function bindEvents() {
  bindServicesEvents()
  bindNavigationEvents()
  bindLicenseAboutEvents()
  bindRuntimesEvents()
  bindBackupsEvents()
  bindConfigurationEvents()
}
