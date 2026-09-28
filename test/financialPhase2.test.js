const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateAllocation, isValidTransition } = require('../src/services/paymentProcessingService');

test('exact payment closes an obligation without excess', () => {
  assert.deepEqual(calculateAllocation({ paymentAmount: '500.00', outstandingAmount: '500.00' }), {
    amountAllocated: '500.00',
    amountExcess: '0.00',
    amountPaid: '500.00',
    amountOutstanding: '0.00',
    amountExcessTotal: '0.00',
    status: 'PAID'
  });
});

test('exact NGN 2000 card-sized payment is paid with zero excess', () => {
  assert.deepEqual(calculateAllocation({
    paymentAmount: '2000.00',
    outstandingAmount: '2000.00'
  }), {
    amountAllocated: '2000.00',
    amountExcess: '0.00',
    amountPaid: '2000.00',
    amountOutstanding: '0.00',
    amountExcessTotal: '0.00',
    status: 'PAID'
  });
});

test('partial payments preserve the outstanding balance', () => {
  const first = calculateAllocation({ paymentAmount: '200.00', outstandingAmount: '500.00' });
  const second = calculateAllocation({
    paymentAmount: '300.00',
    outstandingAmount: first.amountOutstanding,
    existingExcess: first.amountExcessTotal
  });

  assert.equal(first.status, 'PARTIAL');
  assert.equal(first.amountOutstanding, '300.00');
  assert.equal(second.status, 'PAID');
  assert.equal(second.amountOutstanding, '0.00');
});

test('multiple partial payments do not discard prior excess', () => {
  const result = calculateAllocation({
    paymentAmount: '125.50',
    outstandingAmount: '100.00',
    existingExcess: '5.00'
  });

  assert.equal(result.amountAllocated, '100.00');
  assert.equal(result.amountExcess, '25.50');
  assert.equal(result.amountExcessTotal, '30.50');
  assert.equal(result.status, 'EXCESS_PENDING_REVIEW');
});

test('invalid state transitions are rejected by the payment engine', () => {
  assert.equal(isValidTransition('SUCCESS', 'PENDING'), false);
  assert.equal(isValidTransition('PENDING', 'SUCCESS'), true);
  assert.equal(isValidTransition('SUCCESS', 'RECONCILIATION_REQUIRED'), true);
});
