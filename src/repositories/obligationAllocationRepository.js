const { pool } = require('../config/database');

const create = async ({ obligationId, paymentTransactionId, amountAllocated, amountExcess, currency }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO obligation_allocations (
        obligation_id,
        payment_transaction_id,
        amount_allocated,
        amount_excess,
        currency
      )
      VALUES (:obligationId, :paymentTransactionId, :amountAllocated, :amountExcess, :currency)
    `,
    { obligationId, paymentTransactionId, amountAllocated, amountExcess, currency }
  );
  const [rows] = await db.execute(
    `
      SELECT id, obligation_id, payment_transaction_id, amount_allocated,
        amount_excess, currency, created_at
      FROM obligation_allocations
      WHERE id = :id
      LIMIT 1
    `,
    { id: result.insertId }
  );
  return rows[0] || null;
};

module.exports = { create };
