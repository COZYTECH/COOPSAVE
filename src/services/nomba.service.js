const crypto = require("crypto");
const env = require("../config/env");
const { nombaClient } = require("../config/nomba");

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

const normalizePath = (path) => {
  return path.startsWith("/") ? path : `/${path}`;
};

const appendPathSegment = (path, segment) => {
  return `${normalizePath(path).replace(/\/$/, "")}/${encodeURIComponent(segment)}`;
};

const getMissingCredentials = () => {
  const requiredCredentials = {
    NOMBA_ACCOUNT_ID: env.nomba.accountId,
    NOMBA_CLIENT_ID: env.nomba.clientId,
    NOMBA_CLIENT_SECRET: env.nomba.clientSecret,
  };

  return Object.entries(requiredCredentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);
};

const assertCredentials = () => {
  const missingCredentials = getMissingCredentials();

  if (missingCredentials.length > 0) {
    throw new Error(
      `Missing Nomba environment variables: ${missingCredentials.join(", ")}`,
    );
  }
};

const buildAuthPayload = () => ({
  /// accountId: env.nomba.accountId,
  client_id: env.nomba.clientId,
  client_secret: env.nomba.clientSecret,
  grant_type: "client_credentials",
});

const extractAccessToken = (responseBody) => {
  return (
    responseBody.access_token ||
    responseBody.token ||
    responseBody.data?.access_token ||
    responseBody.data?.token ||
    null
  );
};

const extractExpiresIn = (responseBody) => {
  return (
    responseBody.expires_in ||
    responseBody.data?.expires_in ||
    responseBody.expiresIn ||
    responseBody.data?.expiresIn ||
    null
  );
};

const authenticate = async ({ forceRefresh = false } = {}) => {
  assertCredentials();

  if (
    !forceRefresh &&
    tokenCache.accessToken &&
    tokenCache.expiresAt > Date.now()
  ) {
    return {
      accessToken: tokenCache.accessToken,
      cached: true,
    };
  }

  // const response = await nombaClient.post(
  //   normalizePath(env.nomba.authPath),
  //   buildAuthPayload(),
  // );
  const response = await nombaClient.post(
    normalizePath(env.nomba.authPath),
    buildAuthPayload(),
    {
      headers: {
        accountId: env.nomba.accountId,
      },
    },
  );

  const accessToken = extractAccessToken(response.data);
  const expiresIn = extractExpiresIn(response.data);

  if (accessToken) {
    tokenCache = {
      accessToken,
      expiresAt: expiresIn
        ? Date.now() + Number(expiresIn) * 1000 - 30000
        : Date.now() + 50 * 60 * 1000,
    };
  }

  return response.data;
};

const getAccessToken = async () => {
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const authResponse = await authenticate({ forceRefresh: true });
  const accessToken = extractAccessToken(authResponse);

  if (!accessToken) {
    throw new Error(
      "Nomba authentication response did not include an access token.",
    );
  }

  return accessToken;
};

const buildAuthenticatedHeaders = async () => {
  assertCredentials();

  return {
    Authorization: `Bearer ${await getAccessToken()}`,
    accountId: env.nomba.accountId,
  };
};

const createVirtualAccount = async (payload) => {
  const response = await nombaClient.post(
    normalizePath(env.nomba.virtualAccountsPath),
    payload,
    {
      headers: await buildAuthenticatedHeaders(),
    },
  );

  return response.data;
};

const getVirtualAccount = async (virtualAccountId, params = {}) => {
  const response = await nombaClient.get(
    appendPathSegment(env.nomba.virtualAccountsPath, virtualAccountId),
    {
      params,
      headers: await buildAuthenticatedHeaders(),
    },
  );

  return response.data;
};

const listVirtualAccounts = async (payload = {}) => {
  console.log("BASE URL:", env.nomba.baseUrl);
  console.log("LIST PATH:", env.nomba.virtualAccountsListPath);
  console.log(
    "FULL URL:",
    `${env.nomba.baseUrl}${env.nomba.virtualAccountsListPath}`,
  );
  const response = await nombaClient.post(
    normalizePath(
      env.NOMBA_VIRTUAL_ACCOUNTS_LIST_PATH || "v1/accounts/virtual/list",
    ),
    payload,
    {
      headers: await buildAuthenticatedHeaders(),
    },
  );
  console.log("========== Nomba List Response ==========");

  console.dir(response.data, {
    depth: null,
  });

  return response.data;
};

// const extractVirtualAccounts = (responseBody) => {
//   const accounts =
//     responseBody.accounts ||
//     responseBody.virtualAccounts ||
//     responseBody.virtual_accounts ||
//     responseBody.data?.accounts ||
//     responseBody.data?.virtualAccounts ||
//     responseBody.data?.virtual_accounts ||
//     responseBody.data?.items ||
//     responseBody.data?.content ||
//     responseBody.data ||
//     [];

//   return Array.isArray(accounts) ? accounts : [];
// };
const extractVirtualAccounts = (responseBody) => {
  const accounts =
    responseBody.accounts ||
    responseBody.virtualAccounts ||
    responseBody.virtual_accounts ||
    responseBody.data?.accounts ||
    responseBody.data?.virtualAccounts ||
    responseBody.data?.virtual_accounts ||
    responseBody.data?.items ||
    responseBody.data?.results || // <-- ADD THIS
    responseBody.data?.content ||
    responseBody.data ||
    [];

  return Array.isArray(accounts) ? accounts : [];
};

const toSandboxAccount = (account) => ({
  accountRef:
    account.accountRef ||
    account.account_ref ||
    account.accountReference ||
    account.account_reference ||
    account.reference ||
    null,
  accountNumber:
    account.accountNumber ||
    account.account_number ||
    account.number ||
    account.bankAccountNumber ||
    null,
  accountName:
    account.accountName ||
    account.account_name ||
    account.name ||
    account.bankAccountName ||
    null,
});

const isCompleteSandboxAccount = (account) => {
  return Boolean(
    account.accountRef && account.accountNumber && account.accountName,
  );
};

const assignSandboxAccount = async (memberData = {}, connection = null) => {
  const SandboxVirtualAccountProvider = require("./providers/sandboxVirtualAccountProvider");
  return SandboxVirtualAccountProvider.allocateAccount(memberData, connection);
};

const getTransactions = async (params = {}) => {
  const response = await nombaClient.get(
    normalizePath(env.nomba.transactionsPath),
    {
      params,
      headers: await buildAuthenticatedHeaders(),
    },
  );

  return response.data;
};

const toWebhookPayloadString = (payload) => {
  if (Buffer.isBuffer(payload)) {
    return payload.toString("utf8");
  }

  if (typeof payload === "string") {
    return payload;
  }

  return JSON.stringify(payload);
};

const normalizeSignature = (signature) => {
  if (!signature) {
    return "";
  }

  return String(signature)
    .replace(/^[a-z0-9-]+=/i, "")
    .trim();
};

const safeCompare = (expected, received) => {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

console.log("===== RAW PAYLOAD =====");

if (Buffer.isBuffer(rawPayload)) {
  console.log(rawPayload.toString("utf8"));
} else {
  console.log(JSON.stringify(rawPayload, null, 2));
}

console.log("===== RECEIVED SIGNATURE =====");
console.log(signature);

const verifyWebhookSignature = (payload, signature) => {
  if (!env.nomba.webhookSecret || !signature) {
    return false;
  }

  const payloadString = toWebhookPayloadString(payload);
  const expectedSignature = crypto
    .createHmac(env.nomba.webhookSignatureAlgorithm, env.nomba.webhookSecret)
    .update(payloadString)
    .digest("hex");

  const receivedSignature = normalizeSignature(signature);
  console.log("========== WEBHOOK DEBUG ==========");
  console.log("Secret:", env.nomba.webhookSecret);

  console.log("Received Signature:");
  console.log(signature);

  console.log("Expected HEX:");
  console.log(expectedSignature);

  console.log("Expected BASE64:");
  console.log(expectedBase64Signature);

  console.log("===================================");
  const expectedBase64Signature = crypto
    .createHmac(env.nomba.webhookSignatureAlgorithm, env.nomba.webhookSecret)
    .update(payloadString)
    .digest("base64");

  return (
    safeCompare(expectedSignature, receivedSignature) ||
    safeCompare(expectedBase64Signature, receivedSignature)
  );
};

module.exports = {
  authenticate,
  createVirtualAccount,
  getVirtualAccount,
  listVirtualAccounts,
  extractVirtualAccounts,
  toSandboxAccount,
  isCompleteSandboxAccount,
  getTransactions,
  verifyWebhookSignature,
  assignSandboxAccount,
};
