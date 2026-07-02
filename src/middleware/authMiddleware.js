const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');
const { verifyToken } = require('../utils/jwt');
const { toSafeUser } = require('../models/userModel');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Authentication token is required.', 401);
    }

    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.sub);

    if (!user || !user.is_active) {
      throw new AppError('Authentication token is invalid.', 401);
    }

    req.user = toSafeUser(user);
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Authentication token is invalid or expired.', 401));
    }

    return next(error);
  }
};

module.exports = {
  authenticate
};
