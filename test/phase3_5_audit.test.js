const assert = require('node:assert/strict');
const test = require('node:test');

const paymentIdentityRepository = require('../src/repositories/paymentIdentityRepository');
const paymentIdentityService = require('../src/services/paymentIdentityService');
const paymentProcessingService = require('../src/services/paymentProcessingService');

test('unknown payment identity logs only a masked account suffix', async () => {
  const originalFindForWebhook = paymentIdentityRepository.findForWebhook;
  const originalLog = console.log;
  const output = [];

  paymentIdentityRepository.findForWebhook = async () => null;
  console.log = (value) => output.push(String(value));

  try {
    const result = await paymentIdentityService.resolveWebhookIdentity({
      accountNumber: '0123456789'
    });

    assert.equal(result, null);
    assert.equal(output.length, 1);
    assert.equal(output[0].includes('0123456789'), false);
    assert.equal(output[0].includes('***6789'), true);
  } finally {
    paymentIdentityRepository.findForWebhook = originalFindForWebhook;
    console.log = originalLog;
  }
});

test('concurrent allocation math caps credits and records excess explicitly', async () => {
  const first = paymentProcessingService.calculateAllocation({
    paymentAmount: '6000.00',
    outstandingAmount: '10000.00'
  });
  const second = paymentProcessingService.calculateAllocation({
    paymentAmount: '6000.00',
    outstandingAmount: '4000.00'
  });

  assert.equal(first.amountAllocated, '6000.00');
  assert.equal(second.amountAllocated, '4000.00');
  assert.equal(second.amountExcess, '2000.00');
  assert.equal(second.status, 'EXCESS_PENDING_REVIEW');
});
