const crypto = require('crypto');
const env = require('../config/env');
const { flutterwaveClient } = require('../config/flutterwave');

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

const assertSecretKey = () => {
  if (!env.flutterwave.secretKey) {
    throw new Error('FLUTTERWAVE_SECRET_KEY is not configured.');
  }
};

const assertTestMode = () => {
  if (env.flutterwave.mode !== 'test') {
    throw new Error('Flutterwave Phase 1 only supports FLUTTERWAVE_MODE=test.');
  }
};

const authenticatedHeaders = () => {
  assertSecretKey();
  return { Authorization: `Bearer ${env.flutterwave.secretKey}` };
};

const createVirtualAccount = async ({
  email,
  name,
  phone,
  reference,
  currency = 'NGN'
}) => {
  assertTestMode();
  const payload = {
    email,
    is_permanent: env.flutterwave.virtualAccountPermanent,
    tx_ref: reference,
    amount: env.flutterwave.virtualAccountAmount,
    currency
  };

  if (name) {
    payload.firstname = String(name).split(/\s+/)[0];
    payload.lastname = String(name).split(/\s+/).slice(1).join(' ') || payload.firstname;
  }

  if (phone) {
    payload.phonenumber = phone;
  }

  const response = await flutterwaveClient.post(
    normalizePath(env.flutterwave.virtualAccountPath),
    payload,
    { headers: authenticatedHeaders() }
  );

  return response.data;
};

const getVirtualAccount = async (reference) => {
  assertTestMode();
  const response = await flutterwaveClient.get(
    `${normalizePath(env.flutterwave.virtualAccountPath)}/${encodeURIComponent(reference)}`,
    { headers: authenticatedHeaders() }
  );

  return response.data;
};

const createCheckout = async ({
  transactionReference,
  amount,
  currency,
  redirectUrl,
  customer,
  metadata = {}
}) => {
  assertTestMode();

  const resolvedRedirectUrl = redirectUrl || env.flutterwave.checkoutRedirectUrl;
  if (!resolvedRedirectUrl) {
    throw new Error('FLUTTERWAVE_CHECKOUT_REDIRECT_URL is not configured.');
  }

  const payload = {
    tx_ref: transactionReference,
    amount: Number(amount),
    currency,
    redirect_url: resolvedRedirectUrl,
    customer: {
      email: customer.email,
      name: customer.name
    },
    meta: metadata
  };

  if (env.flutterwave.checkoutPaymentOptions) {
    payload.payment_options = env.flutterwave.checkoutPaymentOptions;
  }

  const response = await flutterwaveClient.post(
    normalizePath(env.flutterwave.checkoutPath),
    payload,
    { headers: authenticatedHeaders() }
  );

  return response.data;
};

const verifyTransaction = async (transactionId) => {
  assertTestMode();
  const response = await flutterwaveClient.get(
    `/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: authenticatedHeaders() }
  );

  return response.data;
};

const resolveAccount = async ({ accountNumber, bankCode }) => {
  assertTestMode();
  const response = await flutterwaveClient.post(
    normalizePath(env.flutterwave.resolveAccountPath),
    {
      account_number: accountNumber,
      account_bank: bankCode
    },
    { headers: authenticatedHeaders() }
  );
  return response.data;
};

const listBanks = async (country = 'NG') => {
  assertTestMode();
  const response = await flutterwaveClient.get(
    `${normalizePath(env.flutterwave.banksPath)}/${encodeURIComponent(country)}`,
    { headers: authenticatedHeaders() }
  );
  return response.data;
};

const createTransfer = async ({
  accountNumber,
  bankCode,
  amount,
  currency = 'NGN',
  reference,
  beneficiaryName,
  narration,
  callbackUrl
}) => {
  assertTestMode();
  const payload = {
    account_bank: bankCode,
    account_number: accountNumber,
    amount: Number(amount),
    currency,
    debit_currency: currency,
    reference,
    beneficiary_name: beneficiaryName,
    narration: narration || 'Pamoja Ajo cycle payout'
  };

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  const response = await flutterwaveClient.post(
    normalizePath(env.flutterwave.transfersPath),
    payload,
    { headers: authenticatedHeaders() }
  );
  return response.data;
};

const getTransfer = async (transferId) => {
  assertTestMode();
  const response = await flutterwaveClient.get(
    `${normalizePath(env.flutterwave.transfersPath)}/${encodeURIComponent(transferId)}`,
    { headers: authenticatedHeaders() }
  );
  return response.data;
};

const safeCompare = (expected, received) => {
  const expectedBuffer = Buffer.from(String(expected));
  const receivedBuffer = Buffer.from(String(received || ''));

  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

// Flutterwave's documented webhook guard is the verif-hash header matching the
// secret configured in the Flutterwave dashboard. The raw body is deliberately
// not used to create a second, unsupported signature scheme.
const verifyWebhookSignature = (signature) => (
  Boolean(env.flutterwave.webhookSecret)
  && Boolean(signature)
  && safeCompare(env.flutterwave.webhookSecret, signature)
);

module.exports = {
  createVirtualAccount,
  getVirtualAccount,
  createCheckout,
  verifyTransaction,
  resolveAccount,
  listBanks,
  createTransfer,
  getTransfer,
  verifyWebhookSignature
};
