const axios = require('axios');
const env = require('./env');

const SENSITIVE_KEYS = new Set([
  'authorization',
  'secret',
  'secret_key',
  'public_key',
  'webhook_secret',
  'password',
  'token',
  'account_number',
  'accountNumber',
  'accountnumber',
  'account_number_encrypted',
  'email',
  'phone',
  'phonenumber',
  'account_name',
  'verif-hash',
  'verif_hash',
  'flutterwave-signature',
  'card_number',
  'cardno',
  'cvv',
  'pin',
  'otp'
]);

const redact = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  return Object.entries(value).reduce((safeValue, [key, item]) => {
    safeValue[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(item);
    return safeValue;
  }, {});
};

const logFlutterwaveEvent = (level, event, metadata = {}) => {
  const payload = {
    level,
    event,
    provider: 'flutterwave',
    mode: env.flutterwave.mode,
    timestamp: new Date().toISOString(),
    ...redact(metadata)
  };

  (level === 'error' ? console.error : console.log)(JSON.stringify(payload));
};

const flutterwaveClient = axios.create({
  baseURL: env.flutterwave.baseUrl,
  timeout: env.flutterwave.timeoutMs,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

flutterwaveClient.interceptors.request.use((config) => {
  config.metadata = { startedAt: Date.now() };
  logFlutterwaveEvent('info', 'flutterwave.request.started', {
    method: config.method,
    url: config.url,
    parameterKeys: config.params && typeof config.params === 'object'
      ? Object.keys(config.params)
      : [],
    bodyKeys: config.data && typeof config.data === 'object'
      ? Object.keys(config.data)
      : []
  });
  return config;
});

flutterwaveClient.interceptors.response.use(
  (response) => {
    logFlutterwaveEvent('info', 'flutterwave.request.completed', {
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      durationMs: Date.now() - response.config.metadata.startedAt
    });
    return response;
  },
  (error) => {
    const config = error.config || {};
    logFlutterwaveEvent('error', 'flutterwave.request.failed', {
      method: config.method,
      url: config.url,
      status: error.response?.status || null,
      code: error.code || null,
      message: error.message,
      response: error.response?.data || null
    });
    return Promise.reject(error);
  }
);

module.exports = {
  flutterwaveClient,
  logFlutterwaveEvent
};
