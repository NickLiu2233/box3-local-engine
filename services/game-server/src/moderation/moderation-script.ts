import { MuClient } from '@box/mudb/client'
import type { GameModeration, ModerationOptions, ModerationBan, ModerationBatchResult, ModerationBanRecord, ModerationBanQuery } from '@box/schema/api/js/moderation'
import type { GameEntity } from '@box/schema/api/js/api'
import { PromiseWrapper } from '../utils/script-promise'
import { ModerationProtocol } from './moderation-protocol'

/** Called by the trusted shell before evaluating user code; play has no inspection property. */
export class ModerationScript implements GameModeration {
  private pending = new Map<number, { wrapper: PromiseWrapper<any>; timer: number }>()
  private sequence = 0
  private protocol
  constructor(
    client: MuClient,
    private schedule: (event: () => void) => void,
    private playerId: (entity: GameEntity) => number,
    private timers: { setTimeout: (fn: () => void, ms: number) => number; clearTimeout: (id: number) => void },
  ) {
    this.protocol = client.protocol(ModerationProtocol)
    this.protocol.configure({
      message: {
        reply: (message) => {
          const item = this.pending.get(message.handle)
          if (!item) return
          this.pending.delete(message.handle)
          this.timers.clearTimeout(item.timer)
          try {
            const result = JSON.parse(message.payload)
            if (message.success) item.wrapper.notifyDone(result)
            else item.wrapper.notifyError(new Error(result.message || '地图管理操作失败'))
          } catch {
            item.wrapper.notifyError(new Error('地图管理响应无效'))
          }
        },
      },
    })
  }
  private request<T>(action: string, player: GameEntity | undefined, options: object): Promise<T> {
    if (this.pending.size >= 8) return Promise.reject(new Error('地图管理请求过多'))
    const playerId = player ? this.playerId(player) : 0
    const payload = JSON.stringify({ ...options, action })
    if (payload.length > 2048) return Promise.reject(new Error('地图管理参数过长'))
    const handle = this.sequence++ >>> 0
    const wrapper = new PromiseWrapper<T>(this.schedule)
    const timer = this.timers.setTimeout(() => {
      this.pending.delete(handle)
      wrapper.notifyError(new Error('地图管理请求超时；重试请复用 requestId'))
    }, 12000)
    this.pending.set(handle, { wrapper, timer })
    try {
      this.protocol.server.message.request({ handle, playerId, payload })
    } catch (error) {
      this.timers.clearTimeout(timer)
      this.pending.delete(handle)
      wrapper.notifyError(error)
    }
    return wrapper.query
  }
  private async ban(action: string, players: GameEntity | readonly GameEntity[], options: ModerationOptions): Promise<ModerationBan | ModerationBatchResult[]> {
    if (!Array.isArray(players)) return this.request<ModerationBan>(action, players as GameEntity, options)
    // Validate the batch envelope before starting any irreversible operation.
    if (players.length > 100 || !/^[A-Za-z0-9._-]{1,72}$/.test(options.requestId))
      throw new Error('批量最多 100 个玩家，requestId 须为 1–72 个合法字符')
    const targets = [...players]
    const batchOptions = { ...options }
    const results: ModerationBatchResult[] = []
    for (let index = 0; index < targets.length; index++) {
      try {
        const ban = await this.request<ModerationBan>(action, targets[index], { ...batchOptions, requestId: `${batchOptions.requestId}.b${index}` })
        results.push({ index, success: true, ban })
      } catch (error) {
        results.push({ index, success: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return results
  }
  banPlayer(player: GameEntity, options: ModerationOptions): Promise<ModerationBan>
  banPlayer(players: readonly GameEntity[], options: ModerationOptions): Promise<ModerationBatchResult[]>
  banPlayer(players: GameEntity | readonly GameEntity[], options: ModerationOptions): Promise<ModerationBan | ModerationBatchResult[]>
  banPlayer(players: GameEntity | readonly GameEntity[], options: ModerationOptions) {
    return this.ban('banPlayer', players, options)
  }
  banCurrentIP(player: GameEntity, options: ModerationOptions): Promise<ModerationBan>
  banCurrentIP(players: readonly GameEntity[], options: ModerationOptions): Promise<ModerationBatchResult[]>
  banCurrentIP(players: GameEntity | readonly GameEntity[], options: ModerationOptions): Promise<ModerationBan | ModerationBatchResult[]>
  banCurrentIP(players: GameEntity | readonly GameEntity[], options: ModerationOptions) {
    return this.ban('banCurrentIP', players, options)
  }
  banCurrentDevice(player: GameEntity, options: ModerationOptions): Promise<ModerationBan>
  banCurrentDevice(players: readonly GameEntity[], options: ModerationOptions): Promise<ModerationBatchResult[]>
  banCurrentDevice(players: GameEntity | readonly GameEntity[], options: ModerationOptions): Promise<ModerationBan | ModerationBatchResult[]>
  banCurrentDevice(players: GameEntity | readonly GameEntity[], options: ModerationOptions) {
    return this.ban('banCurrentDevice', players, options)
  }
  revokeBan(banId: string, options: { reason: string; requestId: string }) {
    return this.request<{ revoked: boolean; id: string }>('revokeBan', undefined, { ...options, banId })
  }
  listBans(query: ModerationBanQuery = {}) {
    const { player, ...filters } = query
    return this.request<{ items: ModerationBanRecord[]; total: number; page: number; pageSize: number }>('listBans', player, filters)
  }
  async getBan(banId: string) {
    const result = await this.request<{ ban: ModerationBanRecord | null }>('getBan', undefined, { banId })
    return result.ban
  }
  getPlayerStatus(player: GameEntity) {
    return this.request<{ status: string; bans: ModerationBan[] }>('getPlayerStatus', player, {})
  }
}
