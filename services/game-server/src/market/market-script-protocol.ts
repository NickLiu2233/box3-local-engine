import { MuStruct, MuVarint, MuArray, MuUTF8 } from '@box-local/mudb/schema';

export const MarketScriptProtocol = {
  name: 'market-script',
  client: {},
  server: {
    openMarketplace: new MuStruct({
      clientId: new MuVarint(),
      productIds: new MuArray(new MuUTF8(), Infinity),
    }),
    ackPurchaseSuccessMsg: new MuStruct({
      msgId: new MuUTF8(),
    }),
  },
};
