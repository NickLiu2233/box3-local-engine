/**
 * Domain records consumed by the player-admin modules.
 *
 * Keep transport shapes here rather than in individual screens.  This is the
 * seam between the UI and the player-admin HTTP client: a screen may compose
 * these records, but must not redefine their wire format.
 */
import type { PlayerAdminView } from '../../game/shared/player-admin-navigation'

export type Player = {
  subjectId: string
  userId: string
  username: string
  displayName: string
  boxId: string
  userKey?: string
  status: 'active' | 'banned'
  guest: boolean
  createdAt?: string
  registeredAt?: string
  lastSeenAt?: string
  lastLoginAt?: string
  firstSeenIp?: string
  registrationIp?: string
  lastLoginIp?: string
  lastSeenIp?: string
  loginCount: number
  activeSessionCount: number
  tags: string[]
  adminNote: string
  banReason?: string
  bannedUntil?: string
  creatorAccess?: boolean
  creatorPermissions?: string[]
  activeCreatorTokenCount?: number
}

export type Actor = {
  displayName: string
  username?: string
  role: 'moderator' | 'admin' | 'owner'
  credential: string
  permissions: string[]
}

export type Activity = {
  id: string
  kind: 'login' | 'admin'
  action: string
  actor: string
  actorDisplayName: string
  subjectId: string
  displayName: string
  username: string
  ip: string
  userAgent?: string
  details?: Record<string, unknown>
  createdAt: string
}

export type Admin = {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'moderator'
  status: 'active' | 'disabled'
  permissionGroupId?: string
  permissionGroupName?: string
  lastLoginAt?: string
}

export type Group = {
  id: string
  name: string
  permissions: string[]
  adminCount: number
  createdAt?: string
}

export type Detail = {
  player: Player
  cliTokens: Array<{
    id: string
    name: string
    scopes: string[]
    createdAt: string
    lastUsedAt?: string
    lastUsedIp?: string
    revokedAt?: string
  }>
  sessions: Array<{
    sessionId: string
    createdAt: string
    lastSeenAt: string
    expiresAt?: string
    createdIp?: string
    lastSeenIp?: string
    userAgent: string
    deviceHash?: string
    deviceId?: string
  }>
  loginHistory: Array<{
    createdAt: string
    ip: string
    userAgent: string
    deviceHash?: string
    deviceId?: string
  }>
  adminHistory: Array<{
    id: string
    action: string
    actor: string
    actorDisplayName: string
    createdAt: string
  }>
  relatedAccounts: Array<{
    subjectId: string
    displayName: string
    username: string
    sharedIp: string
    lastSeenAt: string
  }>
  identityBans: Array<{
    id: string
    kind: 'ip' | 'device'
    displayValue: string
    reason: string
    bannedAt: string
    bannedUntil?: string
  }>
}

export type IdentityBan = {
  id: string
  kind: 'ip' | 'device'
  displayValue: string
  reason: string
  bannedAt: string
  bannedUntil?: string
  sourceSubjectId?: string
  sourceDisplayName: string
  sourceUsername: string
}

export type PlayMap = {
  id: string
  permanentMapId: string
  publicId: string
  name: string
  author: string
  description: string
  cover: string
  version: string
  mapGroupId: string
  mapRole: 'main' | 'submap'
  mainProjectId: string
  playEnabled: boolean
}

export type PlayMapResourceStatus = { id: string; bytes: number; importedAt: string }
export type PlayMapTableRow = {
  key: string
  kind: 'group' | 'submap'
  map: PlayMap
  mapCount?: number
  resourceBytes?: number
  children?: PlayMapTableRow[]
}

export type PlayBundleReview = {
  id: string
  expiresAt: string
  mapCount: number
  totalBytes: number
  blobCount: number
  unindexedBlobCount: number
  worlds: Array<{ id: string; name: string; mapRole: 'main' | 'submap'; version: string }>
  resources: Array<{ id: string; worldId: string; name: string; kind: string; mimeType: string; bytes: number; previewable: boolean; scriptTarget?: string }>
  warnings: string[]
}

export type RuntimeStatus = {
  phase: string
  percent: number
  message: string
  cpuPercent?: number
  memoryBytes?: number
  uptimeMs?: number
  processCount?: number
  onlineCount?: number
  rooms?: Array<{ roomId: string; active: boolean }>
}

export type ContainerProfile = {
  permanentMapId: string
  mode: 'play'
  playerLimit: number
  roomLimit: number
  idleTimeoutMs: number
  cpuMilli: number | null
  memoryMb: number | null
  resourceGroupId?: string
  configurationScope: 'group' | 'map'
  configurationRootId: string
}

export type ContainerResourceGroup = {
  id?: string
  name: string
  cpuMilli: number
  memoryMb: number
  description: string
  networkPolicy: 'unrestricted' | 'private'
  processLimit: number
  bandwidthMbps: number | null
}

export type ContainerMap = {
  id: string
  permanentMapId: string
  name: string
  version?: string
  mapGroupId?: string
  mapRole: 'main' | 'submap'
  mainProjectId: string
  status: RuntimeStatus
  profile?: ContainerProfile
}

export type ContainerRuntimeRow = ContainerMap & { children?: ContainerRuntimeRow[] }
export type ContainerCatalog = {
  mode: 'play' | 'creator'
  defaults: Pick<ContainerProfile, 'playerLimit' | 'roomLimit' | 'idleTimeoutMs' | 'cpuMilli' | 'memoryMb'>
  profiles: ContainerProfile[]
  resourceGroups: ContainerResourceGroup[]
  availableMaps: Array<Pick<ContainerMap, 'permanentMapId' | 'name' | 'version' | 'mapGroupId'> & { memberCount?: number }>
  allMaps: Array<Pick<ContainerMap, 'permanentMapId' | 'name' | 'version' | 'mapGroupId'>>
  maps: ContainerMap[]
}

export type View = PlayerAdminView
