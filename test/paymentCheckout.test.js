const assert = require('node:assert/strict');
const test = require('node:test');

const { pool } = require('../src/config/database');
const env = require('../src/config/env');
const paymentIdentityRepository = require('../src/repositories/paymentIdentityRepository');
const paymentTransactionRepository = require('../src/repositories/paymentTransactionRepository');
const transactionStatusHistoryRepository = require('../src/repositories/transactionStatusHistoryRepository');
const obligationRepository = require('../src/repositories/obligationRepository');
const cycleRepository = require('../src/repositories/cycleRepository');
const groupMembershipRepository = require('../src/repositories/groupMembershipRepository');
const flutterwaveService = require('../src/services/flutterwave.service');
const paymentProcessingService = require('../src/services/paymentProcessingService');
const checkoutService = require('../src/services/paymentCheckoutService');

const original = [];
const originalCheckoutRedirectUrl = env.flutterwave.checkoutRedirectUrl;
const remember = (object, method, replacement) => {
  if (!original.some((entry) => entry.object === object && entry.method === method)) {
    original.push({ object, method, original: object[method] });
  }
  object[method] = replacement;
};

const restore = () => {
  for (const entry of original.reverse()) {
    entry.object[entry.method] = entry.original;
  }
  original.length = 0;
  env.flutterwave.checkoutRedirectUrl = originalCheckoutRedirectUrl;
};

const buildConnection = () => ({
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {}
});

const setupCheckout = ({ membershipId = 11, membershipRole = 'GROUP_MEMBER', obligationMembershipId = membershipId, cooperativeId = 5, outstanding = '10000.00', providerResponse } = {}) => {
  env.flutterwave.checkoutRedirectUrl = 'https://local.example/api/webhooks/flutterwave/callback';
  const connection = buildConnection();
  let transactionState = {
    id: 77,
    provider: 'FLUTTERWAVE',
    payment_identity_id: 33,
    membership_id: membershipId,
    cooperative_id: cooperativeId,
    obligation_id: 91,
    gross_amount: outstanding,
    currency: 'NGN',
    status: 'INITIATED',
    allocation_status: 'UNALLOCATED',
    provider_transaction_id: null,
    provider_reference: null,
    source_webhook_event_id: null
  };
  const providerCalls = [];

  remember(pool, 'getConnection', async () => connection);
  remember(groupMembershipRepository, 'findByUserAndCooperative', async () => ({
    id: membershipId,
    cooperative_id: cooperativeId,
    user_id: 42,
    role: membershipRole
  }));
  remember(groupMembershipRepository, 'findByIdWithUser', async () => ({
    id: membershipId,
    cooperative_id: cooperativeId,
    user_id: 42,
    name: 'Test Member',
    email: 'member@example.com'
  }));
  remember(obligationRepository, 'findById', async () => ({
    id: 91,
    cycle_id: 12,
    membership_id: obligationMembershipId,
    expected_amount: '10000.00',
    amount_outstanding: outstanding,
    currency: 'NGN',
    status: outstanding === '0.00' ? 'PAID' : 'PENDING'
  }));
  remember(cycleRepository, 'findById', async () => ({ id: 12, cooperative_id: cooperativeId, status: 'ACTIVE' }));
  remember(paymentIdentityRepository, 'findByMembershipId', async () => ({
    id: 33,
    cooperative_membership_id: membershipId,
    provider: 'FLUTTERWAVE',
    currency: 'NGN',
    status: 'ACTIVE'
  }));
  remember(paymentTransactionRepository, 'create', async ({ internalReference }) => {
    transactionState.internal_reference = internalReference;
    return { ...transactionState };
  });
  remember(paymentTransactionRepository, 'findById', async () => ({ ...transactionState }));
  remember(paymentTransactionRepository, 'updateStatus', async (id, status) => {
    transactionState.status = status;
    return { ...transactionState, id };
  });
  remember(transactionStatusHistoryRepository, 'create', async () => ({}));
  remember(flutterwaveService, 'createCheckout', async (payload) => {
    providerCalls.push(payload);
    return providerResponse || { status: 'success', data: { link: 'https://checkout.flutterwave.com/test' } };
  });

  return { providerCalls, transactionState };
};

test.afterEach(restore);

test('creates a server-controlled checkout for the member obligation', async () => {
  const { providerCalls } = setupCheckout();

  const result = await checkoutService.createCheckout({
    groupId: 5,
    obligationId: 91,
    userId: 42,
    amount: '1.00'
  });

  assert.equal(result.checkoutUrl, 'https://checkout.flutterwave.com/test');
  assert.equal(result.amount, 10000);
  assert.match(result.transactionReference, /^PAMOJA-OBL-91-/);
  assert.equal(providerCalls[0].amount, 10000);
  assert.equal(providerCalls[0].currency, 'NGN');
  assert.equal(providerCalls[0].metadata.obligation_id, '91');
});

test('allows a GROUP_ADMIN to initialize checkout for their own cycle obligation', async () => {
  const { providerCalls } = setupCheckout({ membershipRole: 'GROUP_ADMIN' });

  const result = await checkoutService.createCheckout({
    groupId: 5,
    obligationId: 91,
    userId: 42
  });

  assert.equal(result.currency, 'NGN');
  assert.equal(providerCalls[0].metadata.membership_id, '11');
});

test('rejects checkout for another member obligation', async () => {
  setupCheckout({ obligationMembershipId: 999 });

  await assert.rejects(
    checkoutService.createCheckout({ groupId: 5, obligationId: 91, userId: 42 }),
    { statusCode: 403 }
  );
});

test('rejects an obligation with no outstanding balance', async () => {
  setupCheckout({ outstanding: '0.00' });

  await assert.rejects(
    checkoutService.createCheckout({ groupId: 5, obligationId: 91, userId: 42 }),
    { statusCode: 409 }
  );
});

test('rejects an obligation from another Ajo', async () => {
  setupCheckout({ cooperativeId: 99 });

  await assert.rejects(
    checkoutService.createCheckout({ groupId: 5, obligationId: 91, userId: 42 }),
    { statusCode: 404 }
  );
});

test('rejects malformed hosted checkout responses and marks the attempt failed', async () => {
  const { transactionState } = setupCheckout({ providerResponse: { status: 'success', data: {} } });

  await assert.rejects(
    checkoutService.createCheckout({ groupId: 5, obligationId: 91, userId: 42 }),
    { statusCode: 502 }
  );
  assert.equal(transactionState.status, 'FAILED');
});

test('checkout references are unique per attempt', () => {
  const first = checkoutService.buildTransactionReference(91);
  const second = checkoutService.buildTransactionReference(91);

  assert.notEqual(first, second);
  assert.match(first, /^PAMOJA-OBL-91-/);
  assert.match(second, /^PAMOJA-OBL-91-/);
});

test('hosted links are extracted only from provider response data', () => {
  assert.equal(
    checkoutService.getHostedLink({ status: 'success', data: { link: 'https://checkout.example' } }),
    'https://checkout.example'
  );
  assert.equal(checkoutService.getHostedLink({ status: 'success', data: {} }), null);
});

test('callback verifies the provider result before delegating allocation', async () => {
  const txRef = 'PAMOJA-OBL-91-callback-test';
  let received;
  remember(paymentTransactionRepository, 'findByInternalReference', async () => ({
    id: 77,
    provider: 'FLUTTERWAVE',
    payment_identity_id: 33,
    gross_amount: '10000.00',
    currency: 'NGN',
    status: 'PENDING'
  }));
  remember(flutterwaveService, 'verifyTransaction', async () => ({
    status: 'success',
    data: {
      id: 'provider-123',
      status: 'successful',
      tx_ref: txRef,
      flw_ref: 'FLW-123',
      amount: 10000,
      currency: 'NGN'
    }
  }));
  remember(paymentIdentityRepository, 'findById', async () => ({ id: 33, currency: 'NGN' }));
  remember(paymentProcessingService, 'processVerifiedPayment', async (payload) => {
    received = payload;
    return { reconciliationRequired: false, transaction: { id: 77 } };
  });

  const result = await checkoutService.handleCallback({
    status: 'successful',
    transactionReference: txRef,
    transactionId: 'provider-123'
  });

  assert.equal(result.status, 'SUCCESS');
  assert.equal(received.event.transactionReference, txRef);
  assert.equal(received.event.transactionId, 'provider-123');
  assert.equal(received.event.providerReference, 'FLW-123');
});

test('callback does not trust a successful redirect when provider verification fails', async () => {
  const txRef = 'PAMOJA-OBL-91-failed-test';
  const transactionState = {
    id: 77,
    provider: 'FLUTTERWAVE',
    gross_amount: '10000.00',
    currency: 'NGN',
    status: 'PENDING',
    payment_identity_id: 33
  };
  remember(paymentTransactionRepository, 'findByInternalReference', async () => ({ ...transactionState }));
  remember(paymentTransactionRepository, 'findById', async () => ({ ...transactionState }));
  remember(paymentTransactionRepository, 'updateStatus', async (id, status) => {
    transactionState.status = status;
    return { ...transactionState, id };
  });
  remember(transactionStatusHistoryRepository, 'create', async () => ({}));
  remember(pool, 'getConnection', async () => buildConnection());
  remember(flutterwaveService, 'verifyTransaction', async () => ({
    status: 'success',
    data: { id: 'provider-456', status: 'failed', tx_ref: txRef, amount: 10000, currency: 'NGN' }
  }));

  const result = await checkoutService.handleCallback({
    status: 'successful',
    transactionReference: txRef,
    transactionId: 'provider-456'
  });

  assert.equal(result.status, 'FAILED');
  assert.equal(transactionState.status, 'FAILED');
});
