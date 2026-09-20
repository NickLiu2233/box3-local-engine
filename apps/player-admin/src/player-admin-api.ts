/** Shared request seam for every player-admin screen. */
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
