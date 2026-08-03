import { MuClientProtocol, MuClient } from '@box-local/mudb/client';
import { CommonError } from '@box-local/schema/api/js/error';
import { SocialType } from '@box-local/schema/api/js/api';

import { PromiseWrapper } from '../utils/script-promise';
import { FetchScriptProtocol } from './script-fetch-protocol';
import { SocialStatisticType } from '@box-local/schema/api/js/api';

export type FETCH_ERROR_STATUS = 'UNKNOWN';
export type ErrorType = CommonError<FETCH_ERROR_STATUS>;
const errorMsgList: { [k in FETCH_ERROR_STATUS]: ErrorType } = {
  // 未知的服务器错误
  UNKNOWN: {
    status: 'UNKNOWN',
    code: 500,
    msg: 'Internal Server Error.',
  },
};

export class FetchScriptShell {
  public wrappers: { [handle: number]: PromiseWrapper<any> } = {};
  private handleCounter = 0;
  private protocol: MuClientProtocol<typeof FetchScriptProtocol>;

  constructor(client: MuClient, public schedule: (event: () => void) => void) {
    this.protocol = client.protocol(FetchScriptProtocol);
    this.protocol.configure({
      message: {
        fetchDone: ({ handle, data }) => {
          if (this.wrappers[handle]) {
            this.wrappers[handle].notifyDone(data);
            delete this.wrappers[handle];
          }
        },
        fetchError: ({ handle, error }) => {
          if (this.wrappers[handle]) {
            // error format
            this.wrappers[handle].notifyError(
              new Error(this._getErrorMsg(error)),
            );
            delete this.wrappers[handle];
          }
        },
      },
    });
  }

  // 临时存在，获取用户user累计的喵贝壳
  public getMiaoShells = (playerId: number) => {
    const wrapper = new PromiseWrapper<number>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data.miaoShells || 0;
      } catch (error) {
        return 0;
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.getMiaoShells({
      handle,
      playerId,
    });

    return wrapper.query;
  };

  public createTempChat = (userIds?: string[]) => {
    if (userIds !== undefined && !Array.isArray(userIds)) {
      throw new Error('userIds must be an array');
    }
    const wrapper = new PromiseWrapper<string>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data.chatId || '';
      } catch (error) {
        return '';
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.createTempChat({
      handle,
      userIds: userIds || [],
    });

    return wrapper.query;
  };

  public destroyTempChat = (chatIds: string[]) => {
    if (!Array.isArray(chatIds)) {
      throw new Error('chatIds must be an array');
    }
    const wrapper = new PromiseWrapper<string[]>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data.chatIds || [];
      } catch (error) {
        return '';
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.destroyTempChat({
      handle,
      chatIds,
    });

    return wrapper.query;
  };

  public addTempChatPlayer = (chatId: string, userIds: string[]) => {
    if (typeof chatId !== 'string') {
      throw new Error('chatId must be a string');
    }
    if (!Array.isArray(userIds)) {
      throw new Error('userIds must be an array');
    }
    const wrapper = new PromiseWrapper<string[]>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data.userIds || [];
      } catch (error) {
        return [];
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.addTempChatPlayer({
      handle,
      userIds,
      chatId,
    });

    return wrapper.query;
  };

  public removeTempChatPlayer = (chatId: string, userIds: string[]) => {
    if (typeof chatId !== 'string') {
      throw new Error('chatId must be a string');
    }
    if (!Array.isArray(userIds)) {
      throw new Error('userIds must be an array');
    }
    const wrapper = new PromiseWrapper<string[]>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data.userIds || [];
      } catch (error) {
        return [];
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.removeTempChatPlayer({
      handle,
      userIds,
      chatId,
    });

    return wrapper.query;
  };

  public getTempChats = () => {
    const wrapper = new PromiseWrapper<string[]>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data;
      } catch (error) {
        return [];
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.getTempChats({
      handle,
    });

    return wrapper.query;
  };
  public getTempChatUsers = (chatId: string) => {
    if (typeof chatId !== 'string') {
      throw new Error('chatId must be a string');
    }
    const wrapper = new PromiseWrapper<string[]>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data;
      } catch (error) {
        return [];
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.getTempChatUsers({
      handle,
      chatId,
    });

    return wrapper.query;
  };

  public querySocial = (socialType: SocialType, userId: string) => {
    const wrapper = new PromiseWrapper<number[]>(this.schedule, (res) => {
      try {
        const data = JSON.parse(res);
        return data.socialList || [];
      } catch (error) {
        return [];
      }
    });
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.querySocial({
      handle,
      userId,
      socialType,
    });

    return wrapper.query;
  };
  public querySocialStatistic = (userId: string) => {
    const wrapper = new PromiseWrapper<SocialStatisticType>(
      this.schedule,
      (res) => {
        try {
          return JSON.parse(res);
        } catch (error) {
          return { followingNum: 0, followerNum: 0, friendsNum: 0 };
        }
      },
    );
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.querySocialStatistic({
      handle,
      userId,
    });

    return wrapper.query;
  };

  private _getErrorMsg(err: { key: FETCH_ERROR_STATUS; msg?: string }) {
    const { key, msg } = err;
    let error = errorMsgList[key] || errorMsgList['UNKNOWN'];
    if (msg) {
      error.msg = msg;
    }
    return JSON.stringify(error);
  }
}
