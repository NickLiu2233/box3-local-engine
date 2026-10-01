import type { PlayerLauncherState } from '../types'

export function createInitialState(): PlayerLauncherState {
  return {
    servers: [],
    selectedId: '',
    page: 'home',
    busy: false,
    endpointInput: '',
    editingServerId: '',
    serverNameInput: '',
    serverBootstrap: null,
    player: null,
    playerMenuOpen: false,
    playerSettingsOpen: false,
    playerProfileName: '',
    playerProfileSkinId: 'explorer',
    playerProfileError: '',
    worlds: [],
    preparingMapId: '',
    authError: '',
    mapsError: '',
    confirmRemoveServerId: '',
    pendingServerEndpoint: '',
    serverAddressNotice: null,
    error: '',
    notice: '',
    mapSearch: '',
    activeGame: null,
    launchStage: '',
  }
}
