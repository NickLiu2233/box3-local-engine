export interface ServerAddressNotice {
  title: string
  message: string
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return host === 'localhost'
    || host.endsWith('.localhost')
    || host === '::1'
    || /^127(?:\.\d{1,3}){3}$/.test(host)
}

function isIpAddress(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '')
  return host.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
}

/** Returns a confirmation notice for endpoints that may not support safe local caching. */
export function getServerAddressNotice(value: string): ServerAddressNotice | null {
  const raw = String(value || '').trim().replace(/\/+$/, '')
  if (!raw || /\s/.test(raw)) return null

  let url: URL
  try { url = new URL(raw.includes('://') ? raw : `https://${raw}`) } catch { return null }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null

  const loopback = isLoopbackHost(url.hostname)
  const nonLoopbackIp = isIpAddress(url.hostname) && !loopback
  const insecureHttp = url.protocol === 'http:' && !loopback
  if (!nonLoopbackIp && !insecureHttp) return null

  if (nonLoopbackIp && insecureHttp) {
    return {
      title: '这个 IP 地址的连接不安全',
      message: '仍然可以添加，但账号和连接信息可能被网络中的其他人看到，地图素材也可能无法保存在本机。建议向服主要一个安全连接（HTTPS）地址。',
    }
  }
  if (insecureHttp) {
    return {
      title: '这个服务器连接不安全',
      message: '仍然可以添加，但账号和连接信息可能被网络中的其他人看到，地图素材也可能无法保存在本机。建议向服主要一个安全连接（HTTPS）地址。',
    }
  }
  return {
    title: '正在添加 IP 地址',
    message: 'IP 地址可以使用。如果之后无法连接，建议向服主要一个安全连接（HTTPS）地址；这样地图素材也能保存在本机，下次进入更快。',
  }
}
