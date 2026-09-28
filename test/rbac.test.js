const test = require('node:test');
const assert = require('node:assert/strict');
const { requirePlatformAdmin } = require('../src/middleware/roleMiddleware');
const { hashToken } = require('../src/services/invitationService');
const { toSafeUser } = require('../src/models/userModel');

test('only database admin users pass platform-admin middleware', () => {
  let nextCalled = false;
  requirePlatformAdmin(
    { user: { id: 1, role: 'admin' } },
    {},
    (error) => {
      assert.equal(error, undefined);
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
});

test('group users are denied platform-admin middleware', () => {
  let receivedError;
  requirePlatformAdmin(
    { user: { id: 2, role: 'member' } },
    {},
    (error) => {
      receivedError = error;
    }
  );

  assert.equal(receivedError.statusCode, 403);
});

test('normal users remain USER even when they create groups', () => {
  const user = toSafeUser({
    id: 3,
    name: 'Ajo Head',
    email: 'head@example.com',
    role: 'member',
    is_active: 1
  });

  assert.equal(user.platformRole, 'USER');
});

test('invitation tokens are stored as one-way hashes', () => {
  const token = 'PAMOJA-ABC123';
  const firstHash = hashToken(token);
  const secondHash = hashToken(token.toLowerCase());

  assert.equal(firstHash, secondHash);
  assert.match(firstHash, /^[a-f0-9]{64}$/);
  assert.notEqual(firstHash, token);
});
