import { ApiClient } from '@box/apis'
import { createHash } from 'node:crypto'

export function scriptFingerprint(source: Record<string, string>, entryPoint = ''): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        entryPoint,
        Object.keys(source)
          .sort()
          .map((name) => [name, source[name]]),
      ]),
    )
    .digest('hex')
}

/** Only the trusted runtime host owns this transport; never import into the script bundle. */
export class ModerationClient {
  private api: ApiClient
  readonly mapId = process.env.BOX_WORLD_PERMANENT_MAP_ID || ''
  private configured: boolean
  constructor() {
    const baseUrl = process.env.BOX_PLAYER_SERVICE_INTERNAL_URL || ''
    const secret = process.env.PERMISSION_TOKEN_SECRET || ''
    this.configured = !!(baseUrl && secret && this.mapId && process.env.MODE !== 'edit')
    this.api = new ApiClient({
      baseUrl,
      headers: { Authorization: `Bearer ${secret}` },
      defaultErrorMessage: '地图管理服务暂时不可用',
    })
  }
  async execute(body: Parameters<ApiClient['postApiPlayerInternalScriptModeration']>[0]['body']) {
    if (!this.configured) throw new Error('此运行环境未启用地图管理服务')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    try {
      return await this.api.postApiPlayerInternalScriptModeration({ body, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }
  async admission(userId: string, ipAddress: string): Promise<boolean> {
    if (!this.mapId || process.env.MODE === 'edit') return true
    if (!this.configured) return false
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const result = await this.api.postApiPlayerInternalMapAdmission({
        body: { mapId: this.mapId, userId, ipAddress },
        signal: controller.signal,
      })
      return result.allowed === true
    } finally {
      clearTimeout(timer)
    }
  }
  async deniedPlayers(players: Array<{ userId: string; ipAddress: string }>): Promise<number[]> {
    if (!this.configured) return []
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const result = await this.api.postApiPlayerInternalMapAdmission({
        body: { mapId: this.mapId, players },
        signal: controller.signal,
      })
      if (
        !Array.isArray(result.denied) ||
        result.denied.some((index) => !Number.isInteger(index) || index < 0 || index >= players.length)
      )
        throw new Error('地图准入响应无效')
      return result.denied
    } finally {
      clearTimeout(timer)
    }
  }
}
