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

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  database: {
    host: process.env.DB_HOST || databaseUrlConfig.host || "127.0.0.1",
    port: Number(process.env.DB_PORT || databaseUrlConfig.port || 3306),
    user: process.env.DB_USER || databaseUrlConfig.user || "root",
    password: process.env.DB_PASSWORD || databaseUrlConfig.password || "",
    name: process.env.DB_NAME || databaseUrlConfig.name || "coopsave",
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || "change-this-development-secret",
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
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 100),
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
};

module.exports = env;
