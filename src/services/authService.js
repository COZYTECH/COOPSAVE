const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');
const { signToken } = require('../utils/jwt');
const { toSafeUser } = require('../models/userModel');

const SALT_ROUNDS = 12;

const buildAuthResponse = (user) => ({
  user: toSafeUser(user),
  token: signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role
  })
});

const register = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await userRepository.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create({
    name,
    email: normalizedEmail,
    passwordHash
  });

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

  return toSafeUser(user);
};

module.exports = {
  register,
  login,
  getCurrentUser
};
