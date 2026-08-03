import { MuStruct, MuSchema } from '@box-local/mudb/schema';
import { MuRefSchema } from '@box-local/schema/utils/ref-schema';
import { GameServer } from '..';
import { Logger } from '@box-local/utils/logger';

export const PlayServerSchema = new MuStruct({
  game: <MuSchema<GameServer>>new MuRefSchema<GameServer>(),
  logger: <MuSchema<Logger>>new MuRefSchema<Logger>(),
});

export type PlayServerState = typeof PlayServerSchema.identity;
