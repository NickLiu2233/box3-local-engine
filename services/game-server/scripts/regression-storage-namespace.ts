import assert from 'assert';

import { resolveGroupStorageNamespace } from '../src/storage/storage-namespace';
const {
  resolveMapRuntimeNamespace,
  resolveGroupRuntimeNamespace,
} = require('../../../apps/local-engine/src/runtime-storage-namespace');

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

const mainMapUuid = '11111111-1111-4111-8111-111111111111';
const subMapUuid = '22222222-2222-4222-8222-222222222222';
const groupUuid = '33333333-3333-4333-8333-333333333333';
assert.equal(resolveMapRuntimeNamespace({
  mapUuid: mainMapUuid,
}), mainMapUuid);
assert.equal(resolveMapRuntimeNamespace({
  mapUuid: subMapUuid,
}), subMapUuid);
assert.equal(resolveGroupRuntimeNamespace({
  mapGroupUuid: groupUuid,
  mapUuid: mainMapUuid,
  explicitNamespace: 'global',
}), groupUuid);
assert.equal(resolveGroupRuntimeNamespace({
  mapGroupUuid: groupUuid,
  mapUuid: subMapUuid,
  explicitNamespace: 'global',
}), groupUuid);
assert.notEqual(resolveGroupRuntimeNamespace({
  mapGroupUuid: '44444444-4444-4444-8444-444444444444',
  mapUuid: '55555555-5555-4555-8555-555555555555',
  explicitNamespace: 'global',
}), groupUuid);

console.log('storage namespace regression passed');
