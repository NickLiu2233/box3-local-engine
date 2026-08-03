import { MuStruct, MuVarint } from '@box-local/mudb/schema';

export const PublishServerStateSchema = new MuStruct({
  // content id for the game
  gameId: new MuVarint(),
});
