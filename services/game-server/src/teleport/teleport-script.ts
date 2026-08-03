import { MuClientProtocol, MuClient } from '@box-local/mudb/client';
import type {
  TELEPORT_ERROR_STATUS,
  TeleportResult,
} from '@box-local/schema/api/js/api';
import { CommonError } from '@box-local/schema/api/js/error';

import { PromiseWrapper } from '../utils/script-promise';
import { TeleportScriptProtocol } from './teleport-script-protocol';

export type ErrorType = CommonError<TELEPORT_ERROR_STATUS>;
const errorMsgList: { [k in TELEPORT_ERROR_STATUS]: ErrorType } = {
  // 有用户ID离线
  PLAYER_OFFLINE: {
    status: 'PLAYER_OFFLINE',
    code: 400,
    msg: 'Teleport cannot be completed, some of the specified players are currently offline.',
  },
  // 没有权限
  ACCESS_DENIED: {
    status: 'ACCESS_DENIED',
    code: 401,
    msg: 'The map does not have the necessary permissions to utilize the teleport API.',
  },
  // 未知的服务器错误
  UNKNOWN: {
    status: 'UNKNOWN',
    code: 500,
    msg: 'Internal Server Error.',
  },
};

export class TeleportScriptShell {
  public wrappers: { [handle: number]: PromiseWrapper<any> } = {};
  private handleCounter = 0;
  private protocol: MuClientProtocol<typeof TeleportScriptProtocol>;

  constructor(client: MuClient, public schedule: (event: () => void) => void) {
    this.protocol = client.protocol(TeleportScriptProtocol);
    this.protocol.configure({
      message: {
        teleportDone: ({ handle, serverId }) => {
          if (this.wrappers[handle]) {
            const result: TeleportResult = { serverId };

            this.wrappers[handle].notifyDone(result);

            delete this.wrappers[handle];
          }
        },
        teleportError: ({ handle, error }) => {
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

  public teleport = (
    mapId: string,
    playerIds: number[],
    serverId: string = '',
  ) => {
    const wrapper = new PromiseWrapper<TeleportResult>(this.schedule);
    const handle = (wrapper.handle = this.handleCounter++);
    this.wrappers[handle] = wrapper;

    this.protocol.server.message.teleport({
      handle,
      mapId,
      playerIds,
      serverId,
    });

    return wrapper.query;
  };

  private _getErrorMsg(err: { key: TELEPORT_ERROR_STATUS; msg?: string }) {
    const { key, msg } = err;
    let error = errorMsgList[key] || errorMsgList['UNKNOWN'];
    if (msg) {
      error.msg = msg;
    }
    return JSON.stringify(error);
  }
}
