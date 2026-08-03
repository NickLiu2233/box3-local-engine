import { MuStruct, MuVarint, MuVoid } from '@box-local/mudb/schema';
import {
  MessageEventSchema,
  PostMessageSchema,
} from '@box-local/schema/navigator/navigator-schema';

export const NavigatorScriptProtocol = {
  name: 'navigator-script',
  client: {
    notifyMessageEvent: new MuStruct({
      playerId: new MuVarint(),
      event: MessageEventSchema,
    }),
    reset: new MuVoid(),
  },
  server: {
    postMessage: new MuStruct({
      playerId: new MuVarint(),
      content: PostMessageSchema,
    }),
  },
};
