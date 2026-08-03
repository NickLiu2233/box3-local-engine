import { DamageEventSchema } from './damage-event-schema';
import { MuStruct } from '@box-local/mudb/schema';

export const ScriptSentEventSchema = new MuStruct({
  damage: DamageEventSchema,
});
