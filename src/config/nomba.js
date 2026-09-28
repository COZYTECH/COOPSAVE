const axios = require('axios');
const env = require('./env');

const SENSITIVE_KEYS = new Set([
  'authorization',
  'accountId',
  'account_id',
  'access_token',
  'accessToken',
  'token',
  'client_id',
  'client_secret',
  'clientSecret',
  'signature',
  'secret',
  'password',
  'email',
  'phone',
  'phonenumber',
  'account_number',
  'accountnumber',
  'account_name'
]);

const redact = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  return Object.entries(value).reduce((safeValue, [key, item]) => {
    safeValue[key] = SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())
      ? '[REDACTED]'
      : redact(item);

    return safeValue;
  }, {});
};

const logNombaEvent = (level, event, metadata = {}) => {
  const logPayload = {
    level,
    event,
    provider: 'nomba',
    timestamp: new Date().toISOString(),
    ...redact(metadata)
  };

  const writer = level === 'error' ? console.error : console.log;
  writer(JSON.stringify(logPayload));
};

const nombaClient = axios.create({
  baseURL: env.nomba.baseUrl,
  timeout: env.nomba.timeoutMs,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

nombaClient.interceptors.request.use((config) => {
  config.metadata = {
    startedAt: Date.now()
  };

  logNombaEvent('info', 'nomba.request.started', {
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

nombaClient.interceptors.response.use(
  (response) => {
    const durationMs = Date.now() - response.config.metadata.startedAt;

    logNombaEvent('info', 'nomba.request.completed', {
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      durationMs
    });

    return response;
  },
  (error) => {
    const config = error.config || {};
    const durationMs = config.metadata
      ? Date.now() - config.metadata.startedAt
      : null;

    logNombaEvent('error', 'nomba.request.failed', {
      method: config.method,
      url: config.url,
      status: error.response ? error.response.status : null,
      durationMs,
      code: error.code,
      message: error.message,
      response: error.response ? error.response.data : null
    });

    return Promise.reject(error);
  }
);

module.exports = {
  nombaClient,
  logNombaEvent
};
