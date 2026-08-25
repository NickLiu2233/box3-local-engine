import { allocVoxels, freeVoxels } from '@box-local/utils/voxel';
import { saveVoxelData } from './voxel';
import { genTerrain, TerrainTheme } from '.';
import { ContentServer } from '@box-local/content-server';

const allowedSizes = new Set(['64,64,64', '128,128,128', '256,128,256', '256,64,256']);

function initialMapSize(): [number, number, number] {
  const raw = String(process.env.BOX_INITIAL_MAP_SIZE || '').trim();
  if (!allowedSizes.has(raw)) return [128, 128, 128];
  return raw.split(',').map(Number) as [number, number, number];
}

export async function initTerrain(spec: {
  contentServer: ContentServer;
  theme: TerrainTheme;
  baseBlock: number;
  surfaceBlock: number;
  bottomBlock: number;
  waterBlock: number;
}) {
  const [width, height, depth] = initialMapSize();
  const voxels = allocVoxels(width, height, depth);
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
