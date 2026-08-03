import { MuStruct, MuUTF8, MuVarint } from '@box-local/mudb/schema';

export const RemoteChannelProtocol = {
  name: 'remote-channel',
  client: {
    sendClientEvent: new MuStruct({
      tick: new MuVarint(),
      args: new MuUTF8(),
    }),
  },
  server: {
    sendServerEvent: new MuStruct({
      tick: new MuVarint(),
      args: new MuUTF8(),
    }),
  },
};
