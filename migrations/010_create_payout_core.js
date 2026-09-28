const columnExists = async (db, tableName, columnName) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const indexExists = async (db, tableName, indexName) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName]
  );
  return rows.length > 0;
};

const foreignKeyExists = async (db, tableName, constraintName) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      LIMIT 1
    `,
    [tableName, constraintName]
  );
  return rows.length > 0;
};

const up = async (db) => {
  if (!(await columnExists(db, 'ajo_cycles', 'recipient_membership_id'))) {
    await db.query(`
      ALTER TABLE ajo_cycles
        ADD COLUMN recipient_membership_id BIGINT UNSIGNED NULL AFTER end_date
    `);
  }

  if (!(await indexExists(db, 'ajo_cycles', 'idx_ajo_cycles_recipient_membership'))) {
    await db.query(`
      ALTER TABLE ajo_cycles
        ADD KEY idx_ajo_cycles_recipient_membership (recipient_membership_id)
    `);
  }

  if (!(await foreignKeyExists(db, 'ajo_cycles', 'fk_ajo_cycles_recipient_membership'))) {
    await db.query(`
      ALTER TABLE ajo_cycles
        ADD CONSTRAINT fk_ajo_cycles_recipient_membership
        FOREIGN KEY (recipient_membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE RESTRICT
    `);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS verified_bank_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      membership_id BIGINT UNSIGNED NOT NULL,
      country CHAR(2) NOT NULL DEFAULT 'NG',
      currency CHAR(3) NOT NULL DEFAULT 'NGN',
      bank_code VARCHAR(30) NOT NULL,
      bank_name VARCHAR(150) NULL,
      account_number_hash CHAR(64) NOT NULL,
      account_number_encrypted TEXT NOT NULL,
      account_number_masked VARCHAR(30) NOT NULL,
      account_name VARCHAR(150) NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'FLUTTERWAVE',
      provider_account_reference VARCHAR(150) NULL,
      verification_status ENUM('PENDING', 'VERIFIED', 'FAILED', 'SUSPENDED', 'VERIFICATION_REVIEW_REQUIRED') NOT NULL DEFAULT 'PENDING',
      verification_metadata JSON NULL,
      verified_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_verified_bank_accounts_membership_hash (membership_id, provider, account_number_hash),
      KEY idx_verified_bank_accounts_membership (membership_id),
      KEY idx_verified_bank_accounts_status (verification_status),
      KEY idx_verified_bank_accounts_provider_reference (provider, provider_account_reference),
      CONSTRAINT fk_verified_bank_accounts_membership
        FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payouts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      cycle_id BIGINT UNSIGNED NOT NULL,
      recipient_membership_id BIGINT UNSIGNED NOT NULL,
      bank_account_id BIGINT UNSIGNED NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      currency CHAR(3) NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'FLUTTERWAVE',
      provider_transfer_id VARCHAR(150) NULL,
      provider_reference VARCHAR(150) NULL,
      internal_reference VARCHAR(150) NOT NULL,
      status ENUM('DRAFT', 'ELIGIBLE', 'INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'DRAFT',
      failure_reason VARCHAR(500) NULL,
      metadata JSON NULL,
      initiated_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_payouts_cycle_recipient (cycle_id, recipient_membership_id),
      UNIQUE KEY uq_payouts_internal_reference (internal_reference),
      UNIQUE KEY uq_payouts_provider_transfer (provider, provider_transfer_id),
      UNIQUE KEY uq_payouts_provider_reference (provider, provider_reference),
      KEY idx_payouts_cooperative (cooperative_id),
      KEY idx_payouts_cycle (cycle_id),
      KEY idx_payouts_recipient (recipient_membership_id),
      KEY idx_payouts_bank_account (bank_account_id),
      KEY idx_payouts_status (status),
      CONSTRAINT fk_payouts_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
      CONSTRAINT fk_payouts_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
      CONSTRAINT fk_payouts_recipient FOREIGN KEY (recipient_membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT,
      CONSTRAINT fk_payouts_bank_account FOREIGN KEY (bank_account_id) REFERENCES verified_bank_accounts(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payout_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payout_id BIGINT UNSIGNED NOT NULL,
      attempt_number INT UNSIGNED NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'FLUTTERWAVE',
      provider_transfer_id VARCHAR(150) NULL,
      provider_reference VARCHAR(150) NOT NULL,
      status ENUM('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'INITIATED',
      request_metadata JSON NULL,
      response_metadata JSON NULL,
      failure_reason VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_payout_attempts_number (payout_id, attempt_number),
      UNIQUE KEY uq_payout_attempts_provider_reference (provider, provider_reference),
      UNIQUE KEY uq_payout_attempts_provider_transfer (provider, provider_transfer_id),
      KEY idx_payout_attempts_payout (payout_id),
      KEY idx_payout_attempts_status (status),
      CONSTRAINT fk_payout_attempts_payout FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payout_status_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payout_id BIGINT UNSIGNED NOT NULL,
      previous_status VARCHAR(40) NULL,
      new_status VARCHAR(40) NOT NULL,
      actor_type VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
      actor_user_id BIGINT UNSIGNED NULL,
      reason VARCHAR(255) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_payout_status_history_payout (payout_id),
      KEY idx_payout_status_history_created (created_at),
      CONSTRAINT fk_payout_status_history_payout FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE RESTRICT,
      CONSTRAINT fk_payout_status_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await columnExists(db, 'ledger_entries', 'payout_id'))) {
    await db.query(`
      ALTER TABLE ledger_entries
        ADD COLUMN payout_id BIGINT UNSIGNED NULL AFTER payment_transaction_id
    `);
  }

  if (!(await indexExists(db, 'ledger_entries', 'idx_ledger_entries_payout'))) {
    await db.query(`
      ALTER TABLE ledger_entries
        ADD KEY idx_ledger_entries_payout (payout_id)
    `);
  }

  if (!(await foreignKeyExists(db, 'ledger_entries', 'fk_ledger_entries_payout'))) {
    await db.query(`
      ALTER TABLE ledger_entries
        ADD CONSTRAINT fk_ledger_entries_payout
        FOREIGN KEY (payout_id) REFERENCES payouts(id)
        ON DELETE RESTRICT
    `);
  }
};

const down = async (db) => {
  if (await foreignKeyExists(db, 'ledger_entries', 'fk_ledger_entries_payout')) {
    await db.query('ALTER TABLE ledger_entries DROP FOREIGN KEY fk_ledger_entries_payout');
  }
  if (await indexExists(db, 'ledger_entries', 'idx_ledger_entries_payout')) {
    await db.query('ALTER TABLE ledger_entries DROP KEY idx_ledger_entries_payout');
  }
  if (await columnExists(db, 'ledger_entries', 'payout_id')) {
    await db.query('ALTER TABLE ledger_entries DROP COLUMN payout_id');
  }
  await db.query('DROP TABLE IF EXISTS payout_status_history');
  await db.query('DROP TABLE IF EXISTS payout_attempts');
  await db.query('DROP TABLE IF EXISTS payouts');
  await db.query('DROP TABLE IF EXISTS verified_bank_accounts');
  if (await foreignKeyExists(db, 'ajo_cycles', 'fk_ajo_cycles_recipient_membership')) {
    await db.query('ALTER TABLE ajo_cycles DROP FOREIGN KEY fk_ajo_cycles_recipient_membership');
  }
  if (await indexExists(db, 'ajo_cycles', 'idx_ajo_cycles_recipient_membership')) {
    await db.query('ALTER TABLE ajo_cycles DROP KEY idx_ajo_cycles_recipient_membership');
  }
  if (await columnExists(db, 'ajo_cycles', 'recipient_membership_id')) {
    await db.query('ALTER TABLE ajo_cycles DROP COLUMN recipient_membership_id');
  }
};

module.exports = { up, down };
