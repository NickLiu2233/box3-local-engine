import {
  MuStruct,
  MuSchema,
  MuUint32,
  MuUint8,
  MuSortedArray,
  MuUTF8,
  MuASCII,
} from '@box-local/mudb/schema';
import { Vec3Schema, BoundsSchema } from '@box-local/schema/utils/math-schema';
import { compareId } from '@box-local/utils/id';
import { PlayerLoginState } from '@box-local/schema/player/player-schema';
import { UserIdSchema } from '@box-local/schema/permissions/permission-rda';

// -----------------------------------------------------------
// Server side player state
// -----------------------------------------------------------

// FIXME: move this into connection most likely
export const ServerPlayerSchema = new MuStruct({
  id: new MuUint32(),

  userId: UserIdSchema,
  sessionId: new MuUTF8(),
  boxId: new MuUTF8(),
  avatar: new MuUTF8(),
  userKey: new MuASCII(),
  url: new MuASCII(),

  loginState: <MuSchema<PlayerLoginState>>new MuUint8(PlayerLoginState.UNKNOWN),

  birthPoint: Vec3Schema,

  movementBounds: BoundsSchema,
});

export type ServerPlayer = typeof ServerPlayerSchema.identity;

export const ServerPlayerListSchema = new MuSortedArray(
  ServerPlayerSchema,
  Infinity,
  compareId,
);

export type ServerPlayerList = typeof ServerPlayerListSchema.identity;
