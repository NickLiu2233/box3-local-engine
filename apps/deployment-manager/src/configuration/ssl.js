import { state } from '../core/state.js'

export function nginxMode() {
  return (state.sslDraft?.mode || state.sslStatus?.provider) === 'managed' ? 'managed' : 'external'
}

export const sslServices = [
  ['play', '游玩端', 'playPublicAddressOverride', 'playPort', 3121],
  ['creator', '创作端', 'creatorPublicAddressOverride', 'creatorPort', 3127],
  ['voxa', 'VOXA', 'voxaPublicAddressOverride', 'voxaPort', 3123],
  ['player-service', '后台管理', 'playerServicePublicAddressOverride', 'playerServicePort', 3124],
  ['player-auth-portal', '登录页面', 'authPortalPublicAddressOverride', 'authPortalPort', 3125],
]

export function sslRoutes(config = state.config || {}) {
  return sslServices.flatMap(([service, , field]) => {
    const independent = config[field]?.trim()
    const address = independent || ''
    if (!address.startsWith('https://')) return []
    let url
    try { url = new URL(address) } catch { throw new Error('公网 HTTPS 地址格式无效') }
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('公网地址不能包含账号、路径或参数')
    if (url.port && url.port !== '443') throw new Error('HTTPS 入口统一使用 443，请删除公网地址中的其他端口')
    const port = 443
    return [{ service, domain: url.hostname, port }]
  })
}
