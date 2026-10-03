import { MuServer } from '@box/mudb/server'
import { z } from 'zod'
import { ModerationProtocol } from './moderation-protocol'
import { ModerationClient } from './moderation-client'

const commandSchema = z
  .object({
    action: z.enum(['banPlayer', 'banCurrentIP', 'banCurrentDevice', 'revokeBan', 'getPlayerStatus', 'listBans', 'getBan']),
    reason: z.string().trim().min(1).max(500).optional(),
    durationSeconds: z.number().int().min(0).max(604800).optional(),
    scope: z.enum(['map', 'server']).optional(),
    requestId: z
      .string()
      .regex(/^[A-Za-z0-9._-]{1,80}$/)
      .optional(),
    banId: z.string().uuid().optional(),
    kind: z.enum(['account', 'ip', 'device']).optional(),
    status: z.enum(['active', 'expired', 'revoked', 'all']).optional(),
    page: z.number().int().min(1).max(100000).optional(),
    pageSize: z.number().int().min(1).max(50).optional(),
  })
  .strict()
type Target = { userId: string; ipAddress: string; deviceHash?: string }

export class ModerationHost {
  private transport = new ModerationClient()
  private active = 0
  constructor(
    server: MuServer,
    ready: (sessionId: string) => boolean,
    target: (id: number) => Target | undefined,
    kick: (id: number) => void,
  ) {
    const protocol = server.protocol(ModerationProtocol)
    protocol.configure({
      message: {
        request: async (client, message) => {
          if (!ready(client.sessionId)) return
          const reply = (success: boolean, payload: unknown) => {
            if (ready(client.sessionId))
              client.message.reply({ handle: message.handle, success, payload: JSON.stringify(payload) })
          }
          if (this.active >= 8 || message.payload.length > 2048) {
            reply(false, { message: '地图管理请求过多或参数过长' })
            return
          }
          this.active++
          try {
            const input = commandSchema.parse(JSON.parse(message.payload))
            const needsPlayer = !['revokeBan', 'getBan'].includes(input.action) && (input.action !== 'listBans' || message.playerId !== 0)
            const player = needsPlayer ? target(message.playerId) : undefined
            if (needsPlayer && (!player || !player.userId)) throw new Error('目标玩家已离线')
            // These fields cannot be supplied or overridden by sandbox code.
            const result = await this.transport.execute({
              ...input,
              mapId: this.transport.mapId,
              userId: player?.userId,
              ipAddress: input.action === 'banCurrentIP' ? player?.ipAddress : undefined,
              deviceHash: input.action === 'banCurrentDevice' ? player?.deviceHash : undefined,
            })
            const { replayed, ...receipt } = result as Record<string, unknown>
            reply(true, receipt)
            // A receipt replay must not kick a player after an administrator has already unbanned them.
            if (!replayed && (input.action === 'banPlayer' || input.action === 'banCurrentIP' || input.action === 'banCurrentDevice')) kick(message.playerId)
          } catch (error) {
            reply(false, { message: error instanceof z.ZodError ? '地图管理参数无效' : (error as Error).message })
          } finally {
            this.active--
          }
        },
      },
    })
  }
}
