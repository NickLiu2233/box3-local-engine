import { NetStateSchema } from '@box-local/schema/net/net-schema';
import { GamePrivateReplicaSchema } from '@box-local/schema/replica/game-private-replica';
import { ChatEventSchema } from '@box-local/schema/events/chat-event-schema';
import { PhysicsEventSchema } from '@box-local/schema/events/physics-event-schema';
import { MuSortedArray, MuUint32, MuStruct, MuVarint } from '@box-local/mudb/schema';
import { ServerPlayerListSchema } from '../player/player-server-schema';
import { ScriptNetInputSetSchema } from '@box-local/schema/events/net-events';
import { compareId } from '@box-local/utils/id';
import { RespawnEventSetSchema } from '@box-local/schema/events/damage-event-schema';
import { NetModelSetSchema } from '@box-local/schema/mesh/model-schema';
import { EnvironmentParamSchema } from '@box-local/schema/environment/environment-schema';
import { PlayerDisplaySetSchema } from '@box-local/schema/player/player-schema';
import { DamageSetSchema } from '@box-local/schema/damage/damage-schema';
import { ContactIndexSchema } from '@box-local/schema/physics/physics-schema';
import { ServerParticleSetSchema } from '../particle/particle-server-state';
import { InteractiveEventSetSchema } from '../interact/interact-server-state';
import { InteractComponentSetSchema } from '@box-local/schema/interact/interact-protocol';
import { DialogEventSetSchema } from '../dialog/dialog-server-schema';
import { ServerSoundStateSchema } from '../sound/server-sound-state';
import { PurchaseSuccessEventsSchema } from '@box-local/schema/events/market-event-schema';
import { RemoteChannelEventsSchema } from '@box-local/schema/events/remote-channel-event-schema';
import { ClientKeyboardEventsSchema } from '@box-local/schema/events/client-keyboard-event-schema';
import { EntityNameComponentSetSchema } from '@box-local/schema/entity-name/entity-name';

export const ScriptEventsSchema = new MuStruct({
  chatEvents: ChatEventSchema,
  physicsEvents: PhysicsEventSchema,
  inputEvents: ScriptNetInputSetSchema,
  respawnEvents: RespawnEventSetSchema,
  interactEvents: InteractiveEventSetSchema,
  dialogEvents: DialogEventSetSchema,
  purchaseSuccessEvents: PurchaseSuccessEventsSchema,
  remoteChannelEvents: RemoteChannelEventsSchema,
  keyboardEvents: ClientKeyboardEventsSchema,
});
export type ScriptEvents = typeof ScriptEventsSchema.identity;

export const ScriptStateSnapshotSchema = new MuStruct({
  tick: new MuUint32(),
  entities: new MuSortedArray(new MuUint32(), Infinity, (a, b) => a - b),
  entityCounter: new MuVarint(),
  net: NetStateSchema,
  environment: EnvironmentParamSchema,
  contact: ContactIndexSchema,
  models: NetModelSetSchema,
  players: PlayerDisplaySetSchema,
  particles: ServerParticleSetSchema,
  damage: DamageSetSchema,
  serverPlayers: ServerPlayerListSchema,
  playerReplicas: new MuSortedArray(
    GamePrivateReplicaSchema,
    Infinity,
    compareId,
  ),
  interact: InteractComponentSetSchema,
  sound: ServerSoundStateSchema,
  entityName: EntityNameComponentSetSchema,
});
export type ScriptStateSnapshot = typeof ScriptStateSnapshotSchema.identity;
