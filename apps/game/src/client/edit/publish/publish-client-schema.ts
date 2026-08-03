import { MuStruct, MuVarint } from '@box-local/mudb/schema';
import { RPCTokenSchema } from '@box-local/schema/replica/replica-schema';
import { PendingRPCSchema } from '../replica/replica-client-schema';

export const PublishClientStateSchema = new MuStruct({
  rpcCounter: RPCTokenSchema,
  pendingRPC: PendingRPCSchema,

  gameId: new MuVarint(),
});
