import { SuitList } from '@box-local/apis';
import { DB } from '@box-local/schema/backend/database-type';
import { PlayerSkinHashSchema } from '@box-local/schema/player/player-schema';
import {
  GameSessionData,
  GameSessionDataSchema,
  UserDetail,
  UserDetailSchema,
} from '@box-local/schema/session/schema';
import { GameSessionInterface } from '@box-local/schema/session/type';
import { Logger } from '@box-local/utils/logger';
import { apis } from '../apis';
import { AvatarBodyPartMap } from '../player/player-schema';
import { createDefaultAvatarSkin } from '../player/default-avatar-skin';

// TODO Polish getting data from backend
// * Timeouts for all requests
// * Loading indicator on client
// * Try to do sensible things on error or timeout

export class GameSession implements GameSessionInterface {
  private readonly sessionData = new Map<
    string,
    { data: GameSessionData; expiresAt: number }
  >();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  public constructor(
    private logger: Logger,
    private readonly offline = false,
    private readonly sessionTtlMs = 60_000,
  ) {
    this.cleanupTimer = setInterval(
      () => this.removeExpiredSessions(),
      Math.max(5_000, Math.min(30_000, this.sessionTtlMs)),
    );
    this.cleanupTimer.unref();
  }

  private deleteSession(sessionId: string) {
    const record = this.sessionData.get(sessionId);
    if (!record) return;
    this.sessionData.delete(sessionId);
    GameSessionDataSchema.free(record.data);
  }

  private removeExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, record] of this.sessionData) {
      if (record.expiresAt <= now) this.deleteSession(sessionId);
    }
  }

  /**
   *
   * @sideEffect
   * @returns
   */
  public async bindUserSession(
    userDetail: UserDetail,
    ipAddress: string,
    sessionId: string,
    referer: string,
    fingerPrint: string,
    region: string,
  ) {
    const data = GameSessionDataSchema.alloc();
    UserDetailSchema.assign(data.user, userDetail);
    data.url = referer;
    data.sessionId = sessionId;
    data.name = userDetail.displayname;
    data.tag = userDetail.tag;
    data.ipAddress = ipAddress;
    data.isAdmin = !!(userDetail.permission & DB.UserPermission.gameAdmin);
    data.blocklist = userDetail.blocklist || [];
    data.fingerPrint = fingerPrint;
    data.region = region;

    data.avatarSkin = this.offline
      ? createDefaultAvatarSkin()
      : PlayerSkinHashSchema.clone(PlayerSkinHashSchema.identity);
    if (!this.offline) {
      try {
        const userSuits = await apis.createra.getUserSuitUsingGET(data.user.id);

        // 当返回数据有套装的时候以套装为准
        // 否则查找每个分部位的部件hash
        const suit = userSuits.find((suit) => suit.type === SuitList.Suit);
        if (suit) {
          suit.componentList.forEach((c) => {
            data.avatarSkin[AvatarBodyPartMap[c.component]] = c.hash;
          });
        } else {
          userSuits.forEach((suit) => {
            suit.componentList.forEach((c) => {
              data.avatarSkin[AvatarBodyPartMap[c.component]] = c.hash;
            });
          });
        }
      } catch (error) {
        this.logger.error(
          `error when get avatar suit from userId ${data.user.id}, ${error}`,
        );
      }
    }

    data.ipAddress = ipAddress;
    this.sessionData.set(sessionId, {
      data,
      expiresAt: Date.now() + Math.max(5_000, this.sessionTtlMs),
    });
    return data;
  }

  public getSessionData(sessionId: string): GameSessionData | undefined {
    const record = this.sessionData.get(sessionId);
    if (!record) return undefined;
    const data = record.expiresAt > Date.now()
      ? GameSessionDataSchema.clone(record.data)
      : undefined;
    // A session authorizes one WebSocket connection and cannot be replayed.
    this.deleteSession(sessionId);
    return data;
  }
}
