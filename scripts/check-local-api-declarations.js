const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const forbidden = [
  'getMiaoShells',
  'querySocial',
  'querySocialStatistic',
  'createTempChat',
  'destroyTempChat',
  'addTempChatPlayer',
  'removeTempChatPlayer',
  'getTempChats',
  'getTempChatUsers',
  'openMarketplace',
  'openUserProfileDialog',
];

const resourceSource = fs.readFileSync(
  path.join(root, 'apps/game/src/resource/api.ts'),
  'utf8',
);
const hash = resourceSource.match(/`([^`]+)`/)?.[1];
assert.ok(hash, 'apps/game/src/resource/api.ts has no declaration blob hash');

const files = [
  'apps/game/scripts/assets/api/js/api/js/api.d.ts',
  'packages/script-api/dts/server-api-types.dts',
  `apps/local-engine/data/blobs/${hash}`,
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const api of forbidden) {
    assert.equal(source.includes(api), false, `${file} still declares ${api}`);
  }
}

console.log(`local Monaco declaration checks passed (${hash})`);
