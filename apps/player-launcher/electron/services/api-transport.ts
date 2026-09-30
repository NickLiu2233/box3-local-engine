import type { ApiRequest, ApiResponse, ApiTransport } from '../types'

const MAX_API_RESPONSE_BYTES = 16 * 1024 * 1024
const PLAYER_COOKIE_NAMES = new Set(['box_local_player_session', 'box_local_player_device'])
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])
const BLOCKED_REQUEST_HEADERS = new Set(['host', 'origin', 'referer', 'content-length', 'cookie'])

function isLoopback(host: string): boolean {
  const normalized = String(host || '').toLowerCase().replace(/^\[|\]$/g, '')
  return normalized === 'localhost' || normalized.endsWith('.localhost') || normalized === '::1' || /^127(?:\.\d{1,3}){3}$/.test(normalized)
}

function normalizeEndpoint(value: string): URL {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw || /\s/.test(raw)) throw new Error('请输入有效的游玩端服务器 IP 或域名')
  const hasScheme = raw.includes('://')
  let endpoint: URL
  try { endpoint = new URL(hasScheme ? raw : `https://${raw}`) } catch {
    throw new Error('请输入有效的游玩端服务器 IP 或域名')
  }
  if (!['http:', 'https:'].includes(endpoint.protocol) || !endpoint.hostname || endpoint.username || endpoint.password) {
    throw new Error('游玩端服务器地址无效')
  }
  if (!hasScheme && isLoopback(endpoint.hostname)) endpoint.protocol = 'http:'
  return endpoint
}

function cookieChanges(setCookieHeaders: string[]): Map<string, string | null> {
  const changes = new Map<string, string | null>()
  for (const header of setCookieHeaders) {
    const [pair = '', ...attributes] = String(header).split(';')
    const separator = pair.indexOf('=')
    if (separator < 1) continue
    const name = pair.slice(0, separator).trim()
    const value = pair.slice(separator + 1).trim()
    if (!PLAYER_COOKIE_NAMES.has(name)) continue
    const expires = attributes.some((attribute) => /^\s*max-age\s*=\s*-?\d+\s*$/i.test(attribute) && Number(attribute.split('=')[1]) <= 0)
    changes.set(name, expires || !value ? null : `${name}=${value}`)
  }
  return changes
}

function mergeCookies(existing: string, setCookieHeaders: string[]): string {
  const cookies = new Map<string, string>()
  for (const pair of String(existing || '').split(';')) {
    const separator = pair.indexOf('=')
    if (separator > 0) cookies.set(pair.slice(0, separator).trim(), pair.trim())
  }
  for (const [name, value] of cookieChanges(setCookieHeaders)) {
    if (value) cookies.set(name, value)
    else cookies.delete(name)
  }
  return [...cookies].sort(([left], [right]) => left.localeCompare(right)).map(([, pair]) => pair).join('; ')
}

function validateRequestUrl(endpointUrl: URL, rawUrl: string, authPortalOrigin?: string): URL {
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new Error('API 请求地址无效') }
  const basePath = endpointUrl.pathname.replace(/\/$/, '')
  const isServerApi = url.origin === endpointUrl.origin && url.pathname.startsWith(`${basePath}/api/`)
  const isAuthApi = authPortalOrigin
    && url.origin === authPortalOrigin
    && ['/api/auth/login', '/api/auth/logout', '/api/auth/session'].includes(url.pathname)
  if ((!isServerApi && !isAuthApi) || url.username || url.password || url.hash) {
    throw new Error('API 请求必须指向当前游玩服务器的 /api/ 接口')
  }
  return url
}

function rememberAuthPortal(endpoint: string, body: string, origins: Map<string, string>): void {
  origins.delete(endpoint)
  try {
    const bootstrap = JSON.parse(body)
    const loginUrl = new URL(bootstrap.loginApiUrl)
    const allowedScheme = loginUrl.protocol === 'https:' || (loginUrl.protocol === 'http:' && isLoopback(loginUrl.hostname))
    if (allowedScheme && loginUrl.pathname === '/api/auth/login' && !loginUrl.username && !loginUrl.password && !loginUrl.search && !loginUrl.hash) {
      origins.set(endpoint, loginUrl.origin)
    }
  } catch { /* A malformed bootstrap cannot authorize an external login origin. */ }
}

export function createApiTransport({ fetchImpl = globalThis.fetch, timeoutMs = 8_000 }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): ApiTransport {
  const playerCookies = new Map<string, string>()
  const authOrigins = new Map<string, string>()

  return Object.freeze({
    async request({ endpoint: rawEndpoint, url: requestUrl, method: rawMethod, headers = [], body = null }: ApiRequest): Promise<ApiResponse> {
      const endpointUrl = normalizeEndpoint(rawEndpoint)
      const endpoint = endpointUrl.toString().replace(/\/$/, '')
      const targetUrl = validateRequestUrl(endpointUrl, requestUrl, authOrigins.get(endpoint))
      const method = String(rawMethod || '').toUpperCase()
      if (!ALLOWED_METHODS.has(method)) throw new Error('不支持的 API 请求方法')
      const requestHeaders = new Headers()
      for (const [name, value] of headers) {
        if (!BLOCKED_REQUEST_HEADERS.has(String(name).toLowerCase())) requestHeaders.set(name, value)
      }
      const existingCookies = playerCookies.get(endpoint) || ''
      if (existingCookies) requestHeaders.set('cookie', existingCookies)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let response: Response
      try {
        response = await fetchImpl(targetUrl, {
          method,
          headers: requestHeaders,
          body: ['GET', 'HEAD'].includes(method) ? undefined : body,
          redirect: 'manual',
          signal: controller.signal,
        })
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('API 请求超时，请稍后重试')
        throw new Error('无法连接到游玩端服务器，请检查地址和网络')
      } finally {
        clearTimeout(timer)
      }
      if (Number(response.headers.get('content-length')) > MAX_API_RESPONSE_BYTES) {
        await response.body?.cancel()
        throw new Error('服务器 API 响应超过启动器安全上限')
      }
      const chunks: Uint8Array[] = []
      let responseBytes = 0
      if (response.body) {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          responseBytes += value.byteLength
          if (responseBytes > MAX_API_RESPONSE_BYTES) {
            await reader.cancel()
            throw new Error('服务器 API 响应超过启动器安全上限')
          }
          chunks.push(value)
        }
      }
      const bytes = new Uint8Array(responseBytes)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      let text: string
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch {
        throw new Error('服务器 API 响应不是有效文本')
      }
      const setCookieHeaders = response.headers.getSetCookie?.() || []
      if (setCookieHeaders.length) {
        const merged = mergeCookies(existingCookies, setCookieHeaders)
        if (merged) playerCookies.set(endpoint, merged)
        else playerCookies.delete(endpoint)
      }
      if (targetUrl.pathname.endsWith('/api/player-launcher/bootstrap')) rememberAuthPortal(endpoint, text, authOrigins)
      const responseHeaders = [...response.headers.entries()].filter(([name]) => name !== 'set-cookie')
      return { status: response.status, headers: responseHeaders, body: text }
    },
    clear(endpoint) {
      const normalized = normalizeEndpoint(endpoint).toString().replace(/\/$/, '')
      playerCookies.delete(normalized)
    },
    forget(endpoint) {
      const normalized = normalizeEndpoint(endpoint).toString().replace(/\/$/, '')
      playerCookies.delete(normalized)
      authOrigins.delete(normalized)
    },
    cookies(endpoint) {
      const normalized = normalizeEndpoint(endpoint).toString().replace(/\/$/, '')
      return String(playerCookies.get(normalized) || '')
        .split(';')
        .map((part) => part.trim().split('='))
        .filter(([name]) => PLAYER_COOKIE_NAMES.has(name))
        .map(([name, value]) => [name, value || ''] as [string, string])
    },
  })
}

export { mergeCookies, normalizeEndpoint, validateRequestUrl }
