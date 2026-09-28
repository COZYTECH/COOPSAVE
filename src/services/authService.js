const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const userRepository = require('../repositories/userRepository');
const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const AppError = require('../utils/appError');
const { signToken } = require('../utils/jwt');
const { toSafeUser } = require('../models/userModel');
const accessService = require('./accessService');
const invitationService = require('./invitationService');
const paymentIdentityService = require('./paymentIdentityService');

const SALT_ROUNDS = 12;

const buildAuthResponse = async (user) => ({
  user: {
    ...toSafeUser(user),
    access: await accessService.getAccess(user)
  },
  token: signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role
  })
});

const register = async ({
  name,
  email,
  password,
  intent,
  group_name: groupName,
  group_description: groupDescription,
  invite_code: inviteCode
}) => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Keep the original standalone registration contract for older clients that
  // have not adopted onboarding intent yet.
  if (!intent) {
    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash
    });

    return buildAuthResponse(user);
  }

  if (!['CREATE_AJO', 'JOIN_AJO'].includes(intent)) {
    throw new AppError('Registration path is invalid.', 400);
  }

  const connection = await pool.getConnection();
  let user;
  let cooperativeId = null;

  try {
    // Registration owns this transaction because a user must never be left
    // behind without the group or membership selected during onboarding.
    await connection.beginTransaction();

    user = await userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash
    }, connection);

    if (intent === 'CREATE_AJO') {
      const cooperative = await cooperativeRepository.create({
        name: groupName,
        description: groupDescription || null,
        ownerId: user.id
      }, connection);
      cooperativeId = cooperative.id;

      await groupMembershipRepository.create({
        cooperativeId: cooperative.id,
        userId: user.id,
        role: 'GROUP_ADMIN'
      }, connection);
    } else {
      const invitation = await invitationService.consumeInvitation({
        token: inviteCode,
        userId: user.id,
        role: 'GROUP_MEMBER',
        db: connection
      });
      cooperativeId = invitation.cooperative_id;
    }

    await connection.commit();
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

  // Provider calls happen only after the membership transaction commits. A
  // provider failure is recorded on the payment identity and never rolls back
  // an otherwise valid user or group membership.
  if (cooperativeId) {
    await paymentIdentityService.provisionForUserMembership({
      userId: user.id,
      cooperativeId
    });
  }

  return buildAuthResponse(user);
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user || !user.is_active) {
    throw new AppError('Invalid email or password.', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password.', 401);
  }

  return buildAuthResponse(user);
};

const getCurrentUser = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user || !user.is_active) {
    throw new AppError('User account is unavailable.', 404);
  }

  return {
    ...toSafeUser(user),
    access: await accessService.getAccess(user)
  };
};

module.exports = {
  register,
  login,
  getCurrentUser
};
