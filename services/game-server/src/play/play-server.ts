import { MuServer } from '@box-local/mudb/server';
import { MuScheduler } from '@box-local/mudb/scheduler/scheduler';
import type { Logger } from 'pino';

import { GameServer } from '../';
import { ContentServer } from '@box-local/content-server';
import { HotProject } from '@box-local/schema/project/hot-schema';
import { ServerVoxelPreloadData } from '../voxel/voxel-server-schema';
import { GameSessionInterface } from '@box-local/schema/session/type';
import { Logger as LegacyLogger } from '@box-local/utils/logger';
import { ServerSettings } from '../settings/server-settings-schema';
import { GameAdminServer } from '../admin/admin-server';
import { ScriptServer } from '../utils/script-server/type';
import { PlayServerSchema } from './play-server-schema';
import { CommonSQL } from '../storage/types';
import { BackendRPC } from '@box-local/schema/backend/rpc-interface';
import { BackendSocket } from '../../backendSocket';
import { CloseType } from '@box-local/schema/types/game';
import { FeatureFlag } from '@box-local/env/constants';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startPlayServer(spec: {
  server: MuServer;
  scheduler: MuScheduler;
  contentServer: ContentServer;
  ossContentServer: ContentServer;
  scriptServer: ScriptServer;
  logger: Logger;
  legacyLogger: LegacyLogger;
  session: GameSessionInterface;
  hotProject: HotProject;
  voxel: ServerVoxelPreloadData;
  settings: ServerSettings;
  sql: CommonSQL;
  brpc: BackendRPC;
  backendSocket: BackendSocket;
  featureFlags?: string[];
}) {
  const server = new PlayServer({
    server: spec.server,
    scheduler: spec.scheduler,
    contentServer: spec.contentServer,
    ossContentServer: spec.ossContentServer,
    scriptServer: spec.scriptServer,
    logger: spec.logger,
    legacyLogger: spec.legacyLogger,
    initVoxels: spec.voxel,
    session: spec.session,
    hotProject: spec.hotProject,
    settings: spec.settings,
    sql: spec.sql,
    brpc: spec.brpc,
    backendSocket: spec.backendSocket,
  });
  await server.start();
  spec.logger.info('PlayServer started.');
  await server.state.game.synchronizeProject(spec.hotProject, {
    skipVoxels: false,
    play: true,
  });
  return server;
}

export class PlayServer {
  public state = PlayServerSchema.clone(PlayServerSchema.identity);

  constructor(spec: {
    server: MuServer;
    scheduler: MuScheduler;
    contentServer: ContentServer;
    ossContentServer: ContentServer;
    scriptServer: ScriptServer;
    logger: Logger;
    legacyLogger: LegacyLogger;
    initVoxels: ServerVoxelPreloadData;
    session: GameSessionInterface;
    hotProject: HotProject;
    settings: ServerSettings;
    sql: CommonSQL;
    brpc: BackendRPC;
    backendSocket: BackendSocket;
    featureFlags?: string[];
  }) {
    const game = (this.state.game = new GameServer(spec));
    const adminServer = new GameAdminServer({
      server: spec.server,
      game,
      containerName: spec.settings.containerName,
      contentId: spec.settings.contentId,
      brpc: spec.brpc,
    });
    this.state.logger = spec.legacyLogger.create('play');
    if (spec.settings.containerName) {
      const gameState = this.state.game.state;
      this.state.game.onTick.sub(() => {
        for (let i = 0; i < gameState.connectionSet.length; i++) {
          const conn = gameState.connectionSet[i];
          if (
            conn.joinTime === 0 || // the player is not joined the game
            gameState.clock.clock - conn.joinTime < 1000 * 60 || // player is joined less than 1min
            conn.playCounted // already counted
          ) {
            continue;
          }
          conn.playCounted = true;
        }
      });
    }

    // restart project
    game.script.onScriptCrash.sub(async () => {
      game.chat.systemBroadcast('scriptCrash');
      for (let i = 3; i > 0; --i) {
        game.chat.systemBroadcast('restartIn', '' + i);
        await delay(1000);
      }
      await game.synchronizeProject(game.state.project, {
        skipVoxels: false,
        play: true,
      });
    });

    if (spec.featureFlags?.includes(FeatureFlag.TimeRestriction)) {
      this.startTimeRestrictionCheck();
    }
  }

  /**
   * 检查当前时间是否在游戏允许时间段内
   * TODO 做配置
   */
  private isWithinPlayTime(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();

    // 北京时间 8:00-22:00 对应 UTC 时间 0:00-14:00
    return utcHour >= 0 && utcHour < 14;
  }

  /**
   * 启动时间限制检查
   */
  private startTimeRestrictionCheck() {
    this.state.logger.info('Starting time restriction check service');

    const scheduleNextCheck = () => {
      const now = new Date();
      let nextCheckTime: Date;

      if (this.isWithinPlayTime()) {
        // 当前在允许时间内，下次检查是限制时间的起点（UTC 14:00，即北京时间 22:00）
        nextCheckTime = new Date(now);
        nextCheckTime.setUTCHours(14, 0, 0, 0);

        // 如果已经过了今天的 UTC 14:00，则设置为明天的 UTC 14:00
        if (nextCheckTime.getTime() <= now.getTime()) {
          nextCheckTime.setUTCDate(nextCheckTime.getUTCDate() + 1);
        }
      } else {
        // 当前在限制时间内，1 分钟后检查
        nextCheckTime = new Date(now.getTime() + 60 * 1000);
      }

      const timeUntilCheck = nextCheckTime.getTime() - now.getTime();

      this.state.logger.info(
        `Next time restriction check in ${Math.round(
          timeUntilCheck / 1000,
        )}s (UTC: ${now.getUTCHours()}:${now
          .getUTCMinutes()
          .toString()
          .padStart(2, '0')})`,
      );

      setTimeout(() => {
        this.kickTimeRestrictionUsers();
        scheduleNextCheck();
      }, timeUntilCheck);
    };

    scheduleNextCheck();
  }

  /**
   * 踢出所有非管理员用户
   */
  private kickTimeRestrictionUsers() {
    const gameState = this.state.game.state;
    const connectionsToKick: (typeof gameState.connectionSet)[0][] = [];

    // 收集需要踢出的非管理员连接
    for (let i = 0; i < gameState.connectionSet.length; i++) {
      const conn = gameState.connectionSet[i];
      if (conn.joinTime > 0 && !conn.sessionData.isAdmin) {
        connectionsToKick.push(conn);
      }
    }

    if (connectionsToKick.length > 0) {
      this.state.logger.info(
        `Kicking ${connectionsToKick.length} non-admin users due to time restriction`,
      );

      // 先发送时间限制通知
      // TODO i18n
      connectionsToKick.forEach((conn) => {
        this.state.game.chat.directMessage(
          conn.id,
          '地图开放时间段结束，将于30秒内自动退出。',
          undefined,
          Infinity,
          false,
        );
      });

      // 延迟30秒后踢出用户，给用户时间看到提示
      setTimeout(() => {
        connectionsToKick.forEach((conn) => {
          try {
            this.state.logger.info(
              `Disconnecting session ${conn.sessionId} due to time restriction`,
            );
            // 断开连接
            this.state.game.net.kickSession(
              conn.sessionId,
              CloseType.TimeRestriction,
            );
          } catch (error) {
            this.state.logger.error(
              `Error disconnecting user ${conn.sessionId}: ${error}`,
            );
          }
        });
      }, 30000);
    }
  }

  public async start() {
    return await this.state.game.start();
  }
}
