import assert from 'assert';

import { createLocalContentWithVoxa } from '../src/content/local-content-with-voxa';

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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
