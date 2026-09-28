const KNOWN_MESSAGES = new Map([
  ['用户名或密码错误', '账号不存在或密码错误。请检查后重试。'],
  ['该玩家已被封禁', '该账号已被此服务器封禁。'],
  ['当前 IP 地址已被封禁', '当前网络地址已被此服务器限制登录。'],
  ['当前设备已被封禁', '当前设备已被此服务器限制登录。'],
  ['登录失败次数过多，请稍后再试', '登录尝试次数过多，请稍后再试。'],
  ['玩家服务响应超时', '服务器登录服务响应超时，请稍后重试。'],
  ['暂时无法连接玩家服务', '暂时无法连接服务器登录服务，请检查网络后重试。'],
  ['请求来源不受允许', '服务器暂不允许从此启动器登录。'],
])

/** Convert generated OpenAPI error responses into safe, actionable player copy. */
export function playerLoginErrorMessage(status, payload = {}) {
  const code = typeof payload?.code === 'string' ? payload.code : ''
  const serverMessage = typeof payload?.message === 'string' ? payload.message.trim() : ''

  if (code === 'PLAYER_SERVICE_TIMEOUT' || status === 504) {
    return '服务器登录服务响应超时，请稍后重试。'
  }
  if (code === 'PLAYER_SERVICE_UNAVAILABLE' || status === 502 || status === 503) {
    return '暂时无法连接服务器登录服务，请检查网络后重试。'
  }
  if (code === 'IP_BANNED' || serverMessage === '当前 IP 地址已被封禁') {
    return KNOWN_MESSAGES.get('当前 IP 地址已被封禁')
  }
  if (code === 'DEVICE_BANNED' || serverMessage === '当前设备已被封禁') {
    return KNOWN_MESSAGES.get('当前设备已被封禁')
  }
  if (code === 'PLAYER_BANNED' || serverMessage === '该玩家已被封禁') {
    const reason = typeof payload?.banReason === 'string' ? payload.banReason.trim() : ''
    return reason
      ? `该账号已被此服务器封禁。原因：${reason}`
      : KNOWN_MESSAGES.get('该玩家已被封禁')
  }
  if (serverMessage && KNOWN_MESSAGES.has(serverMessage)) {
    return KNOWN_MESSAGES.get(serverMessage)
  }
  if (code === 'RATE_LIMITED' || status === 429) {
    return '登录尝试次数过多，请稍后再试。'
  }
  if (status === 401) {
    return KNOWN_MESSAGES.get('用户名或密码错误')
  }
  if (status === 403) {
    return '服务器暂不允许此次登录。请联系服主确认账号、设备或网络是否受限。'
  }
  if (status === 400) {
    return '登录信息不完整或格式不正确，请检查账号和密码后重试。'
  }
  if (status >= 500) {
    return '服务器登录服务暂时不可用，请稍后重试。'
  }
  return '登录暂未成功，请检查账号信息或稍后重试。'
}

export function playerLoginConnectionError(error) {
  const message = typeof error?.message === 'string' ? error.message : ''
  if (message === '该服务器未配置玩家账号登录服务' || message === '服务器提供的玩家登录地址无效') {
    return message
  }
  return '无法连接服务器登录服务，请检查网络或稍后重试。'
}
