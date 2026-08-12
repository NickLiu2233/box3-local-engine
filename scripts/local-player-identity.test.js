const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createPlayerUserKey,
  signRuntimePlayerIdentity,
  verifyRuntimePlayerIdentity,
} = require('../packages/utils/build/local-player-identity');

const secret = 'test-only-player-identity-secret';
const guest = {
  subjectId: '0123456789abcdef0123456789abcdef',
  userId: '',
  username: '',
  displayName: '游客123456',
  avatar: '',
  role: 'player',
  status: 'active',
};

test('runtime identity assertion round-trips guest fields', () => {
  const now = Date.now();
  const assertion = signRuntimePlayerIdentity(guest, secret, 60_000);
  const identity = verifyRuntimePlayerIdentity(assertion, secret, now);

  assert.ok(identity);
  assert.deepEqual(
    { ...identity, expiresAt: 0 },
    { ...guest, expiresAt: 0 },
  );
  assert.ok(identity.expiresAt > now);
});

test('tampered and expired assertions are rejected', () => {
  const assertion = signRuntimePlayerIdentity(guest, secret, 5_000);
  const [payload, signature] = assertion.split('.');

  assert.equal(verifyRuntimePlayerIdentity(`${payload}x.${signature}`, secret), null);
  assert.equal(verifyRuntimePlayerIdentity(assertion, secret, Date.now() + 6_000), null);
  assert.equal(verifyRuntimePlayerIdentity(assertion, 'different-secret'), null);
});

test('userKey is stable across guest account promotion', () => {
  const beforeRegistration = createPlayerUserKey(guest.subjectId, secret);
  const afterRegistration = createPlayerUserKey(guest.subjectId, secret);

  assert.equal(beforeRegistration, afterRegistration);
  assert.equal(beforeRegistration.length, 22);
  assert.notEqual(
    beforeRegistration,
    createPlayerUserKey('fedcba9876543210fedcba9876543210', secret),
  );
});

test('registered identity preserves account fields', () => {
  const account = {
    ...guest,
    userId: '42',
    username: 'local_player',
    displayName: '本地玩家',
    role: 'moderator',
  };
  const assertion = signRuntimePlayerIdentity(account, secret);

  assert.deepEqual(
    { ...verifyRuntimePlayerIdentity(assertion, secret), expiresAt: 0 },
    { ...account, expiresAt: 0 },
  );
});
