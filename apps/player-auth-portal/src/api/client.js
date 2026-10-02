// 浏览器仅调用同源门户；密钥、设备绑定和真实账号校验均在服务端。


export function errorMessage(error) {
  if (error?.name === 'AbortError') return '请求超时，请稍后重试；不要连续重复提交。'
  if (error instanceof Error && error.banReason) {
    const deadline = error.bannedUntil
      ? new Date(error.bannedUntil).toLocaleString('zh-CN')
      : '永久'
    return `该玩家已被封禁\n封禁原因：${error.banReason}\n封禁期限：${deadline}`
  }
  return error instanceof Error ? error.message : '请求失败，请稍后重试'
}

export async function api(path, options = {}) {
  // HttpOnly 会话/设备 Cookie 由浏览器携带；页面不读 token，不加服务密钥。
  const controller = new AbortController()
  // 比默认后端 10 秒超时略长，优先显示后端提供的明确错误。
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options,
      signal: options.signal || controller.signal,
    })
    const data = await response.json().catch(() => null)
    const valid = data && typeof data === 'object' && !Array.isArray(data)
    if (!response.ok || !valid) {
      const error = new Error(data?.message || `请求失败（HTTP ${response.status}）`)
      error.status = valid ? response.status : 502
      error.code = data?.code
      error.retryAfter = response.headers.get('retry-after')
      error.registrationEnabled = data?.registrationEnabled
      error.banReason = data?.banReason
      error.bannedUntil = data?.bannedUntil
      throw error
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}
