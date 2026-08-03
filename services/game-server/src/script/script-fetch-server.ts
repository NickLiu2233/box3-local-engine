import {
  CreateTempChatParam,
  DeleteTempChatParam,
} from '@box-local/apis/dist/createra/data-contracts';
import { MuRemoteClient, MuServer, MuServerProtocol } from '@box-local/mudb/server';
import { JSONValue } from '@box-local/schema/api/common';
import { getById } from '@box-local/utils/id';
import { TokenBucket } from 'limiter';
import { apis } from '../apis';
import { GameServerState } from '../game-server-schema';
import {
  FETCH_ERROR_STATUS,
  FetchScriptProtocol,
} from './script-fetch-protocol';

/**
 * TempChat 相关请求的 userIds 数组最大长度限制
 */
const MAX_TEMP_CHAT_USER_IDS_LENGTH = 1000;

/**
 * TempChat 相关接口每分钟补充的可用请求数
 */
const TEMP_CHAT_API_RATE_LIMIT = 100;
/**
 * TempChat 相关接口令牌桶的最大容量，防止突发请求过多
 */
const TEMP_CHAT_API_RATE_LIMIT_CAPACITY = 1000;

export class ScriptFetchServer {
  public scriptProtocol: MuServerProtocol<typeof FetchScriptProtocol>;
  public state: GameServerState;

  /**
   * @description TempChat 相关接口的限流器，每分钟最多允许 1000 次请求
   * 使用 tryRemoveTokens 方法立即返回结果,超限时拒绝请求让客户端重试
   */
  private tempChatApiLimiter = new TokenBucket({
    bucketSize: TEMP_CHAT_API_RATE_LIMIT_CAPACITY,
    tokensPerInterval: TEMP_CHAT_API_RATE_LIMIT,
    interval: 'minute',
  });

  constructor(spec: { scriptServer: MuServer; state: GameServerState }) {
    const { scriptServer, state } = spec;

    this.state = state;
    this.scriptProtocol = scriptServer.protocol(FetchScriptProtocol);

    this.scriptProtocol.configure({
      message: {
        getMiaoShells: async (client, { handle, playerId }) => {
          const playerInfo = getById(state.serverPlayers, playerId);
          if (!playerInfo) {
            this._fetchError(client, handle, 'UNKNOWN');
            return;
          }
          if (!playerInfo.userId) {
            this._fetchDone(client, handle, { miaoShells: 0 });
          } else {
            try {
              // 请求接口
              const num = await apis.createra.getMiaoShells({
                mapId: state.settings.contentId.toString(),
                userId: playerInfo.userId,
              });
              this.state.logger.log(
                `MiaoShells get success: ${playerInfo.userId} ${num}.`,
              );

              this._fetchDone(client, handle, { miaoShells: Number(num) || 0 });
            } catch (error) {
              this.state.logger.log(
                `MiaoShells get error: ${JSON.stringify(error)}.`,
              );
              this._fetchError(client, handle, 'UNKNOWN');
            }
          }
        },
        querySocial: async (client, { handle, userId, socialType }) => {
          if (!userId) {
            this._fetchDone(client, handle, { socialList: [] });
          } else {
            try {
              // 请求接口
              const list = await apis.createra.getSocialRelationUsingGet({
                userId: Number(userId),
                type: socialType,
              });
              this.state.logger.log(
                `Social list get success: ${JSON.stringify(list)}.`,
              );

              this._fetchDone(client, handle, { socialList: list });
            } catch (error) {
              this.state.logger.log(
                `Social list get error: ${JSON.stringify(error)}.`,
              );
              this._fetchError(client, handle, 'UNKNOWN');
            }
          }
        },
        querySocialStatistic: async (client, { handle, userId }) => {
          if (!userId) {
            this._fetchDone(client, handle, {
              followingNum: 0,
              followerNum: 0,
              friendsNum: 0,
            });
          } else {
            try {
              const { followingNum, followerNum, friendsNum } =
                await apis.createra.getSocialRelationInfoUsingGet({
                  userId: Number(userId),
                });
              this.state.logger.debug(
                `Social count get success: ${followingNum} following, ${followerNum} followerNum, ${friendsNum} friendsNum.`,
              );
              this._fetchDone(client, handle, {
                followingNum,
                followerNum,
                friendsNum,
              });
            } catch (error) {
              this.state.logger.error(
                `Social count get error: ${JSON.stringify(error)}.`,
              );
              this._fetchError(client, handle, 'UNKNOWN');
            }
          }
        },
        createTempChat: async (client, { handle, userIds }) => {
          // 验证 userIds 长度
          if (!this._validateTempChatUserIds(userIds, client, handle)) {
            return;
          }

          // 检查限流 - 使用 tryRemoveTokens 立即返回结果
          if (!this._checkTempChatRateLimit()) {
            this.state.logger.warn(
              `createTempChat request rate limited, please retry later`,
            );
            client.message.fetchError({
              handle,
              error: {
                key: 'UNKNOWN',
                msg: 'Request rate limit exceeded, please retry later',
              },
            });
            return;
          }

          try {
            // 请求接口
            const { mode, contentId } = this.state.settings;
            const params: CreateTempChatParam = {
              mapId: contentId,
              mode,
              userIds,
            };
            const res = await apis.createra.createTempChatUsingPost(params);
            this.state.logger.log(
              `Temp chat create success: ${JSON.stringify(res)}.`,
            );

            this._fetchDone(client, handle, { chatId: res });
          } catch (error) {
            this.state.logger.log(
              `Temp chat create error: ${JSON.stringify(error)}.`,
            );
            client.message.fetchError({
              handle,
              error: { key: 'UNKNOWN', msg: error.msg },
            });
          }
        },

        destroyTempChat: async (client, { handle, chatIds }) => {
          // 检查限流 - 使用 tryRemoveTokens 立即返回结果
          if (!this._checkTempChatRateLimit()) {
            this.state.logger.warn(
              `destroyTempChat request rate limited, please retry later`,
            );
            client.message.fetchError({
              handle,
              error: {
                key: 'UNKNOWN',
                msg: 'Request rate limit exceeded, please retry later',
              },
            });
            return;
          }

          try {
            // 请求接口
            const { mode, contentId } = this.state.settings;
            const params: DeleteTempChatParam = {
              mapId: contentId,
              mode,
              tempChatIds: chatIds,
            };
            const res = await apis.createra.deleteTempChatUsingDelete(params);
            this.state.logger.log(
              `Temp chat delete success: ${JSON.stringify(res)}.`,
            );

            this._fetchDone(client, handle, { chatIds: res });
          } catch (error) {
            this.state.logger.log(
              `Temp chat delete error: ${JSON.stringify(error)}.`,
            );
            client.message.fetchError({
              handle,
              error: { key: 'UNKNOWN', msg: error.msg },
            });
          }
        },
        addTempChatPlayer: async (client, { handle, userIds, chatId }) => {
          // 验证 userIds 长度
          if (!this._validateTempChatUserIds(userIds, client, handle)) {
            return;
          }

          // 检查限流 - 使用 tryRemoveTokens 立即返回结果
          if (!this._checkTempChatRateLimit()) {
            this.state.logger.warn(
              `addTempChatPlayer request rate limited, please retry later`,
            );
            client.message.fetchError({
              handle,
              error: {
                key: 'UNKNOWN',
                msg: 'Request rate limit exceeded, please retry later',
              },
            });
            return;
          }

          try {
            // 请求接口
            const { mode, contentId } = this.state.settings;
            const res = await apis.createra.addTempChatUserUsingPost({
              mapId: contentId,
              mode,
              userIds,
              tempChatId: chatId,
            });
            this.state.logger.log(`Temp chat add user success. ${chatId}`);

            this._fetchDone(client, handle, { userIds: res });
          } catch (error) {
            this.state.logger.log(
              `Temp chat add user fail: ${JSON.stringify(error)}.`,
            );
            client.message.fetchError({
              handle,
              error: { key: 'UNKNOWN', msg: error.msg },
            });
          }
        },
        removeTempChatPlayer: async (client, { handle, userIds, chatId }) => {
          // 验证 userIds 长度
          if (!this._validateTempChatUserIds(userIds, client, handle)) {
            return;
          }

          // 检查限流 - 使用 tryRemoveTokens 立即返回结果
          if (!this._checkTempChatRateLimit()) {
            this.state.logger.warn(
              `removeTempChatPlayer request rate limited, please retry later`,
            );
            client.message.fetchError({
              handle,
              error: {
                key: 'UNKNOWN',
                msg: 'Request rate limit exceeded, please retry later',
              },
            });
            return;
          }

          try {
            // 请求接口
            const { mode, contentId } = this.state.settings;
            const res = await apis.createra.removeTempChatUserUsingPost({
              mapId: contentId,
              mode,
              userIds,
              tempChatId: chatId,
            });
            this.state.logger.log(`Temp chat remove user success: ${chatId}.`);

            this._fetchDone(client, handle, { userIds: res });
          } catch (error) {
            this.state.logger.log(
              `Temp chat add remove fail: ${JSON.stringify(error)}.`,
            );
            client.message.fetchError({
              handle,
              error: { key: 'UNKNOWN', msg: error.msg },
            });
          }
        },
        getTempChats: async (client, { handle }) => {
          // 检查限流 - 使用 tryRemoveTokens 立即返回结果
          if (!this._checkTempChatRateLimit()) {
            this.state.logger.warn(
              `getTempChats request rate limited, please retry later`,
            );
            client.message.fetchError({
              handle,
              error: {
                key: 'UNKNOWN',
                msg: 'Request rate limit exceeded, please retry later',
              },
            });
            return;
          }

          try {
            // 请求接口
            const { mode, contentId } = this.state.settings;
            const res = await apis.createra.tempChatIdsUsingGet({
              mapId: contentId,
              mode,
            });
            this.state.logger.log(`Temp chats fetch success: ${contentId}.`);

            this._fetchDone(client, handle, res);
          } catch (error) {
            this.state.logger.log(
              `Temp chats fetch fail: ${JSON.stringify(error)}.`,
            );
            client.message.fetchError({
              handle,
              error: { key: 'UNKNOWN', msg: error.msg },
            });
          }
        },
        getTempChatUsers: async (client, { handle, chatId }) => {
          // 检查限流 - 使用 tryRemoveTokens 立即返回结果
          if (!this._checkTempChatRateLimit()) {
            this.state.logger.warn(
              `getTempChatUsers request rate limited, please retry later`,
            );
            client.message.fetchError({
              handle,
              error: {
                key: 'UNKNOWN',
                msg: 'Request rate limit exceeded, please retry later',
              },
            });
            return;
          }

          try {
            // 请求接口
            const res = await apis.createra.getTempChatUsersUsingGet({
              tempChatId: chatId,
            });
            this.state.logger.log(`Temp chat user fetch success: ${chatId}.`);

            this._fetchDone(client, handle, res);
          } catch (error) {
            this.state.logger.log(
              `Temp chat user fetch fail: ${JSON.stringify(error)}.`,
            );
            client.message.fetchError({
              handle,
              error: { key: 'UNKNOWN', msg: error.msg },
            });
          }
        },
      },
    });
  }

  private _fetchDone(
    client: MuRemoteClient<typeof FetchScriptProtocol.client>,
    handle: number,
    val: JSONValue,
  ) {
    try {
      const data = JSON.stringify(val);
      client.message.fetchDone({ handle, data });
    } catch (error) {
      this.state.logger.error(error);
    }
  }

  private _fetchError(
    client: MuRemoteClient<typeof FetchScriptProtocol.client>,
    handle: number,
    errorKey: FETCH_ERROR_STATUS,
  ) {
    this.state.logger.log(`Script Fetch failed ${errorKey}`);

    client.message.fetchError({
      handle,
      error: {
        key: errorKey,
        msg: undefined,
      },
    });
  }

  /**
   * @description 检查 TempChat 相关接口的限流
   * @returns true 表示可以继续请求，false 表示已达到限流上限需要客户端重试
   */
  private _checkTempChatRateLimit(): boolean {
    return this.tempChatApiLimiter.tryRemoveTokens(1);
  }

  /**
   * @description 验证 TempChat 相关请求的 userIds 数组长度
   * @param userIds 用户 ID 数组
   * @param client 客户端连接
   * @param handle 请求句柄
   * @returns true 表示验证通过，false 表示验证失败（已发送错误响应）
   */
  private _validateTempChatUserIds(
    userIds: string[] | number[],
    client: MuRemoteClient<typeof FetchScriptProtocol.client>,
    handle: number,
  ): boolean {
    if (userIds && userIds.length > MAX_TEMP_CHAT_USER_IDS_LENGTH) {
      this.state.logger.error(
        `TempChat userIds length exceeds limit: ${userIds.length} > ${MAX_TEMP_CHAT_USER_IDS_LENGTH}`,
      );
      client.message.fetchError({
        handle,
        error: {
          key: 'UNKNOWN',
          msg: `UserIds length exceeds maximum limit of ${MAX_TEMP_CHAT_USER_IDS_LENGTH}`,
        },
      });
      return false;
    }
    return true;
  }
}
