import { state } from '../core/state.js'

export const publicServices = [
  ['play', 'Play', 'playPublicAddressOverride', 'playPort', 3121],
  ['creator', 'ARENA', 'creatorPublicAddressOverride', 'creatorPort', 3127],
  ['voxa', 'VOXA', 'voxaPublicAddressOverride', 'voxaPort', 3123],
  ['player-service', '后台管理', 'playerServicePublicAddressOverride', 'playerServicePort', 3124],
  ['player-auth-portal', '登录页面', 'authPortalPublicAddressOverride', 'authPortalPort', 3125],
]
export const isPublicMode = (mode) =>
  mode === 'public' || mode === 'public-shared' || mode === 'public-independent'
export function accessChoice(config = state.config || {}) {
  const mode = state.accessMode || config.playNetworkMode || 'local'
  return mode === 'public'
    ? config.publicAddressMode === 'shared'
      ? 'public-shared'
      : 'public-independent'
    : mode
}
export function pathPrefix(value) {
  if (!value?.trim() || value === '/') return ''
  const path = '/' + value.trim().replace(/^\/+|\/+$/g, '')
  if (
    path.length > 129 ||
    !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path) ||
    /^\/(?:api|_next|runtime|p|player-admin)(?:\/|$)/.test(path)
  )
    throw new Error(
      '路径前缀最多 128 个字符，请使用 /play 这样的格式，不能使用 API、资源或运行时的保留路径',
    )
  return path
}
export function publicCertificateFlags(config = state.config || {}) {
  const authoritative = state.sslStatus && Object.hasOwn(state.sslStatus, 'config')
  const saved = authoritative ? state.sslStatus.config : null
  const flags = authoritative ? {} : { ...config.publicSslConfigured }
  const legacyShared = saved?.expiresAt && !Object.keys(saved.certificateSources || {}).length
  for (const [service] of publicServices) {
    const files = state.sslFiles?.[service]
    flags[service] = Boolean(
      (files?.certificate && files?.privateKey) ||
        saved?.certificateExpiries?.[service] ||
        (legacyShared && saved?.settings?.routes?.some((route) => route.service === service)) ||
        flags[service],
    )
  }
  flags.shared = Boolean(
    (state.sslFiles?.shared?.certificate && state.sslFiles?.shared?.privateKey) ||
      legacyShared ||
      Object.entries(saved?.certificateSources || {}).some(
        ([service, source]) => source === 'shared' && saved.certificateExpiries?.[service],
      ) ||
      flags.shared,
  )
  return flags
}
function endpoint(value, label, port, secure, shared = false) {
  if (!value?.trim()) return null
  const source = value.trim()
  const bare = !source.includes('://')
  const authority = source.split('/')[0]
  const rawIpv6 = !source.startsWith('[') && (authority.match(/:/g) || []).length > 1
  const normalized = rawIpv6 ? `[${authority}]${source.slice(authority.length)}` : source
  let url
  try {
    url = new URL(bare ? `${secure ? 'https' : 'http'}://${normalized}` : source)
  } catch {
    throw new Error(`${label}格式无效`)
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(`${label}不能包含账号、查询参数或片段`)
  const ip = url.hostname.includes(':') || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)
  const explicitPort = !rawIpv6 && /:\d+$/.test(authority)
  if (bare && ip && !shared && !explicitPort) url.port = String(port)
  return url
}
export function publicEndpoints(config = state.config || {}) {
  const shared = config.publicAddressMode === 'shared'
  const certificates = publicCertificateFlags(config)
  const base = shared
    ? endpoint(config.sharedPublicAddress, '共用公网地址', 80, certificates.shared, true)
    : null
  if (base && base.pathname !== '/')
    throw new Error('共用地址只填写协议和 IP 或域名，自定义路径请在各服务中填写')
  return publicServices.flatMap(([service, label, field, key, fallback]) => {
    const url = shared
      ? base
        ? new URL(base.href)
        : null
      : endpoint(
          config[field],
          `${label} 公网地址`,
          Number(config[key] || fallback),
          certificates[service],
        )
    if (!url) return []
    const explicit = shared ? config.publicServicePaths?.[service] : undefined
    const prefix = pathPrefix(explicit?.trim() ? explicit : shared ? '' : url.pathname)
    if (shared && !prefix) url.port = String(config[key] || fallback)
    url.pathname = prefix || '/'
    return [
      {
        service,
        label,
        field,
        url: url.href.replace(/\/$/, ''),
        domain: url.hostname.replace(/^\[|\]$/g, ''),
        port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
        secure: url.protocol === 'https:',
        path: prefix,
      },
    ]
  })
}
