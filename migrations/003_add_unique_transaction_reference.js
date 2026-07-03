const indexExists = async (db, indexName) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'transactions'
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [indexName]
  );

  return rows.length > 0;
};

const up = async (db) => {
  const [duplicateRows] = await db.query(`
    SELECT transaction_id
    FROM transactions
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
    LIMIT 1
  `);

  if (duplicateRows.length > 0) {
    throw new Error(
      'Cannot add unique transaction reference: duplicate transaction_id values exist.'
    );
  }

  if (!(await indexExists(db, 'uq_transactions_transaction_id'))) {
    await db.query(
      'ALTER TABLE transactions ADD UNIQUE KEY uq_transactions_transaction_id (transaction_id)'
    );
  }
};

const down = async (db) => {
  if (await indexExists(db, 'uq_transactions_transaction_id')) {
    await db.query('ALTER TABLE transactions DROP INDEX uq_transactions_transaction_id');
  }
};

module.exports = {
  up,
  down
};
