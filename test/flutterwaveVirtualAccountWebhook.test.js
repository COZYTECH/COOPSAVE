const assert = require('node:assert/strict');
const test = require('node:test');

const paymentIdentityRepository = require('../src/repositories/paymentIdentityRepository');
const paymentTransactionRepository = require('../src/repositories/paymentTransactionRepository');
const paymentIdentityService = require('../src/services/paymentIdentityService');
const flutterwaveService = require('../src/services/flutterwave.service');
const flutterwaveWebhookService = require('../src/services/flutterwaveWebhookService');
const paymentProcessingService = require('../src/services/paymentProcessingService');
const webhookEventRepository = require('../src/repositories/webhookEventRepository');

const virtualAccountPayload = {
  event: 'charge.completed',
  data: {
    id: 2028146660,
    tx_ref: 'PAMOJA-MEMBERSHIP-4',
    flw_ref: 'FLW-VA-REFERENCE-4',
    amount: 10000,
    currency: 'NGN',
    narration: 'Pamoja Ajo contribution',
    status: 'successful',
    payment_type: 'bank_transfer',
    customer: {
      name: 'Pamoja Test Member',
      email: 'member@example.com'
    }
  },
  meta_data: {
    originatoraccountnumber: '813*******00',
    originatorname: 'Test Sender',
    bankname: 'Test Bank',
    originatoramount: '10000'
  },
  'event.type': 'BANK_TRANSFER_TRANSACTION'
};

const identity = {
  id: 4,
  cooperative_membership_id: 4,
  cooperative_id: 1,
  currency: 'NGN'
};

const withRepositoryLookup = async (lookup, callback) => {
  const original = paymentIdentityRepository.findForWebhook;
  paymentIdentityRepository.findForWebhook = lookup;
  try {
    return await callback();
  } finally {
    paymentIdentityRepository.findForWebhook = original;
  }
};

test('extracts the documented Virtual Account webhook identifiers', () => {
  const event = flutterwaveWebhookService.extractEvent(virtualAccountPayload);

  assert.equal(event.eventType, 'charge.completed');
  assert.equal(event.providerReference, 'FLW-VA-REFERENCE-4');
  assert.equal(event.transactionReference, 'PAMOJA-MEMBERSHIP-4');
  assert.equal(event.transactionId, '2028146660');
  assert.equal(event.amount, 10000);
  assert.equal(event.currency, 'NGN');
  assert.equal(event.senderName, 'Test Sender');
  assert.equal(event.senderAccountNumber, '813*******00');
  assert.equal(event.senderBankName, 'Test Bank');
  assert.equal(event.senderAmount, '10000');
});

test('resolves an identity by data.flw_ref before other identifiers', async () => {
  let received;
  const result = await withRepositoryLookup(async (references) => {
    received = references;
    return references.providerReference === 'FLW-VA-REFERENCE-4' ? identity : null;
  }, () => paymentIdentityService.resolveWebhookIdentity(
    flutterwaveWebhookService.extractEvent(virtualAccountPayload)
  ));

  assert.equal(result.id, 4);
  assert.equal(received.providerReference, 'FLW-VA-REFERENCE-4');
  assert.equal(received.transactionReference, 'PAMOJA-MEMBERSHIP-4');
  assert.equal(received.accountNumber, null);
});

test('resolves an identity by the persisted provisioning tx_ref', async () => {
  const result = await withRepositoryLookup(async (references) => (
    references.transactionReference === 'PAMOJA-MEMBERSHIP-4' ? identity : null
  ), () => paymentIdentityService.resolveWebhookIdentity({
    transactionReference: 'PAMOJA-MEMBERSHIP-4'
  }));

  assert.equal(result.cooperative_membership_id, 4);
});

test('keeps data.id as the provider transaction ID instead of flw_ref', () => {
  const event = flutterwaveWebhookService.extractEvent(virtualAccountPayload);

  assert.equal(event.transactionId, '2028146660');
  assert.equal(event.providerReference, 'FLW-VA-REFERENCE-4');
  assert.notEqual(event.providerReference, event.transactionId);
});

test('keeps originator metadata separate from the recipient account identity', () => {
  const event = flutterwaveWebhookService.extractEvent(virtualAccountPayload);

  assert.equal(event.senderAccountNumber, '813*******00');
  assert.equal(event.accountNumber, null);
});

test('unknown identifiers remain reconciliation-required without processing', async () => {
  const originalResolve = paymentIdentityService.resolveWebhookIdentity;
  const originalUpdate = webhookEventRepository.updateProcessingStatus;
  const updates = [];

  paymentIdentityService.resolveWebhookIdentity = async () => null;
  webhookEventRepository.updateProcessingStatus = async (id, status) => {
    updates.push({ id, status });
  };

  try {
    await flutterwaveWebhookService.verifyAndProcessPersistedEvent(
      { id: 9001 },
      flutterwaveWebhookService.extractEvent(virtualAccountPayload)
    );
  } finally {
    paymentIdentityService.resolveWebhookIdentity = originalResolve;
    webhookEventRepository.updateProcessingStatus = originalUpdate;
  }

  assert.deepEqual(updates, [{ id: 9001, status: 'RECONCILIATION_REQUIRED' }]);
});

test('duplicate webhook delivery returns the existing event without inserting', async () => {
  const originalVerify = flutterwaveService.verifyWebhookSignature;
  const originalFindDuplicate = webhookEventRepository.findDuplicate;
  const originalCreate = webhookEventRepository.create;
  let createCalled = false;

  flutterwaveService.verifyWebhookSignature = () => true;
  webhookEventRepository.findDuplicate = async () => ({
    id: 7001,
    raw_payload: '{"sensitive":"must not be returned"}',
    transaction_reference: 'PAMOJA-MEMBERSHIP-101'
  });
  webhookEventRepository.create = async () => {
    createCalled = true;
    throw new Error('Duplicate delivery attempted an insert.');
  };

  try {
    const result = await flutterwaveWebhookService.ingest({
      rawPayload: JSON.stringify(virtualAccountPayload),
      signature: 'test-signature'
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.event.id, 7001);
    assert.equal(result.event.raw_payload, undefined);
    assert.equal(createCalled, false);
  } finally {
    flutterwaveService.verifyWebhookSignature = originalVerify;
    webhookEventRepository.findDuplicate = originalFindDuplicate;
    webhookEventRepository.create = originalCreate;
  }
});

test('identities from different Ajos remain isolated by their membership-scoped reference', async () => {
  const identityA = { id: 10, cooperative_membership_id: 101 };
  const identityB = { id: 20, cooperative_membership_id: 202 };
  const resultA = await withRepositoryLookup(async ({ transactionReference }) => (
    transactionReference === 'PAMOJA-MEMBERSHIP-101' ? identityA : null
  ), () => paymentIdentityService.resolveWebhookIdentity({
    transactionReference: 'PAMOJA-MEMBERSHIP-101'
  }));
  const resultB = await withRepositoryLookup(async ({ transactionReference }) => (
    transactionReference === 'PAMOJA-MEMBERSHIP-202' ? identityB : null
  ), () => paymentIdentityService.resolveWebhookIdentity({
    transactionReference: 'PAMOJA-MEMBERSHIP-202'
  }));

  assert.equal(resultA.cooperative_membership_id, 101);
  assert.equal(resultB.cooperative_membership_id, 202);
  assert.notEqual(resultA.cooperative_membership_id, resultB.cooperative_membership_id);
});

test('checkout tx_ref resolves the persisted payment attempt instead of a virtual account', async () => {
  const updates = [];
  const originalFindByInternalReference = paymentTransactionRepository.findByInternalReference;
  const originalFindById = paymentIdentityRepository.findById;
  const originalVerify = flutterwaveService.verifyTransaction;
  const originalProcess = paymentProcessingService.processVerifiedPayment;
  const originalUpdateStatus = webhookEventRepository.updateProcessingStatus;
  let received;

  paymentTransactionRepository.findByInternalReference = async () => ({
    id: 91,
    payment_identity_id: 44
  });
  paymentIdentityRepository.findById = async () => ({
    id: 44,
    cooperative_membership_id: 404,
    currency: 'NGN'
  });
  flutterwaveService.verifyTransaction = async () => ({
    data: {
      id: 'provider-91',
      status: 'successful',
      tx_ref: 'PAMOJA-OBL-91-checkout',
      flw_ref: 'FLW-91',
      amount: 10000,
      currency: 'NGN'
    }
  });
  paymentProcessingService.processVerifiedPayment = async (payload) => {
    received = payload;
    return { reconciliationRequired: false, transaction: { id: 91 } };
  };
  webhookEventRepository.updateProcessingStatus = async (id, status) => {
    updates.push({ id, status });
  };

  try {
    await flutterwaveWebhookService.verifyAndProcessPersistedEvent(
      { id: 7002 },
      {
        eventType: 'charge.completed',
        transactionReference: 'PAMOJA-OBL-91-checkout',
        providerReference: 'FLW-91',
        transactionId: 'provider-91',
        amount: 10000,
        currency: 'NGN'
      }
    );
  } finally {
    paymentTransactionRepository.findByInternalReference = originalFindByInternalReference;
    paymentIdentityRepository.findById = originalFindById;
    flutterwaveService.verifyTransaction = originalVerify;
    paymentProcessingService.processVerifiedPayment = originalProcess;
    webhookEventRepository.updateProcessingStatus = originalUpdateStatus;
  }

  assert.equal(received.identity.id, 44);
  assert.equal(received.event.transactionReference, 'PAMOJA-OBL-91-checkout');
  assert.deepEqual(updates, [{ id: 7002, status: 'PROCESSED' }]);
});
