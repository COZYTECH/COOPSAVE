const apiResponse = require('../utils/apiResponse');
const { logError } = require('../utils/errorDiagnostics');

const statusCodes = new Map([
  [400, 'BAD_REQUEST'],
  [401, 'UNAUTHENTICATED'],
  [403, 'FORBIDDEN'],
  [404, 'NOT_FOUND'],
  [409, 'CONFLICT'],
  [422, 'VALIDATION_ERROR'],
  [429, 'RATE_LIMITED'],
  [502, 'PROVIDER_ERROR'],
  [503, 'SERVICE_UNAVAILABLE']
]);

const errorHandler = (err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    logError(err, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl
    });
    return apiResponse.error(res, 409, 'Duplicate record detected.', null, {
      code: 'CONFLICT',
      requestId: req.requestId
    });
  }

  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;
  const message = isOperational && statusCode < 500
    ? err.message
    : statusCode === 502
      ? 'We could not reach the payment provider. Please try again.'
      : statusCode === 503
        ? 'This service is temporarily unavailable. Please try again.'
        : 'Something went wrong. Please try again.';
  const code = isOperational && err.code && typeof err.code === 'string'
    ? err.code
    : statusCodes.get(statusCode) || 'INTERNAL_ERROR';

  logError(err, {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id || null
  });

  const errors = isOperational && Array.isArray(err.errors)
    ? err.errors.map((item) => {
      if (typeof item === 'string') {
        return { message: item };
      }
      return {
        ...(item?.field ? { field: String(item.field) } : {}),
        message: String(item?.message || '')
      };
    }).filter((item) => item.message)
    : null;

  return apiResponse.error(res, statusCode, message, errors, {
    code,
    requestId: req.requestId
  });
};

module.exports = errorHandler;
