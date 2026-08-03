import { PlayerEventSchema } from '../events/player-event-schema';
import { MuStruct, MuUTF8, MuVoid } from '@box-local/mudb/schema';

export const PlayerProtocolSchema = {
  name: 'player-protocol',
  client: {
    playerJoin: PlayerEventSchema,
    playerLeave: PlayerEventSchema,
    openUserProfileDialog: new MuStruct({
      userId: new MuUTF8(),
    }),
  },
  server: {
    updateAvatarSkin: new MuVoid(),
  },
};
