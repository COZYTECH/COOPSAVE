const env = require('../config/env');
const apiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return apiResponse.error(res, 409, 'Duplicate record detected.');
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error.' : err.message;

  if (env.nodeEnv !== 'test') {
    console.error(err);
  }

  const errors = err.errors || null;

  if (env.nodeEnv === 'development' && statusCode === 500) {
    return apiResponse.error(res, statusCode, message, {
      details: err.message,
      stack: err.stack
    });
  }

  return apiResponse.error(res, statusCode, message, errors);
};

module.exports = errorHandler;
