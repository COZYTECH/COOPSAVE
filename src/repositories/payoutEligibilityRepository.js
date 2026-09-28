const { pool } = require('../config/database');

const getObligationSummary = async (cycleId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT
        COUNT(*) AS total_obligations,
        SUM(CASE WHEN status NOT IN ('PAID', 'WAIVED', 'CANCELLED') OR amount_outstanding > 0 THEN 1 ELSE 0 END) AS outstanding_obligations,
        COALESCE(SUM(amount_outstanding), 0) AS total_outstanding
      FROM contribution_obligations
      WHERE cycle_id = :cycleId
    `,
    { cycleId }
  );
  return rows[0] || { total_obligations: 0, outstanding_obligations: 0, total_outstanding: '0.00' };
};

const getReconciliationCount = async (cycleId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT COUNT(*) AS count
      FROM payment_transactions pt
      INNER JOIN obligation_allocations oa ON oa.payment_transaction_id = pt.id
      INNER JOIN contribution_obligations co ON co.id = oa.obligation_id
      WHERE co.cycle_id = :cycleId
        AND pt.allocation_status = 'RECONCILIATION_REQUIRED'
    `,
    { cycleId }
  );
  return Number(rows[0]?.count || 0);
};

module.exports = { getObligationSummary, getReconciliationCount };
