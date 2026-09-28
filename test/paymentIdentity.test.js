const assert = require('node:assert/strict');
const test = require('node:test');

const previousWebhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
process.env.FLUTTERWAVE_WEBHOOK_SECRET = 'phase-one-test-secret';

const paymentIdentityRepository = require('../src/repositories/paymentIdentityRepository');
const paymentIdentityService = require('../src/services/paymentIdentityService');
const flutterwaveService = require('../src/services/flutterwave.service');
const flutterwaveWebhookService = require('../src/services/flutterwaveWebhookService');

test('payment identity webhook resolution preserves multi-Ajo isolation', async () => {
  const originalFindForWebhook = paymentIdentityRepository.findForWebhook;

  paymentIdentityRepository.findForWebhook = async ({ accountNumber }) => {
    if (accountNumber === '1000000001') {
      return { id: 1, cooperative_membership_id: 101 };
    }
    if (accountNumber === '1000000002') {
      return { id: 2, cooperative_membership_id: 202 };
    }
    return null;
  };

  try {
    const identityA = await paymentIdentityService.resolveWebhookIdentity({
      accountNumber: '1000000001'
    });
    const identityB = await paymentIdentityService.resolveWebhookIdentity({
      accountNumber: '1000000002'
    });
    const unknown = await paymentIdentityService.resolveWebhookIdentity({
      accountNumber: '9999999999'
    });

    assert.notEqual(identityA.cooperative_membership_id, identityB.cooperative_membership_id);
    assert.equal(identityA.cooperative_membership_id, 101);
    assert.equal(identityB.cooperative_membership_id, 202);
    assert.equal(unknown, null);
  } finally {
    paymentIdentityRepository.findForWebhook = originalFindForWebhook;
  }
});

test('Flutterwave webhook parsing never uses email or name as an identity key', () => {
  const event = flutterwaveWebhookService.extractEvent({
    event: 'charge.completed',
    data: {
      id: 77,
      flw_ref: 'FLW-REFERENCE-77',
      tx_ref: 'PAMOJA-MEMBERSHIP-101',
      customer: { name: 'Samuel', email: 'samuel@example.com' },
      account_number: '1000000001',
      amount: 5000,
      currency: 'NGN'
    }
  });

  assert.equal(event.transactionReference, 'PAMOJA-MEMBERSHIP-101');
  assert.equal(event.accountNumber, '1000000001');
  assert.equal(event.providerReference, 'FLW-REFERENCE-77');
  assert.equal(event.transactionId, '77');
  assert.equal(event.eventType, 'charge.completed');
});

test('Flutterwave webhook signatures use the configured verif-hash secret', () => {
  assert.equal(flutterwaveService.verifyWebhookSignature('phase-one-test-secret'), true);
  assert.equal(flutterwaveService.verifyWebhookSignature('wrong-secret'), false);
});

test.after(() => {
  if (previousWebhookSecret === undefined) {
    delete process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  } else {
    process.env.FLUTTERWAVE_WEBHOOK_SECRET = previousWebhookSecret;
  }
});
