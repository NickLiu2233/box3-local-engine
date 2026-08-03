import { MuUTF8, MuStruct } from '@box-local/mudb/schema';

export const SciptCollisionFilterSpecSchema = new MuStruct({
  a: new MuUTF8(),
  b: new MuUTF8(),
});
