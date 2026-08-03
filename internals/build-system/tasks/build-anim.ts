import { BuildSystem } from '../type';
import { IKPaletteSchema } from '@box-local/schema/animation/ik-schema';

export async function buildAnim(bs: BuildSystem, hash: string) {
  const playerJSON = await bs.retrieveJSON(hash);
  const playerRig = IKPaletteSchema.fromJSON(playerJSON);
  return await bs.storeBinarySchema(IKPaletteSchema, playerRig);
}
