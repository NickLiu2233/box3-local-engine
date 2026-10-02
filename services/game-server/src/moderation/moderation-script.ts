import { MuClient } from '@box/mudb/client'
import type { GameModeration, ModerationOptions, ModerationBan } from '@box/schema/api/js/moderation'
import type { GameEntity } from '@box/schema/api/js/api'
import { PromiseWrapper } from '../utils/script-promise'
import { ModerationProtocol } from './moderation-protocol'

/** Small sandbox surface: entity references in, public result out; no host credentials. */
export class ModerationScript implements GameModeration {
  private pending = new Map<number, { wrapper: PromiseWrapper<any>; timer: number }>()
  private sequence = 0
  private protocol
  constructor(
    client: MuClient,
    private schedule: (event: () => void) => void,
    private playerId: (entity: GameEntity) => number,
    private info: () => { mapId: string; scriptFingerprint: string },
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
  get mapId() {
    return this.info().mapId
  }
  get scriptFingerprint() {
    return this.info().scriptFingerprint
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
  banPlayer(player: GameEntity, options: ModerationOptions) {
    return this.request<ModerationBan>('banPlayer', player, options)
  }
  banCurrentIP(player: GameEntity, options: ModerationOptions) {
    return this.request<ModerationBan>('banCurrentIP', player, options)
  }
  revokeBan(banId: string, options: { reason: string; requestId: string }) {
    return this.request<{ revoked: boolean; id: string }>('revokeBan', undefined, { ...options, banId })
  }
  getPlayerStatus(player: GameEntity) {
    return this.request<{ status: string; bans: ModerationBan[] }>('getPlayerStatus', player, {})
  }
}
