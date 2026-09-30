export type LauncherPage = 'home' | 'servers' | 'add-server' | 'packages'

export interface PlayerServer {
  id: string
  endpoint: string
  name: string
}

export interface SigningKey {
  keyId: string
  publicKey: { kty: string; crv: string; x: string; y: string }
}

export interface ServerBootstrap {
  supported?: boolean
  serverName?: string
  loginRequired?: boolean
  loginApiUrl?: string
  signingKey?: SigningKey
  loading?: boolean
  error?: string
}

export interface PlayerAccount {
  username: string
  displayName?: string
  avatarSkinId?: string
  [key: string]: unknown
}

export interface PlayWorld {
  id: string
  publicId?: string
  name: string
  description?: string
  author?: string
  cover?: string
  loadingCover?: string
  version?: string
  onlineCount?: number
  [key: string]: unknown
}

export interface PlayerLauncherState {
  servers: PlayerServer[]
  selectedId: string
  page: LauncherPage
  busy: boolean
  endpointInput: string
  editingServerId: string
  serverNameInput: string
  serverBootstrap: ServerBootstrap | null
  player: PlayerAccount | null
  playerMenuOpen: boolean
  playerSettingsOpen: boolean
  playerProfileName: string
  playerProfileSkinId: string
  playerProfileError: string
  worlds: PlayWorld[]
  preparingMapId: string
  authError: string
  mapsError: string
  confirmRemoveServerId: string
  pendingServerEndpoint: string
  serverAddressNotice: { title: string; message: string } | null
  error: string
  notice: string
  theme: string
  themeMenuOpen: boolean
}

export type PlayerInvoke = (command: string, payload?: Record<string, any>) => Promise<any>
export type RemoteApi = Record<string, any>
