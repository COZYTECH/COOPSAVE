const hasColumn = async (db, table, column) => {
  const [rows] = await db.query(
    `SHOW COLUMNS FROM ${table} LIKE ?`,
    [column]
  );
  return rows.length > 0;
};

const hasIndex = async (db, table, indexName) => {
  const [rows] = await db.query(
    `SHOW INDEX FROM ${table} WHERE Key_name = ?`,
    [indexName]
  );
  return rows.length > 0;
};

const up = async (db) => {
  if (!(await hasColumn(db, 'payment_identities', 'transaction_reference'))) {
    await db.query(`
      ALTER TABLE payment_identities
      ADD COLUMN transaction_reference VARCHAR(150) NULL
      AFTER virtual_account_reference
    `);
  }

  if (!(await hasIndex(
    db,
    'payment_identities',
    'uq_payment_identities_transaction_reference'
  ))) {
    await db.query(`
      ALTER TABLE payment_identities
      ADD UNIQUE KEY uq_payment_identities_transaction_reference
        (provider, transaction_reference)
    `);
  }

  // Existing identities were provisioned with this deterministic tx_ref but
  // the value was not persisted separately from the provider order_ref.
  // Backfill only the new identity reference; no financial records are changed.
  await db.query(`
    UPDATE payment_identities pi
    INNER JOIN cooperative_memberships cm
      ON cm.id = pi.cooperative_membership_id
    SET pi.transaction_reference = CONCAT('PAMOJA-MEMBERSHIP-', cm.id)
    WHERE pi.provider = 'FLUTTERWAVE'
      AND pi.transaction_reference IS NULL
  `);
};

const down = async (db) => {
  if (await hasIndex(
    db,
    'payment_identities',
    'uq_payment_identities_transaction_reference'
  )) {
    await db.query(`
      ALTER TABLE payment_identities
      DROP INDEX uq_payment_identities_transaction_reference
    `);
  }

  if (await hasColumn(db, 'payment_identities', 'transaction_reference')) {
    await db.query(`
      ALTER TABLE payment_identities
      DROP COLUMN transaction_reference
    `);
  }
};

module.exports = { up, down };
