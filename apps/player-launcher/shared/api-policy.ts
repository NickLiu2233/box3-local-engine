import { apiOperations } from '@box/apis'

// Routes come from the generated OpenAPI registry; the desktop bridge exposes
// only the operations used by players.
const playerOperations = [
  apiOperations.getApiHealthCheck,
  apiOperations.getApiPlayerLauncherBootstrap,
  apiOperations.getApiPlayerLauncherMaps,
  apiOperations.getApiPlayerLauncherMapsMapIdDescriptor,
  apiOperations.getApiPlayerLauncherMapsMapIdDownloadPlan,
  apiOperations.patchApiPlayProfile,
  apiOperations.getApiPlayLibrary,
  apiOperations.patchApiPlayLibrary,
]
const authOperations = [
  apiOperations.postApiAuthLogin,
  apiOperations.postApiAuthLogout,
  apiOperations.getApiAuthSession,
]

function matches(
  path: string,
  method: string | undefined,
  operation: { path: string; method: string },
): boolean {
  const pattern = operation.path
    .split('/')
    .map((part) => (part.startsWith('{') ? '[^/]+' : part))
    .join('/')
  return (
    new RegExp(`^${pattern}$`).test(path) && (!method || method.toUpperCase() === operation.method)
  )
}

export function isAllowedPlayerApi(
  endpoint: URL,
  target: URL,
  authOrigin?: string,
  method?: string,
): boolean {
  if (target.username || target.password || target.hash) return false
  const basePath = endpoint.pathname.replace(/\/$/, '')
  const localPath = target.pathname.slice(basePath.length)
  const serverApi =
    target.origin === endpoint.origin &&
    target.pathname.startsWith(`${basePath}/`) &&
    [...playerOperations, ...authOperations].some((operation) =>
      matches(localPath, method, operation),
    )
  const authApi =
    authOrigin &&
    target.origin === authOrigin &&
    authOperations.some((operation) => matches(target.pathname, method, operation))
  return Boolean(serverApi || authApi)
}

export const playerLoginPath = apiOperations.postApiAuthLogin.path
export const playerBootstrapPath = apiOperations.getApiPlayerLauncherBootstrap.path
