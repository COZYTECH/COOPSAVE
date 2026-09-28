const crypto = require('crypto');
const invitationRepository = require('../repositories/invitationRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const { pool } = require('../config/database');
const AppError = require('../utils/appError');
const { toCooperative } = require('../models/cooperativeModel');
const paymentIdentityService = require('./paymentIdentityService');

const INVITE_TTL_DAYS = 7;

const hashToken = (token) => crypto
  .createHash('sha256')
  .update(String(token).trim().toUpperCase())
  .digest('hex');

const createRawToken = () => `PAMOJA-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

const toInvitation = (invitation, token) => ({
  id: invitation.id,
  cooperativeId: invitation.cooperative_id,
  cooperativeName: invitation.cooperative_name,
  code: token,
  expiresAt: invitation.expires_at,
  maxUses: invitation.max_uses,
  uses: invitation.uses,
  status: invitation.status,
  createdAt: invitation.created_at
});

const assertValidInvitation = (invitation) => {
  if (
    !invitation ||
    invitation.status !== 'ACTIVE' ||
    new Date(invitation.expires_at).getTime() <= Date.now() ||
    Number(invitation.uses) >= Number(invitation.max_uses)
  ) {
    throw new AppError('Invitation code is invalid or expired.', 400);
  }
};

const createInvitation = async ({ cooperativeId, createdBy, expiresAt, maxUses = 1 }) => {
  const cooperative = await cooperativeRepository.findByIdAndManagerId(
    cooperativeId,
    createdBy
  );

  if (!cooperative) {
    throw new AppError('Cooperative not found.', 404);
  }

  const rawToken = createRawToken();
  const expiration = expiresAt
    ? new Date(expiresAt)
    : new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  if (Number.isNaN(expiration.getTime()) || expiration.getTime() <= Date.now()) {
    throw new AppError('Invitation expiry must be in the future.', 400);
  }

  const normalizedMaxUses = Number(maxUses);
  if (!Number.isInteger(normalizedMaxUses) || normalizedMaxUses < 1 || normalizedMaxUses > 1000) {
    throw new AppError('Invitation maximum uses must be between 1 and 1000.', 400);
  }

  const invitation = await invitationRepository.create({
    cooperativeId,
    tokenHash: hashToken(rawToken),
    createdBy,
    expiresAt: expiration,
    maxUses: normalizedMaxUses
  });

  return toInvitation(invitation, rawToken);
};

const consumeInvitation = async ({ token, userId, role = 'GROUP_MEMBER', db }) => {
  const invitation = await invitationRepository.findByTokenHash(
    hashToken(token),
    db,
    true
  );

  assertValidInvitation(invitation);

  const existingMembership = await groupMembershipRepository.findByUserAndCooperative(
    userId,
    invitation.cooperative_id,
    db
  );

  if (existingMembership) {
    throw new AppError('You already belong to this cooperative.', 409);
  }

  await groupMembershipRepository.create({
    cooperativeId: invitation.cooperative_id,
    userId,
    role
  }, db);

  const incremented = await invitationRepository.incrementUsage(invitation.id, db);

  if (!incremented) {
    throw new AppError('Invitation code is no longer available.', 409);
  }

  return invitation;
};

const joinExistingUser = async ({ token, userId }) => {
  const connection = await pool.getConnection();
  let cooperativeId;

  try {
    await connection.beginTransaction();
    const invitation = await consumeInvitation({ token, userId, db: connection });
    await connection.commit();
    cooperativeId = invitation.cooperative_id;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error(rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }

  await paymentIdentityService.provisionForUserMembership({ userId, cooperativeId });
  return toCooperative(await cooperativeRepository.findById(cooperativeId));
};

module.exports = {
  hashToken,
  createInvitation,
  consumeInvitation,
  joinExistingUser
};
