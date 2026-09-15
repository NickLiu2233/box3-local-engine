import assert from 'node:assert/strict';
import {
  canPersistLocalSharedScript,
  isSharedAfterLocalScriptAction,
} from '../src/edit/replica/local-shared-script-state';

assert.equal(isSharedAfterLocalScriptAction('share'), true);
assert.equal(
  isSharedAfterLocalScriptAction('save'),
  true,
  'saving a shared script must keep its editor replica marked as shared',
);
assert.equal(isSharedAfterLocalScriptAction('unshare'), false);
assert.equal(canPersistLocalSharedScript('save', true), true);
assert.equal(
  canPersistLocalSharedScript('save', false),
  false,
  'a stale map must not recreate a script another map has unshared',
);

console.log('local shared-script state regression passed');
