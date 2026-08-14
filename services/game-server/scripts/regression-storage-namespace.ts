import assert from 'assert';

import { resolveGroupStorageNamespace } from '../src/storage/storage-namespace';

assert.equal(resolveGroupStorageNamespace({
  groupStorageNamespace: 'group-main',
  dataStorageNamespace: 'map-one',
}), 'group-main');
assert.equal(resolveGroupStorageNamespace({
  groupId: 42,
  dataStorageNamespace: 'map-one',
}), '42');
assert.equal(resolveGroupStorageNamespace({
  dataStorageNamespace: 'map-one',
}), 'map-one');
assert.equal(resolveGroupStorageNamespace({
  containerName: 'map-two',
}), 'map-two');
assert.notEqual(resolveGroupStorageNamespace({}), 'global');

console.log('storage namespace regression passed');
