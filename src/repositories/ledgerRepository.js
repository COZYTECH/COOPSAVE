const { pool } = require('../config/database');

const columns = `
  le.id,
  le.cooperative_id,
  le.cycle_id,
  le.membership_id,
  le.obligation_id,
  le.payment_transaction_id,
  le.payout_id,
  le.entry_type,
  le.direction,
  le.amount,
  le.currency,
  le.reference,
  le.description,
  le.metadata,
  le.created_at
`;

const create = async ({ cooperativeId, cycleId, membershipId, obligationId, paymentTransactionId, payoutId, entryType, direction, amount, currency, reference, description, metadata = {} }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO ledger_entries (
        cooperative_id,
        cycle_id,
        membership_id,
        obligation_id,
        payment_transaction_id,
        payout_id,
        entry_type,
        direction,
        amount,
        currency,
        reference,
        description,
        metadata
      )
      VALUES (:cooperativeId, :cycleId, :membershipId, :obligationId, :paymentTransactionId, :payoutId, :entryType, :direction, :amount, :currency, :reference, :description, :metadata)
    `,
    {
      cooperativeId,
      cycleId: cycleId || null,
      membershipId: membershipId || null,
      obligationId: obligationId || null,
      paymentTransactionId: paymentTransactionId || null,
      payoutId: payoutId || null,
      entryType,
      direction,
      amount,
      currency,
      reference,
      description: description || null,
      metadata: JSON.stringify(metadata)
    }
  );
  const [rows] = await db.execute(
    `SELECT ${columns} FROM ledger_entries le WHERE le.id = :id LIMIT 1`,
    { id: result.insertId }
  );
  return rows[0] || null;
};

const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${columns} FROM ledger_entries le WHERE le.cooperative_id = :cooperativeId ORDER BY le.created_at DESC`,
    { cooperativeId }
  );
  return rows;
};

const findAll = async (db = pool) => {
  const [rows] = await db.execute(`SELECT ${columns} FROM ledger_entries le ORDER BY le.created_at DESC`);
  return rows;
};

module.exports = { create, findAllByCooperativeId, findAll };
