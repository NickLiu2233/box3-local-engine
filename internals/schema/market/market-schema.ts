import { MuArray, MuStruct, MuUTF8 } from '@box-local/mudb/schema';

export const OpenMarketplaceSchema = new MuStruct({
  productIds: new MuArray(new MuUTF8(), Infinity),
});
