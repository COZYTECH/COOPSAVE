const AppError = require('../utils/appError');

const requirePlatformAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Platform administrator access is required.', 403));
  }

  return next();
};

module.exports = {
  requirePlatformAdmin
};
