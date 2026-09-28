const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'secret',
  'secret_key',
  'webhook_secret',
  'token',
  'access_token',
  'client_secret',
  'encryption_key',
  'private_key',
  'signature',
  'verif-hash',
  'verif_hash',
  'account_number_encrypted',
  'account_number',
  'accountnumber',
  'account_ref',
  'email',
  'phone',
  'phonenumber',
  'account_name',
  'card_number',
  'cardno',
  'cvv',
  'pin',
  'otp'
]);

const redact = (value, key = '') => {
  if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
    return '[REDACTED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((result, [entryKey, entryValue]) => {
    result[entryKey] = redact(entryValue, entryKey);
    return result;
  }, {});
};

const serializeError = (error) => ({
  name: error?.name || 'Error',
  message: error?.message || 'Unknown error',
  code: error?.code || null,
  statusCode: error?.statusCode || null,
  stack: error?.stack || null,
  sqlState: error?.sqlState || null,
  sqlMessage: error?.sqlMessage || null,
  errno: error?.errno || null,
  provider: error?.response
    ? {
      status: error.response.status || null,
      code: error.response.data?.code || null,
      message: error.response.data?.message || null,
      data: redact(error.response.data)
    }
    : null,
  request: error?.config
    ? {
      method: error.config.method || null,
      url: error.config.url || null
    }
    : null
});

const logError = (error, context = {}) => {
  console.error(JSON.stringify({
    level: 'error',
    event: 'http.request.failed',
    timestamp: new Date().toISOString(),
    ...redact(context),
    error: serializeError(error)
  }));
};

module.exports = {
  redact,
  serializeError,
  logError
};
