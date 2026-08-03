import { MuASCII } from '@box-local/mudb/schema';

export const HashSchema = new MuASCII();
export type Hash = typeof HashSchema.identity;
