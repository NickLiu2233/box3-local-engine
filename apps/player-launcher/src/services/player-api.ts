import { createApiClient } from '@box/apis'
import type { PlayerInvoke, ServerBootstrap } from '../types'

export interface PlayerApiOptions {
  invoke: PlayerInvoke
  isNative: () => boolean
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
      const { data, response } = await client(endpoint).getApiPlayerLauncherBootstrapRaw()
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
    getMaps(endpoint) {
      return client(endpoint).getApiPlayerLauncherMapsRaw()
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
