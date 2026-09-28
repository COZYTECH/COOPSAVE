const test = require('node:test');
const assert = require('node:assert/strict');
const invitationRepository = require('../src/repositories/invitationRepository');
const groupMembershipRepository = require('../src/repositories/groupMembershipRepository');
const invitationService = require('../src/services/invitationService');

const baseInvitation = {
  id: 12,
  cooperative_id: 44,
  cooperative_name: 'Test Ajo',
  status: 'ACTIVE',
  expires_at: new Date(Date.now() + 60_000),
  max_uses: 1,
  uses: 0
};

test('invalid or expired invitations are rejected before membership creation', async () => {
  const originalFind = invitationRepository.findByTokenHash;
  const originalCreate = groupMembershipRepository.create;

  invitationRepository.findByTokenHash = async () => ({
    ...baseInvitation,
    status: 'EXPIRED'
  });
  groupMembershipRepository.create = async () => {
    throw new Error('membership should not be created');
  };

  await assert.rejects(
    invitationService.consumeInvitation({ token: 'PAMOJA-INVALID', userId: 9, db: {} }),
    (error) => error.statusCode === 400
  );

  invitationRepository.findByTokenHash = originalFind;
  groupMembershipRepository.create = originalCreate;
});

test('a max-use invitation rejects later joins', async () => {
  const originalFind = invitationRepository.findByTokenHash;

  invitationRepository.findByTokenHash = async () => ({
    ...baseInvitation,
    uses: 1,
    max_uses: 1
  });

  await assert.rejects(
    invitationService.consumeInvitation({ token: 'PAMOJA-USED', userId: 9, db: {} }),
    (error) => error.statusCode === 400
  );

  invitationRepository.findByTokenHash = originalFind;
});

test('duplicate membership is rejected without incrementing invitation usage', async () => {
  const originalFindInvitation = invitationRepository.findByTokenHash;
  const originalFindMembership = groupMembershipRepository.findByUserAndCooperative;
  const originalIncrement = invitationRepository.incrementUsage;

  invitationRepository.findByTokenHash = async () => baseInvitation;
  groupMembershipRepository.findByUserAndCooperative = async () => ({ id: 99 });
  invitationRepository.incrementUsage = async () => {
    throw new Error('usage should not be incremented');
  };

  await assert.rejects(
    invitationService.consumeInvitation({ token: 'PAMOJA-DUPLICATE', userId: 9, db: {} }),
    (error) => error.statusCode === 409
  );

  invitationRepository.findByTokenHash = originalFindInvitation;
  groupMembershipRepository.findByUserAndCooperative = originalFindMembership;
  invitationRepository.incrementUsage = originalIncrement;
});
