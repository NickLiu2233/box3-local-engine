/**
 * Shared request seam for every player-admin module.
 *
 * The client owns cookie credentials, CSRF and error normalization so screens
 * only describe the operation they need.  Keep path construction here too: it
 * avoids subtly different escaping rules across management screens.
 */
const csrfToken = () =>
  typeof document === 'undefined'
    ? ''
    : decodeURIComponent(
        document.cookie
          .split('; ')
          .find((entry) => entry.startsWith('box_local_admin_csrf='))
          ?.split('=')
          .slice(1)
          .join('=') || '',
      )

export const playerAdminApi = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const method = (init?.method || 'GET').toUpperCase()
  const csrf = !['GET', 'HEAD', 'OPTIONS'].includes(method) ? csrfToken() : ''
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-Box-Admin-Csrf': csrf } : {}),
      ...(init?.headers || {}),
    },
    credentials: 'same-origin',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || '请求失败，请稍后重试')
  return data as T
}

const escaped = (value: string) => encodeURIComponent(value)

export const playerAdminRoutes = {
  activity: '/api/play-admin/activity',
  admins: '/api/play-admin/admins',
  admin: (id: string) => `/api/play-admin/admins/${escaped(id)}`,
  containers: '/api/play-admin/containers',
  container: (mapId: string) => `/api/play-admin/containers/${escaped(mapId)}`,
  containerResourceGroups: '/api/play-admin/container-resource-groups',
  containerResourceGroup: (id: string) =>
    `/api/play-admin/container-resource-groups/${escaped(id)}`,
  identityBans: '/api/play-admin/identity-bans',
  login: '/api/play-admin/login',
  libraryImport: '/api/play-admin/library/import',
  libraryWorlds: '/api/play-admin/library/worlds',
  libraryWorld: (id: string) => `/api/play-admin/library/worlds/${escaped(id)}`,
  libraryWorldStatus: '/api/play-admin/library/world-status',
  permissionGroups: '/api/play-admin/permission-groups',
  permissionGroup: (id: string) => `/api/play-admin/permission-groups/${escaped(id)}`,
  player: (subjectId: string) => `/api/play-admin/players/${escaped(subjectId)}`,
  players: '/api/play-admin/players',
  playerBatch: '/api/play-admin/players/batch',
  playerExport: '/api/play-admin/players/export',
  playerOverview: '/api/play-admin/players/overview',
  ownerSession: '/api/play-admin/owner-session',
  selfPassword: '/api/play-admin/self-password',
  verify: '/api/play-admin/verify',
} as const
