const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../lib/export-project.ts');
const compiledPath = path.join(os.tmpdir(), `box-migrator-export-${process.pid}.cjs`);
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

fs.writeFileSync(compiledPath, compiled);
(async () => {
  const {
    createConcurrencyGate,
    drainDynamicQueue,
    fetchBlob,
    parseJSON,
    referencedHashes,
    referencedResources,
  } = require(compiledPath);
  const actualHash = 'QmS1jvj2GQDwwJpSbpxAJSLbmWvncTQ3Xc69md4KxXhSUf';
  const previewName = 'QmZc3bR7rJHXuYBtSe2VZoS5EYZ7m5kHzpK2cJ1hPzb3QU.jpeg';
  const extensionlessPreview = 'QmUkQqR3S7vT7yswnuFkQzYEu8c1WVL8HbcCoV2mmYfHXv';
  const document = parseJSON(Buffer.from(JSON.stringify([
    { hash: actualHash, previewImage: previewName },
    { hash: actualHash, previewImage: extensionlessPreview },
  ])));
  const references = [...referencedHashes(document)];

  assert.deepEqual(references, [actualHash]);
  console.log('PASS: JSON arrays keep real hashes and ignore preview-image filenames');

  const modelHash = 'QmSKfrPgmkCoomW2tbpHkynGL5aCd4qRA2JSBG1QDhRJzJ';
  const modelDataHash = 'QmTCCZ2me7uELkxvCMBkwa6t2o1DRXQ9CcwMAYGZ8wbxF8';
  assert.deepEqual(referencedResources([{
    key: 'mesh/test.vb',
    value: { type: 2, hash: modelHash, previewImage: `${actualHash}.jpeg` },
  }]), [{ hash: modelHash, sourceKind: 'voxel-model' }]);
  console.log('PASS: voxel asset hashes retain their boxes asset type');

  process.env.BOX_MIGRATOR_CONTENT_API_URL = 'https://api.invalid.test';
  process.env.BOX_MIGRATOR_CONTENT_URL = 'https://cdn.invalid.test';
  const originalFetch = global.fetch;
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    throw new Error('simulated timeout');
  };
  await assert.rejects(() => fetchBlob(actualHash, 1024), /无法下载 blob/);
  global.fetch = originalFetch;
  assert.equal(attempts, 2, 'each configured source must be attempted once without retrying');
  console.log('PASS: failed blobs try each source once without retries');

  process.env.BOX_MIGRATOR_OSS_URL = 'https://oss.invalid.test';
  const requestedURLs = [];
  global.fetch = async (url) => {
    requestedURLs.push(String(url));
    if (String(url) === `https://oss.invalid.test/engine/m/${modelHash}`) {
      return new Response(JSON.stringify({ version: 7, bounds: [1, 2, 3], dataHash: modelDataHash }));
    }
    return new Response('', { status: 404 });
  };
  const modelMetadata = await fetchBlob(modelHash, 1024, undefined, undefined, 'voxel-model');
  global.fetch = originalFetch;
  assert.equal(JSON.parse(Buffer.from(modelMetadata).toString()).dataHash, modelDataHash);
  assert.ok(requestedURLs.some((url) => url.endsWith(`/engine/m/${modelHash}`)));
  assert.ok(!requestedURLs.some((url) => url.includes('/avatar/m/')));
  console.log('PASS: boxes-style voxel lookup falls back from IPFS to engine/m only');

  const timing = {};
  await drainDynamicQueue(
    [{ id: 'slow' }, { id: 'fast' }],
    2,
    (item) => item.id,
    async (item) => {
      timing[`${item.id}Start`] = Date.now();
      await new Promise((resolve) => setTimeout(resolve, item.id === 'slow' ? 80 : 5));
      timing[`${item.id}End`] = Date.now();
      return item.id === 'fast' ? [{ id: 'child' }] : [];
    },
  );
  assert.ok(timing.childStart < timing.slowEnd, 'a freed slot must start newly discovered work immediately');
  console.log('PASS: graph downloads continuously refill free concurrency slots');

  const withSlot = createConcurrencyGate(3);
  let activeRequests = 0;
  let peakRequests = 0;
  await Promise.all(Array.from({ length: 24 }, () => withSlot(async () => {
    activeRequests += 1;
    peakRequests = Math.max(peakRequests, activeRequests);
    await new Promise((resolve) => setTimeout(resolve, 5));
    activeRequests -= 1;
  })));
  assert.equal(peakRequests, 3, 'the HTTP gate must cap actual active requests');
  console.log('PASS: actual HTTP requests respect the configured concurrency cap');
})().finally(() => {
  fs.rmSync(compiledPath, { force: true });
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
