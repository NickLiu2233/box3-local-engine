import { createApiClient } from '@box/apis'

export function createPlayerApi({ invoke, isNative }) {
  let activeInstallContext = null

  async function fetchApi(endpoint, request, authPortalBase = '') {
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

    const installHeader = request.headers.get('x-box-local-map-install')
    if (installHeader === '1' && !activeInstallContext) {
      throw new Error('地图资源安装请求上下文已失效，请重新准备地图。')
    }
    if (installHeader === '1' && activeInstallContext) {
      const install = activeInstallContext
      const result = await invoke('install_map_asset', {
        payload: {
          request: {
            endpoint,
            url: request.url,
            method: request.method,
            headers: [...request.headers.entries()],
            body: null,
          },
          descriptor: JSON.stringify(install.descriptor),
          trustedSigningKey: JSON.stringify(install.trustedSigningKey),
          hash: install.hash,
        },
      })
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Box-Downloaded-Bytes': String(result.bytesWritten || 0),
          'X-Box-Already-Present': String(result.alreadyPresent === true),
        },
      })
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

  function client(endpoint, baseUrl = endpoint) {
    return createApiClient({
      baseUrl,
      fetch: (request) => fetchApi(endpoint, request, baseUrl !== endpoint ? baseUrl : ''),
    })
  }

  function authClient(endpoint, bootstrap) {
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
      if (response.status === 404) return { supported: false, serverName: '', resourceAccessEnabled: false, loginRequired: false }
      if (!response.ok) throw new Error(`读取服务器开放状态失败（HTTP ${response.status}）`)
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
    getAssetResumeOffset(descriptor, trustedSigningKey, hash) {
      if (!isNative()) return Promise.resolve(0)
      return invoke('get_map_asset_resume_offset', {
        descriptor: JSON.stringify(descriptor),
        trustedSigningKey: JSON.stringify(trustedSigningKey),
        hash,
      })
    },
    installAsset(endpoint, mapId, asset, descriptor, trustedSigningKey, plan, resumeFrom = 0) {
      activeInstallContext = { descriptor, trustedSigningKey, hash: asset.hash }
      return client(endpoint)
        .getApiPlayerLauncherMapsMapIdBlobsHashRaw({
          params: {
            path: { mapId, hash: asset.hash },
            query: { digest: plan.manifestDigest, ticket: plan.ticket },
          },
          headers: {
            'X-Box-Local-Map-Install': '1',
            ...(resumeFrom > 0 ? { Range: `bytes=${resumeFrom}-` } : {}),
          },
          parseAs: 'stream',
        })
        .finally(() => { activeInstallContext = null })
    },
    preparePackage(descriptor, trustedSigningKey) {
      if (!isNative()) return Promise.reject(new Error('地图资源只能在 BOX3 玩家启动器中保存'))
      return invoke('prepare_map_package', {
        descriptor: JSON.stringify(descriptor),
        trustedSigningKey: JSON.stringify(trustedSigningKey),
      })
    },
    commitPackage(descriptor, trustedSigningKey) {
      if (!isNative()) return Promise.reject(new Error('地图资源只能在 BOX3 玩家启动器中保存'))
      return invoke('commit_map_package', {
        descriptor: JSON.stringify(descriptor),
        trustedSigningKey: JSON.stringify(trustedSigningKey),
      })
    },
    launchMap(serverId, descriptor, trustedSigningKey, mapName) {
      if (!isNative()) return Promise.reject(new Error('安全启动地图只能从 BOX3 玩家启动器进行'))
      return invoke('launch_map', {
        serverId,
        descriptor: JSON.stringify(descriptor),
        trustedSigningKey: JSON.stringify(trustedSigningKey),
        mapName,
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
