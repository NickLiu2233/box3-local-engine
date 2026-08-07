import assert from 'assert';

import { createLocalContentWithVoxa } from '../src/content/local-content-with-voxa';
import { mergeExtraProjectInfo } from '../src/project/project-extra';
import { ExtraProjectInfoSchema } from '@box-local/schema/project/hot-schema';

async function main() {
  const expected = Buffer.from('voxa-model-bytes');
  const local = {
    init: async () => undefined,
    store: async () => 'QmStored',
    retrieve: async () => undefined,
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
  );

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
  console.log('PASS: imported extraProject keeps cloud assets and adds the shared local library');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
