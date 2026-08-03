import {
  MuStruct,
  MuVarint,
  MuUTF8,
  MuASCII,
  MuSchema,
  MuOption,
  MuArray,
} from '@box-local/mudb/schema';
import { CommonError } from '@box-local/schema/api/js/error';

export type FETCH_ERROR_STATUS = 'UNKNOWN';
export type ErrorType = CommonError<FETCH_ERROR_STATUS>;

export const FetchScriptProtocol = {
  name: 'fetch-api',
  client: {
    fetchDone: new MuStruct({
      handle: new MuVarint(),
      data: new MuOption(new MuUTF8()),
    }),
    fetchError: new MuStruct({
      handle: new MuVarint(),
      error: new MuStruct({
        key: <MuSchema<FETCH_ERROR_STATUS>>new MuASCII(),
        msg: new MuOption(new MuUTF8()),
      }),
    }),
  },
  server: {
    getMiaoShells: new MuStruct({
      handle: new MuVarint(),
      playerId: new MuVarint(),
    }),
    querySocial: new MuStruct({
      handle: new MuVarint(),
      userId: new MuUTF8(),
      socialType: new MuVarint(),
    }),
    querySocialStatistic: new MuStruct({
      handle: new MuVarint(),
      userId: new MuUTF8(),
    }),
    createTempChat: new MuStruct({
      handle: new MuVarint(),
      userIds: new MuArray(new MuUTF8(), Infinity),
    }),
    destroyTempChat: new MuStruct({
      handle: new MuVarint(),
      chatIds: new MuArray(new MuUTF8(), Infinity),
    }),
    addTempChatPlayer: new MuStruct({
      handle: new MuVarint(),
      userIds: new MuArray(new MuUTF8(), Infinity),
      chatId: new MuUTF8(),
    }),
    removeTempChatPlayer: new MuStruct({
      handle: new MuVarint(),
      userIds: new MuArray(new MuUTF8(), Infinity),
      chatId: new MuUTF8(),
    }),
    getTempChats: new MuStruct({
      handle: new MuVarint(),
    }),
    getTempChatUsers: new MuStruct({
      handle: new MuVarint(),
      chatId: new MuUTF8(),
    }),
  },
};
