import { MuSchema, MuArray } from '@box-local/mudb/schema';
import { MuRefSchema } from '@box-local/schema/utils/ref-schema';

export const getMuRef = <T>() => {
  const ClientSchema = <MuSchema<T>>new MuRefSchema<T>();
  return ClientSchema.clone(ClientSchema.identity);
};
