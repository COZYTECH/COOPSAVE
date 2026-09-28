const assert = require('node:assert/strict');
const test = require('node:test');

const { pool } = require('../src/config/database');
const cycleRepository = require('../src/repositories/cycleRepository');
const cooperativeRepository = require('../src/repositories/cooperativeRepository');
const cycleService = require('../src/services/cycleService');

const originals = [];
const remember = (object, method, replacement) => {
  if (!originals.some((entry) => entry.object === object && entry.method === method)) {
    originals.push({ object, method, original: object[method] });
  }
  object[method] = replacement;
};

const restore = () => {
  for (const entry of originals.reverse()) {
    entry.object[entry.method] = entry.original;
  }
  originals.length = 0;
};

const connection = () => ({
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {}
});

const setup = ({ status = 'DRAFT', activity = {}, authorized = true } = {}) => {
  const db = connection();
  let deleted = false;
  let cancelled = false;

  remember(pool, 'getConnection', async () => db);
  remember(cooperativeRepository, 'findByIdAndManagerId', async () => (authorized ? { id: 5, owner_id: 42 } : null));
  remember(cycleRepository, 'findByIdAndCooperative', async () => ({
    id: 9,
    cooperative_id: 5,
    status
  }));
  remember(cycleRepository, 'getFinancialActivity', async () => ({
    obligations: 0,
    payment_transactions: 0,
    payment_allocations: 0,
    ledger_entries: 0,
    payouts: 0,
    payout_attempts: 0,
    ...activity,
    hasFinancialActivity: Object.values(activity).some((value) => Number(value) > 0)
  }));
  remember(cycleRepository, 'deleteDraft', async () => { deleted = true; });
  remember(cycleRepository, 'cancel', async () => { cancelled = true; return { id: 9, status: 'CANCELLED' }; });

  return { get deleted() { return deleted; }, get cancelled() { return cancelled; } };
};

test.afterEach(restore);

test('deletes a draft cycle with zero financial activity', async () => {
  const state = setup();
  const result = await cycleService.deleteCycle(5, 9, 42);
  assert.equal(result.id, 9);
  assert.equal(state.deleted, true);
});

for (const field of ['obligations', 'payment_transactions', 'payment_allocations', 'ledger_entries', 'payouts', 'payout_attempts']) {
  test(`rejects a draft cycle with ${field}`, async () => {
    const state = setup({ activity: { [field]: 1 } });
    await assert.rejects(
      cycleService.deleteCycle(5, 9, 42),
      { statusCode: 409, code: 'CYCLE_HAS_FINANCIAL_ACTIVITY' }
    );
    assert.equal(state.deleted, false);
  });
}

for (const status of ['ACTIVE', 'COMPLETED', 'CANCELLED']) {
  test(`does not hard-delete a ${status} cycle`, async () => {
    const state = setup({ status });
    await assert.rejects(
      cycleService.deleteCycle(5, 9, 42),
      { statusCode: 409, code: 'CYCLE_CANNOT_BE_DELETED' }
    );
    assert.equal(state.deleted, false);
  });
}

test('rejects a manager from another Ajo', async () => {
  const state = setup({ authorized: false });
  await assert.rejects(cycleService.deleteCycle(5, 9, 77), { statusCode: 404 });
  assert.equal(state.deleted, false);
});

test('cancels an active cycle without deleting its history', async () => {
  const state = setup({ status: 'ACTIVE', activity: { obligations: 3 } });
  const result = await cycleService.cancelCycle(5, 9, 42);
  assert.equal(result.status, 'CANCELLED');
  assert.equal(state.cancelled, true);
  assert.equal(state.deleted, false);
});

