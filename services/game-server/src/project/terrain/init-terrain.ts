import { allocVoxels, freeVoxels } from '@box-local/utils/voxel';
import { saveVoxelData } from './voxel';
import { genTerrain, TerrainTheme } from '.';
import { ContentServer } from '@box-local/content-server';

export async function initTerrain(spec: {
  contentServer: ContentServer;
  theme: TerrainTheme;
  baseBlock: number;
  surfaceBlock: number;
  bottomBlock: number;
  waterBlock: number;
}) {
  const voxels = allocVoxels(128, 128, 128);
  genTerrain(spec.theme, {
    voxels,
    baseBlock: spec.baseBlock,
    surfaceBlock: spec.surfaceBlock,
    bottomBlock: spec.bottomBlock,
    waterBlock: spec.waterBlock,
  });
  const hash = await saveVoxelData(spec.contentServer, voxels);
  freeVoxels(voxels);
  return hash;
}
