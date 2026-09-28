const dotenv = require("dotenv");

dotenv.config();

const parseCsv = (value) => {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseDatabaseUrl = (value) => {
  if (!value) {
    return {};
  }

  const parsedUrl = new URL(value);

  return {
    host: parsedUrl.hostname || undefined,
    port: parsedUrl.port ? Number(parsedUrl.port) : undefined,
    user: decodeURIComponent(parsedUrl.username || ""),
    password: decodeURIComponent(parsedUrl.password || ""),
    name: parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, "") : undefined,
  };
};

const databaseUrlConfig = parseDatabaseUrl(
  process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL,
);

const isProduction = process.env.NODE_ENV === "production";
const developmentJwtSecret = "change-this-development-secret";
const parseTrustProxy = (value) => {
  if (value === undefined || value === '') return 1;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 1;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  database: {
    host: process.env.DB_HOST || databaseUrlConfig.host || "127.0.0.1",
    port: Number(process.env.DB_PORT || databaseUrlConfig.port || 3306),
    user: process.env.DB_USER || databaseUrlConfig.user || "root",
    password: process.env.DB_PASSWORD || databaseUrlConfig.password || "",
    name: process.env.DB_NAME || databaseUrlConfig.name || "coopsave",
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },
  jwt: {
    // Never silently use the development signing key in a production process.
    secret: process.env.JWT_SECRET || (isProduction ? "" : developmentJwtSecret),
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
  cors: {
    origin:
      process.env.CORS_ORIGIN ||
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    origins: parseCsv(
      process.env.CORS_ORIGIN ||
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    ),
  },
  rateLimit: {
    enabled: String(process.env.RATE_LIMIT_ENABLED || 'true') !== 'false',
    globalWindowMs: Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
    globalMax: Number(process.env.RATE_LIMIT_GLOBAL_MAX || process.env.RATE_LIMIT_MAX || 300),
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 60 * 1000),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 120),
    loginWindowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 15 * 60 * 1000),
    loginMax: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
    registerWindowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS || 15 * 60 * 1000),
    registerMax: Number(process.env.RATE_LIMIT_REGISTER_MAX || 5),
    passwordResetWindowMs: Number(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS || 15 * 60 * 1000),
    passwordResetMax: Number(process.env.RATE_LIMIT_PASSWORD_RESET_MAX || 5),
    paymentWindowMs: Number(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS || 10 * 60 * 1000),
    paymentMax: Number(process.env.RATE_LIMIT_PAYMENT_MAX || 10),
    payoutWindowMs: Number(process.env.RATE_LIMIT_PAYOUT_WINDOW_MS || 15 * 60 * 1000),
    payoutMax: Number(process.env.RATE_LIMIT_PAYOUT_MAX || 5),
    bankVerifyWindowMs: Number(process.env.RATE_LIMIT_BANK_VERIFY_WINDOW_MS || 15 * 60 * 1000),
    bankVerifyMax: Number(process.env.RATE_LIMIT_BANK_VERIFY_MAX || 10),
    redisUrl: process.env.REDIS_URL || '',
  },
  nomba: {
    baseUrl: process.env.NOMBA_BASE_URL || "https://api.nomba.com/v1",
    accountId: process.env.NOMBA_ACCOUNT_ID || "",
    mode: process.env.NOMBA_ACCOUNT_MODE || "sandbox",
    clientId: process.env.NOMBA_CLIENT_ID || "",
    clientSecret: process.env.NOMBA_CLIENT_SECRET || "",
    webhookSecret: process.env.NOMBA_WEBHOOK_SECRET || "",
    timeoutMs: Number(process.env.NOMBA_TIMEOUT_MS || 30000),
    authPath: process.env.NOMBA_AUTH_PATH || "/v1/auth/token/issue",
    virtualAccountsPath:
      process.env.NOMBA_VIRTUAL_ACCOUNTS_PATH || "/v1/accounts/virtual",
    virtualAccountsListPath:
      process.env.NOMBA_VIRTUAL_ACCOUNTS_LIST_PATH ||
      "/v1/accounts/virtual/list",

    transactionsPath: process.env.NOMBA_TRANSACTIONS_PATH || "/v1/transactions",
    webhookSignatureHeader:
      process.env.NOMBA_WEBHOOK_SIGNATURE_HEADER || "nomba-signature",
    webhookSignatureAlgorithm:
      process.env.NOMBA_WEBHOOK_SIGNATURE_ALGORITHM || "sha256",
  },
  flutterwave: {
    baseUrl: process.env.FLUTTERWAVE_BASE_URL || "https://api.flutterwave.com/v3",
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY || "",
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || "",
    webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || "",
    mode: process.env.FLUTTERWAVE_MODE || "test",
    timeoutMs: Number(process.env.FLUTTERWAVE_TIMEOUT_MS || 30000),
    virtualAccountPath:
      process.env.FLUTTERWAVE_VIRTUAL_ACCOUNT_PATH || "/virtual-account-numbers",
    virtualAccountPermanent:
      String(process.env.FLUTTERWAVE_VIRTUAL_ACCOUNT_PERMANENT || "false") === "true",
    virtualAccountAmount: Number(process.env.FLUTTERWAVE_VIRTUAL_ACCOUNT_AMOUNT || 0),
    transfersPath: process.env.FLUTTERWAVE_TRANSFERS_PATH || '/transfers',
    banksPath: process.env.FLUTTERWAVE_BANKS_PATH || '/banks',
    resolveAccountPath: process.env.FLUTTERWAVE_RESOLVE_ACCOUNT_PATH || '/accounts/resolve',
    transferCallbackUrl: process.env.FLUTTERWAVE_TRANSFER_CALLBACK_URL || '',
    checkoutPath: process.env.FLUTTERWAVE_CHECKOUT_PATH || '/payments',
    checkoutRedirectUrl: process.env.FLUTTERWAVE_CHECKOUT_REDIRECT_URL || '',
    checkoutResultUrl: process.env.FLUTTERWAVE_CHECKOUT_RESULT_URL || '',
    checkoutPaymentOptions: process.env.FLUTTERWAVE_CHECKOUT_PAYMENT_OPTIONS || '',
  },
  payout: {
    bankEncryptionKey: process.env.PAYOUT_BANK_ENCRYPTION_KEY || '',
    eligibleCycleStatuses: String(process.env.PAYOUT_ELIGIBLE_CYCLE_STATUSES || 'ACTIVE,COMPLETED')
      .split(',')
      .map((status) => status.trim().toUpperCase())
      .filter(Boolean),
    country: process.env.PAYOUT_COUNTRY || 'NG',
    currency: process.env.PAYOUT_CURRENCY || 'NGN',
  },
};

module.exports = env;
