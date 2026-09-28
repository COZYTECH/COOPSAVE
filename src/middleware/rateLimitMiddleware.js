const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const env = require('../config/env');
const apiResponse = require('../utils/apiResponse');

let storeMode = 'memory';
let redisStatus = env.rateLimit.redisUrl ? 'configured-but-unavailable' : 'not-configured';
const hashIdentifier = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ipKey = (req) => `global:ip:${req.ip}`;
const limiterKey = (req, namespace = 'auth:user') => (req.user?.id ? `${namespace}:${req.user.id}` : ipKey(req));
const accountKey = (req) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  return email ? `login:account:${hashIdentifier(email)}` : `login:ip:${req.ip}`;
};

const onLimitExceeded = (category, keyType = 'ip') => (req, res) => {
  console.warn(JSON.stringify({ level: 'warn', event: 'rate_limit.exceeded', category, status: 429,
    method: req.method, path: req.originalUrl, userId: req.user?.id || null,
    keyType, requestId: req.requestId || null, timestamp: new Date().toISOString() }));
  return apiResponse.error(res, 429, 'Too many requests. Please try again later.', null, {
    code: 'RATE_LIMIT_EXCEEDED', requestId: req.requestId
  });
};

const tryCreateRedisStore = () => {
  if (!env.rateLimit.redisUrl) return undefined;
  try {
    // Redis is optional locally. Install redis + rate-limit-redis in a shared deployment.
    const { createClient } = require('redis');
    const { RedisStore } = require('rate-limit-redis');
    const client = createClient({ url: env.rateLimit.redisUrl });
    client.on('error', (error) => {
      redisStatus = 'error';
      console.error(JSON.stringify({ level: 'error', event: 'rate_limit.redis_error', message: error.message }));
    });
    client.connect().then(() => {
      storeMode = 'redis';
      redisStatus = 'connected';
      console.log(JSON.stringify({ level: 'info', event: 'rate_limit.redis_connected' }));
    }).catch((error) => {
      redisStatus = 'error';
      console.error(JSON.stringify({ level: 'error', event: 'rate_limit.redis_unavailable', message: error.message }));
    });
    return new RedisStore({ sendCommand: (...args) => client.sendCommand(args) });
  } catch (error) {
    redisStatus = 'client-not-installed';
    console.warn(JSON.stringify({ level: 'warn', event: 'rate_limit.redis_fallback', message: 'Redis packages are not installed; using bounded process-local fallback.' }));
    return undefined;
  }
};

const sharedStore = tryCreateRedisStore();
const createLimiter = ({ category, windowMs, max, authenticated = false, keyGenerator, namespace, keyType = 'ip' }) => rateLimit({
  windowMs, max, enabled: env.rateLimit.enabled,
  keyGenerator: keyGenerator || (authenticated ? (req) => limiterKey(req, namespace) : undefined),
  standardHeaders: 'draft-7', legacyHeaders: false, store: sharedStore,
  passOnStoreError: false, handler: onLimitExceeded(category, keyType)
});

const globalLimiter = rateLimit({
  windowMs: env.rateLimit.globalWindowMs,
  max: env.rateLimit.globalMax,
  enabled: env.rateLimit.enabled,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: sharedStore,
  passOnStoreError: false,
  keyGenerator: ipKey,
  skip: (req) => /\/api\/(?:v1\/)?webhooks\/flutterwave(?:\/|$)/.test(req.originalUrl || ''),
  handler: onLimitExceeded('global', 'ip')
});
const loginLimiter = createLimiter({ category: 'login', windowMs: env.rateLimit.loginWindowMs, max: env.rateLimit.loginMax });
const loginAccountLimiter = createLimiter({ category: 'login_account', windowMs: env.rateLimit.loginWindowMs, max: env.rateLimit.loginMax, keyGenerator: accountKey, keyType: 'account' });
const registerLimiter = createLimiter({ category: 'register', windowMs: env.rateLimit.registerWindowMs, max: env.rateLimit.registerMax });
const passwordResetLimiter = createLimiter({ category: 'password_reset', windowMs: env.rateLimit.passwordResetWindowMs, max: env.rateLimit.passwordResetMax });
const authenticatedApiLimiter = createLimiter({ category: 'authenticated_api', windowMs: env.rateLimit.authWindowMs, max: env.rateLimit.authMax, authenticated: true, namespace: 'auth:user', keyType: 'user' });
const paymentLimiter = createLimiter({ category: 'payment_initialization', windowMs: env.rateLimit.paymentWindowMs, max: env.rateLimit.paymentMax, authenticated: true, namespace: 'payment:user', keyType: 'user' });
const payoutLimiter = createLimiter({ category: 'payout', windowMs: env.rateLimit.payoutWindowMs, max: env.rateLimit.payoutMax, authenticated: true, namespace: 'payout:user', keyType: 'user' });
const bankVerifyLimiter = createLimiter({ category: 'bank_verification', windowMs: env.rateLimit.bankVerifyWindowMs, max: env.rateLimit.bankVerifyMax, authenticated: true, namespace: 'bankverify:user', keyType: 'user' });

const getRateLimitStatus = () => ({ enabled: env.rateLimit.enabled, store: storeMode, redis: redisStatus });
module.exports = { createLimiter, globalLimiter, loginLimiter, loginAccountLimiter, registerLimiter, passwordResetLimiter, authenticatedApiLimiter, paymentLimiter, payoutLimiter, bankVerifyLimiter, getRateLimitStatus };
