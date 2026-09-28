const AppError = require('../utils/appError');

const notFoundHandler = (req, res, next) => {
  next(new AppError('The requested resource was not found.', 404));
};

module.exports = notFoundHandler;
