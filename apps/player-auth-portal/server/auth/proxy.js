'use strict'

// 所有账号操作共用完整安全流程，避免某个页面漏掉 Cookie/来源/注册策略。
const { sendJSON, sendError } = require('../http/response')
const { readJSONBody } = require('../http/body')
const { requestProtocol, isSameOriginRequest, clientAddress } = require('../security/request')
const { trustedReturnURL } = require('../security/navigation')

function responseCookies(headers) {
  // Cookie 的 Expires 可能自带逗号，不能 join/split(',')。
  // Node 22 原生 fetch 支持 getSetCookie；备用分支仅兼容测试/旧 HTTP 实现。
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const cookie = headers.get('set-cookie')
  return cookie ? [cookie] : []
}

async function proxyAuthentication(request, response, config, operation) {
  if (operation.method !== request.method) {
    response.setHeader('Allow', operation.method)
    return sendError(response, 405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
  }
  if (operation.name === 'register' && config.registrationEnabled === false) {
    // 隐藏注册按钮不构成权限检查，直接请求接口也必须被拒绝。
    return sendError(response, 403, 'REGISTRATION_DISABLED', '服主已关闭玩家注册')
  }
  if (operation.method !== 'GET' && !isSameOriginRequest(request, config)) {
    return sendError(response, 403, 'ORIGIN_NOT_ALLOWED', '请求来源不受允许')
  }

  let browserBody = {}
  if (operation.method !== 'GET') browserBody = await readJSONBody(request)
  const selfService = operation.name === 'profile' || operation.name === 'password'
  if (selfService) {
    const fields = operation.name === 'profile' ? ['displayName'] : ['currentPassword', 'newPassword']
    if (Object.keys(browserBody).some(key => !fields.includes(key))) {
      return sendError(response, 400, 'INVALID_INPUT', '请求包含不支持的账号字段')
    }
  }
  const source = String(browserBody.source || operation.search.get('source') || '')
  const requestedReturnURL = String(
    browserBody.returnUrl || operation.search.get('returnUrl') || '',
  )
  const returnUrl = trustedReturnURL(source, requestedReturnURL, config)
  let upstreamBody
  // 只提取账号字段。returnUrl 属于导航，不是底层身份或权限参数。
  if (operation.name === 'login') {
    upstreamBody = {
      username: browserBody.username,
      password: browserBody.password,
    }
  } else if (operation.name === 'register') {
    upstreamBody = {
      username: browserBody.username,
      displayName: browserBody.displayName,
      password: browserBody.password,
    }
  } else if (operation.name === 'profile') {
    upstreamBody = { displayName: browserBody.displayName }
  } else if (operation.name === 'password') {
    upstreamBody = { currentPassword: browserBody.currentPassword, newPassword: browserBody.newPassword }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)
  timeout.unref()
  try {
    const upstreamHeaders = {
      'Accept': 'application/json',
      'X-Box-Player-Auth-Key': config.apiKey,
      'User-Agent': String(request.headers['user-agent'] || '').slice(0, 512),
      'X-Forwarded-Proto': requestProtocol(request, config),
    }
    const cookie = String(request.headers.cookie || '')
    // 两个 HttpOnly Cookie 都交由浏览器与上游管理，门户不创建自己的会话表。
    if (cookie) upstreamHeaders.Cookie = cookie
    const address = clientAddress(request, config)
    if (address) {
      upstreamHeaders['X-Forwarded-For'] = address
      upstreamHeaders['X-Real-IP'] = address
    }
    if (upstreamBody) upstreamHeaders['Content-Type'] = 'application/json'

    const upstream = await fetch(
      new URL(`/api/player-auth/${operation.name}`, config.playerServiceURL),
      {
        method: operation.method,
        headers: upstreamHeaders,
        body: upstreamBody ? JSON.stringify(upstreamBody) : undefined,
        redirect: 'manual',
        signal: controller.signal,
      },
    )
    const parsed = await upstream.json().catch(() => null)
    const validResponse = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    const data =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {
            code: 'INVALID_UPSTREAM_RESPONSE',
            message: '玩家服务返回了无法解析的响应',
          }
    if (operation.name === 'session') {
      data.registrationEnabled =
        config.registrationEnabled !== false && data.registrationEnabled !== false
    }
    if (returnUrl && !selfService) data.returnUrl = returnUrl
    const headers = {}
    const cookies = responseCookies(upstream.headers)
    if (cookies.length) headers['Set-Cookie'] = cookies
    const retryAfter = upstream.headers.get('retry-after')
    if (retryAfter) headers['Retry-After'] = retryAfter
    // 上游返回 HTML/空正文时不能把 200 包装为“成功”，否则页面会误判已登录。
    return sendJSON(response, validResponse ? upstream.status : 502, data, headers)
  } catch (error) {
    const timeoutError = error && error.name === 'AbortError'
    if (operation.name === 'session') {
      return sendJSON(response, 502, {
        code: timeoutError ? 'PLAYER_SERVICE_TIMEOUT' : 'PLAYER_SERVICE_UNAVAILABLE',
        message: timeoutError ? '玩家服务响应超时' : '暂时无法连接玩家服务',
        registrationEnabled: config.registrationEnabled !== false,
      })
    }
    return sendError(
      response,
      502,
      timeoutError ? 'PLAYER_SERVICE_TIMEOUT' : 'PLAYER_SERVICE_UNAVAILABLE',
      timeoutError ? '玩家服务响应超时' : '暂时无法连接玩家服务',
    )
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { proxyAuthentication }
