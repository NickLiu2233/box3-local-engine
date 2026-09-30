import { createApiClient } from '@box/apis'
import type { PlayerInvoke, ServerBootstrap } from '../types'

export interface PlayerApiOptions {
  invoke: PlayerInvoke
  isNative: () => boolean
}

const BOOTSTRAP_NOT_FOUND_RETRY_DELAY_MS = 250

export function resolveMapCoverUrl(endpoint: string, value: unknown, publicMapId: string): string {
  const base = new URL(endpoint)
  const fallback = new URL('/map-templates/blank-template.png', base).toString()
  const cover = typeof value === 'string' ? value.trim() : ''
  if (!cover) return fallback
  try {
    if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(cover)) return cover
    if (/^https?:\/\//i.test(cover)) {
      const url = new URL(cover)
      if (url.username || url.password) return fallback
      if (url.protocol === 'http:' && base.protocol === 'https:' && url.origin !== base.origin) return fallback
      return url.toString()
    }
    if (cover.startsWith('/') && !cover.startsWith('//')) return new URL(cover, base).toString()

    // Play manifests store covers as content hashes, not server-root paths.
    // Match the website's hashToUrl convention so files resolve through the
    // map-scoped Play block endpoint.
    if (!publicMapId) return fallback
    return new URL(
      `/runtime/play/${encodeURIComponent(publicMapId)}/block/${encodeURIComponent(cover)}`,
      base,
    ).toString()
  } catch {
    return fallback
  }
}

export function createPlayerApi({ invoke, isNative }: PlayerApiOptions) {
  async function fetchApi(endpoint: string, request: Request, authPortalBase = ''): Promise<Response> {
    if (!isNative()) return fetch(request)
    const base = new URL(endpoint)
    const target = new URL(request.url)
    const serverPath = `${base.pathname.replace(/\/$/, '')}/api/`
    const serverApi = target.origin === base.origin && target.pathname.startsWith(serverPath)
    const authApi = authPortalBase
      && target.origin === new URL(authPortalBase).origin
      && target.pathname.startsWith('/api/auth/')
    if (!serverApi && !authApi) {
      throw new Error('API 请求必须指向当前游玩服务器或其登录门户')
    }

    const body = ['GET', 'HEAD'].includes(request.method.toUpperCase()) ? null : await request.text()
    const result = await invoke('api_request', {
      request: {
        endpoint,
        url: request.url,
        method: request.method,
        headers: [...request.headers.entries()],
        body,
      },
    })
    return new Response(result.body || null, {
      status: result.status,
      headers: new Headers(result.headers),
    })
  }

  function client(endpoint: string, baseUrl = endpoint) {
    return createApiClient({
      baseUrl,
      fetch: (request) => fetchApi(endpoint, request, baseUrl !== endpoint ? baseUrl : ''),
    })
  }

  function authClient(endpoint: string, bootstrap: ServerBootstrap) {
    const loginUrl = String(bootstrap?.loginApiUrl || '')
    if (!loginUrl) throw new Error('该服务器未配置玩家账号登录服务')
    const url = new URL(loginUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/api/auth/login' || url.username || url.password || url.search || url.hash) {
      throw new Error('服务器提供的玩家登录地址无效')
    }
    return client(endpoint, url.origin)
  }

  return {
    async readBootstrap(endpoint) {
      const bootstrapClient = client(endpoint)
      let result = await bootstrapClient.getApiPlayerLauncherBootstrapRaw()
      if (result.response.status === 404) {
        await new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_NOT_FOUND_RETRY_DELAY_MS))
        result = await bootstrapClient.getApiPlayerLauncherBootstrapRaw()
      }
      const { data, response } = result
      if (response.status === 404) return { supported: false, serverName: '', loginRequired: false }
      if (!response.ok) throw new Error(`读取服务器启动器支持信息失败（HTTP ${response.status}）`)
      return { supported: true, ...(data || {}) }
    },
    async verifyServer(endpoint) {
      const { data, response } = await client(endpoint).getApiHealthCheckRaw()
      if (!response.ok) throw new Error(`服务器已响应（HTTP ${response.status}），但没有通过 BOX3 游玩端检查`)
      if (data?.status !== 'ok' || (data.runtime && data.runtime !== 'ready')) {
        throw new Error('游玩端尚未就绪，请稍后重试')
      }
    },
    readSession(endpoint, bootstrap) {
      return authClient(endpoint, bootstrap).getApiAuthSessionRaw()
    },
    async getMaps(endpoint) {
      const result = await client(endpoint).getApiPlayerLauncherMapsRaw()
      if (!Array.isArray(result.data?.worlds)) return result
      const worlds = await Promise.all(result.data.worlds.map(async (world) => {
        const coverUrl = resolveMapCoverUrl(endpoint, world.cover, world.publicId)
        if (!isNative() || !coverUrl.startsWith(`${new URL(endpoint).origin}/`)) {
          return { ...world, cover: coverUrl }
        }
        try {
          return {
            ...world,
            cover: await invoke('fetch_public_image', { endpoint, url: coverUrl }),
          }
        } catch {
          return { ...world, cover: '' }
        }
      }))
      return {
        ...result,
        data: {
          ...result.data,
          worlds,
        },
      }
    },
    updateProfile(endpoint, changes) {
      return client(endpoint).patchApiPlayProfileRaw({ body: changes })
    },
    getDescriptor(endpoint, mapId) {
      return client(endpoint).getApiPlayerLauncherMapsMapIdDescriptorRaw({
        params: { path: { mapId } },
      })
    },
    getDownloadPlan(endpoint, mapId) {
      return client(endpoint).getApiPlayerLauncherMapsMapIdDownloadPlanRaw({
        params: { path: { mapId } },
      })
    },
    verifyDescriptor(descriptor, trustedSigningKey) {
      if (!isNative()) return Promise.reject(new Error('地图签名验证只能在 BOX3 玩家启动器中进行'))
      return invoke('verify_map_descriptor', {
        descriptor: JSON.stringify(descriptor),
        trustedSigningKey: JSON.stringify(trustedSigningKey),
      })
    },
    launchMap(serverId, descriptor, trustedSigningKey, mapName, launchTicket) {
      if (!isNative()) return Promise.reject(new Error('安全启动地图只能从 BOX3 玩家启动器进行'))
      return invoke('launch_map', {
        serverId,
        descriptor: JSON.stringify(descriptor),
        trustedSigningKey: JSON.stringify(trustedSigningKey),
        mapName,
        launchTicket,
      })
    },
    login(endpoint, bootstrap, username, password) {
      return authClient(endpoint, bootstrap).postApiAuthLoginRaw({ body: { username, password } })
    },
    logout(endpoint, bootstrap) {
      return authClient(endpoint, bootstrap).postApiAuthLogoutRaw({ body: {} })
    },
  }
}
