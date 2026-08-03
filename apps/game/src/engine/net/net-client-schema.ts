import { NetModelSetSchema } from '@box-local/schema/mesh/model-schema';
import { MuStruct } from '@box-local/mudb/schema';

export const GameClientReplicaSchema = new MuStruct({
  models: NetModelSetSchema,
});
