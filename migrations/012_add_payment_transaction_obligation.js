const hasColumn = async (db, table, column) => {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
};

const hasIndex = async (db, table, indexName) => {
  const [rows] = await db.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
  return rows.length > 0;
};

const hasForeignKey = async (db, table, constraintName) => {
  const [rows] = await db.query(
    `
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      LIMIT 1
    `,
    [table, constraintName]
  );
  return rows.length > 0;
};

const up = async (db) => {
  // A checkout is created for one exact obligation. Keeping that relationship
  // on the payment transaction prevents a later webhook from being allocated
  // to whichever obligation happens to be active for the membership.
  if (!(await hasColumn(db, 'payment_transactions', 'obligation_id'))) {
    await db.query(`
      ALTER TABLE payment_transactions
      ADD COLUMN obligation_id BIGINT UNSIGNED NULL AFTER cooperative_id
    `);
  }

  if (!(await hasIndex(db, 'payment_transactions', 'idx_payment_transactions_obligation'))) {
    await db.query(`
      ALTER TABLE payment_transactions
      ADD KEY idx_payment_transactions_obligation (obligation_id)
    `);
  }

  if (!(await hasForeignKey(db, 'payment_transactions', 'fk_payment_transactions_obligation'))) {
    await db.query(`
      ALTER TABLE payment_transactions
      ADD CONSTRAINT fk_payment_transactions_obligation
        FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id)
        ON DELETE RESTRICT
    `);
  }
};

const down = async (db) => {
  if (await hasForeignKey(db, 'payment_transactions', 'fk_payment_transactions_obligation')) {
    await db.query(`
      ALTER TABLE payment_transactions
      DROP FOREIGN KEY fk_payment_transactions_obligation
    `);
  }

  if (await hasIndex(db, 'payment_transactions', 'idx_payment_transactions_obligation')) {
    await db.query(`
      ALTER TABLE payment_transactions
      DROP INDEX idx_payment_transactions_obligation
    `);
  }

  if (await hasColumn(db, 'payment_transactions', 'obligation_id')) {
    await db.query(`
      ALTER TABLE payment_transactions
      DROP COLUMN obligation_id
    `);
  }
};

module.exports = { up, down };
