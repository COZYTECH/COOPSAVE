const assert = require('node:assert/strict');
const test = require('node:test');
const financialAccountService = require('../src/services/financialAccountService');

test('financial account provider identifiers are masked before serialization', () => {
  assert.equal(
    financialAccountService.maskProviderValue('MockFLWRef-1790338189896'),
    '********9896'
  );
  assert.equal(financialAccountService.maskProviderValue(null), null);
});

test('financial account read model preserves ledger-derived position and reconciliation counts', () => {
  const account = financialAccountService.toAccount({
    cooperative_id: 12,
    cooperative_name: 'Family Savings',
    cooperative_description: null,
    cooperative_created_at: '2026-09-25T00:00:00.000Z',
    provider_identity_count: 2,
    active_identity_count: 2,
    provider: 'FLUTTERWAVE',
    provider_identity_type: 'VIRTUAL_ACCOUNT',
    provider_identity: '********4821, ********8192',
    identity_updated_at: '2026-09-25T00:00:00.000Z',
    account_status: 'ACTIVE',
    total_contributions: '420000.00',
    total_paid_out: '200000.00',
    reserved_payouts: '0.00',
    available_for_payout: '220000.00',
    outstanding_contributions: '0.00',
    successful_payment_count: 8,
    pending_payment_count: 1,
    failed_payment_count: 0,
    unresolved_payment_count: 0,
    unresolved_payout_count: 0
  });

  assert.equal(account.providerIdentityCount, 2);
  assert.equal(account.totalContributions, 420000);
  assert.equal(account.totalPaidOut, 200000);
  assert.equal(account.availableForPayout, 220000);
  assert.equal(account.unresolvedPaymentCount, 0);
  assert.equal(account.unresolvedPayoutCount, 0);
});
