import assert from 'node:assert/strict';

import { ExtraProjectInfoSchema } from '@box-local/schema/project/hot-schema';
import { runtimeMeshAssets } from '../src/project/runtime-mesh-assets';

const validHash = 'QmSKfrPgmkCoomW2tbpHkynGL5aCd4qRA2JSBG1QDhRJzJ';
const meshAssets = ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity).meshAssets;
meshAssets['mesh/valid.vb'] = {
  modelId: 1,
  hash: validHash,
  modelPreviewHash: '',
  animated: false,
  updatedAt: '',
};
// This is the partial model data retained by older VOXA imports. Passing this
// to migrateVoxel('') causes the exact "retrieveContent ... invalid hash" error.
meshAssets['mesh/legacy-incomplete.vb'] = {
  modelId: 2,
  hash: '',
  modelPreviewHash: '',
  animated: false,
  updatedAt: '',
};

assert.deepEqual(
  runtimeMeshAssets(meshAssets).map(([path]) => path),
  ['mesh/valid.vb'],
  'runtime model preparation must discard entries without a usable content hash',
);

console.log('runtime mesh asset integrity regression passed');
