const success = (res, statusCode, message, data = null, meta = null) => {
  const payload = {
    success: true,
    message
  };

  if (data !== null) {
    payload.data = data;
  }

  if (meta !== null) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const error = (res, statusCode, message, errors = null, meta = {}) => {
  const payload = {
    success: false,
    message
  };

  if (errors !== null) {
    payload.errors = errors;
  }

  if (meta.code) {
    payload.code = meta.code;
  }

  if (meta.requestId) {
    payload.requestId = meta.requestId;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  success,
  error
};
