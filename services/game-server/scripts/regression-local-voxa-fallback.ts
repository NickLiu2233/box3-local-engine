import assert from 'assert';

import { createLocalContentWithVoxa } from '../src/content/local-content-with-voxa';
import { mergeExtraProjectInfo } from '../src/project/project-extra';
import { ExtraProjectInfoSchema } from '@box-local/schema/project/hot-schema';

async function main() {
  const expected = Buffer.from('voxa-model-bytes');
  const bundledRuntime = Buffer.from('bundled-block-info');
  const local = {
    init: async () => undefined,
    store: async () => 'QmStored',
    retrieve: async () => undefined,
  };
  const bundled = {
    init: async () => undefined,
    store: async () => 'QmSharedStored',
    retrieve: async (hash: string) =>
      hash === 'QmBundledRuntime' ? bundledRuntime : undefined,
  };
  const logger = { debug: () => undefined };
  let requestedHash = '';
  const content = createLocalContentWithVoxa(
    local,
    logger,
    'http://voxa.test',
    async (hash) => {
      requestedHash = hash;
      return expected;
    },
    bundled,
  );

  assert.deepEqual(
    Buffer.from(await content.retrieve('QmBundledRuntime') || []),
    bundledRuntime,
  );
  assert.equal(
    requestedHash,
    '',
    'bundled runtime content must be read before the remote VOXA fallback',
  );
  console.log('PASS: project content reads fall back to bundled runtime blobs');

  assert.deepEqual(Buffer.from(await content.retrieve('QmMissingLocally') || []), expected);
  assert.equal(requestedHash, 'QmMissingLocally');
  console.log('PASS: local OSS reads fall back to VOXA blobs');

  const packaged = ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity);
  packaged.meshAssets['mesh/cloud.vb'] = {
    modelId: 1,
    hash: 'cloud-hash',
    modelPreviewHash: '',
    animated: false,
    updatedAt: '',
  };
  packaged.scriptAssets.cloud = {
    id: 'cloud',
    hash: 'cloud-script',
    name: 'cloud',
    isClient: false,
    isShare: true,
    order: 1,
    lockedMapTitle: '',
    lockedMapId: 0,
  };
  const shared = ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity);
  shared.meshAssets['mesh/local.vb'] = {
    modelId: 2,
    hash: 'local-hash',
    modelPreviewHash: '',
    animated: false,
    updatedAt: '',
  };
  const merged = mergeExtraProjectInfo(packaged, shared);
  assert.equal(merged.meshAssets['mesh/cloud.vb'].hash, 'cloud-hash');
  assert.equal(merged.meshAssets['mesh/local.vb'].hash, 'local-hash');
  assert.equal(merged.scriptAssets.cloud.hash, 'cloud-script');
  shared.scriptAssets.stale = {
    ...packaged.scriptAssets.cloud,
    id: 'stale',
    name: 'stale.js',
  };
  const afterGroupUnshare = mergeExtraProjectInfo(
    ExtraProjectInfoSchema.clone(ExtraProjectInfoSchema.identity),
    shared,
  );
  assert.equal(
    afterGroupUnshare.scriptAssets.stale,
    undefined,
    'VOXA refresh must not resurrect a script removed from the group snapshot',
  );
  delete shared.scriptAssets.stale;
  console.log('PASS: imported extraProject keeps cloud assets and adds the shared local library');

  packaged.meshAssets['mesh/New-model__local_2.vb'] = {
    modelId: 2,
    hash: 'stale-local-hash',
    modelPreviewHash: '',
    animated: false,
    updatedAt: '',
  };
  packaged.meshAssets['mesh/cloud-id-collision.vb'] = {
    modelId: 2,
    hash: 'cloud-collision-hash',
    modelPreviewHash: '',
    animated: false,
    updatedAt: '',
  };
  shared.meshAssets['mesh/Renamed__local_2.vb'] = {
    modelId: 2,
    hash: 'renamed-local-hash',
    modelPreviewHash: '',
    animated: false,
    updatedAt: '',
  };
  const renamed = mergeExtraProjectInfo(packaged, shared);
  assert.equal(
    renamed.meshAssets['mesh/New-model__local_2.vb'],
    undefined,
    'stale local aliases must not survive a VOXA rename',
  );
  assert.equal(
    renamed.meshAssets['mesh/Renamed__local_2.vb'].hash,
    'renamed-local-hash',
  );
  assert.equal(
    renamed.meshAssets['mesh/cloud-id-collision.vb'].hash,
    'cloud-collision-hash',
    'ordinary packaged assets must survive a modelId collision',
  );
  console.log('PASS: VOXA rename removes only stale local aliases');

  const deletedLocalPath = 'mesh/Renamed__local_2.vb';
  const afterDeleteRefresh = mergeExtraProjectInfo(
    renamed,
    shared,
    new Set([deletedLocalPath]),
  );
  assert.equal(
    afterDeleteRefresh.meshAssets[deletedLocalPath],
    undefined,
    'a deleted local-derived project model must not be re-injected by VOXA refresh',
  );
  assert.equal(
    afterDeleteRefresh.meshAssets['mesh/cloud-id-collision.vb'].hash,
    'cloud-collision-hash',
    'a project-model tombstone must only exclude its exact mesh path',
  );
  console.log('PASS: deleted project models stay deleted across VOXA refresh');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
