import { canUseMapResourceCache } from '../../../shared/server-address'

export function cacheModeDescription(endpoint: string): string {
  return canUseMapResourceCache(endpoint)
    ? `${new URL(endpoint).protocol === 'https:' ? 'HTTPS' : '本机连接'}：进入地图前准备本机资源，后续优先读取地图缓存。`
    : 'HTTP：地图随游玩在线加载，不启用地图预下载缓存。'
}

export function cacheClearedMessage(endpoint: string): string {
  return canUseMapResourceCache(endpoint)
    ? '本机缓存已清理，下次进入地图会重新准备资源。账号仍会保留。'
    : '本机缓存已清理，再次游玩时会按需从服务器加载资源，不显示地图预下载进度。账号仍会保留。'
}
