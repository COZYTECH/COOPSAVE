const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ajo_cycles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      cycle_number INT UNSIGNED NOT NULL,
      name VARCHAR(150) NOT NULL,
      contribution_amount DECIMAL(15, 2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'NGN',
      frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
      start_date DATE NOT NULL,
      end_date DATE NULL,
      status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_ajo_cycles_cooperative_number (cooperative_id, cycle_number),
      KEY idx_ajo_cycles_cooperative_id (cooperative_id),
      KEY idx_ajo_cycles_status (status),
      KEY idx_ajo_cycles_start_date (start_date),
      CONSTRAINT fk_ajo_cycles_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cycle_members (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cycle_id BIGINT UNSIGNED NOT NULL,
      membership_id BIGINT UNSIGNED NOT NULL,
      position INT UNSIGNED NULL,
      expected_amount DECIMAL(15, 2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'NGN',
      status ENUM('ACTIVE', 'REMOVED', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cycle_members_cycle_membership (cycle_id, membership_id),
      KEY idx_cycle_members_cycle_id (cycle_id),
      KEY idx_cycle_members_membership_id (membership_id),
      CONSTRAINT fk_cycle_members_cycle
        FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_cycle_members_membership
        FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS contribution_obligations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cycle_id BIGINT UNSIGNED NOT NULL,
      cycle_member_id BIGINT UNSIGNED NOT NULL,
      membership_id BIGINT UNSIGNED NOT NULL,
      expected_amount DECIMAL(15, 2) NOT NULL,
      currency CHAR(3) NOT NULL DEFAULT 'NGN',
      due_at DATETIME NULL,
      status ENUM(
        'PENDING',
        'PARTIAL',
        'PAID',
        'OVERDUE',
        'WAIVED',
        'CANCELLED',
        'EXCESS_PENDING_REVIEW'
      ) NOT NULL DEFAULT 'PENDING',
      amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      amount_outstanding DECIMAL(15, 2) NOT NULL,
      amount_excess DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_contribution_obligations_cycle_membership (cycle_id, membership_id),
      UNIQUE KEY uq_contribution_obligations_cycle_member (cycle_member_id),
      KEY idx_contribution_obligations_cycle_id (cycle_id),
      KEY idx_contribution_obligations_membership_id (membership_id),
      KEY idx_contribution_obligations_status (status),
      KEY idx_contribution_obligations_due_at (due_at),
      CONSTRAINT fk_contribution_obligations_cycle
        FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_contribution_obligations_cycle_member
        FOREIGN KEY (cycle_member_id) REFERENCES cycle_members(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_contribution_obligations_membership
        FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      provider VARCHAR(50) NOT NULL,
      provider_transaction_id VARCHAR(150) NULL,
      provider_reference VARCHAR(150) NULL,
      payment_identity_id BIGINT UNSIGNED NOT NULL,
      membership_id BIGINT UNSIGNED NOT NULL,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      source_webhook_event_id BIGINT UNSIGNED NULL,
      gross_amount DECIMAL(15, 2) NOT NULL,
      currency CHAR(3) NOT NULL,
      provider_fee DECIMAL(15, 2) NULL,
      pamoja_fee DECIMAL(15, 2) NULL,
      net_amount DECIMAL(15, 2) NOT NULL,
      status ENUM(
        'INITIATED',
        'PENDING',
        'SUCCESS',
        'FAILED',
        'UNKNOWN',
        'RECONCILIATION_REQUIRED'
      ) NOT NULL DEFAULT 'INITIATED',
      allocation_status ENUM(
        'UNALLOCATED',
        'ALLOCATED',
        'EXCESS_PENDING_REVIEW',
        'RECONCILIATION_REQUIRED'
      ) NOT NULL DEFAULT 'UNALLOCATED',
      transaction_type VARCHAR(50) NOT NULL DEFAULT 'CONTRIBUTION',
      internal_reference VARCHAR(150) NOT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_payment_transactions_internal_reference (internal_reference),
      UNIQUE KEY uq_payment_transactions_provider_transaction (provider, provider_transaction_id),
      UNIQUE KEY uq_payment_transactions_provider_reference (provider, provider_reference),
      KEY idx_payment_transactions_provider (provider),
      KEY idx_payment_transactions_payment_identity (payment_identity_id),
      KEY idx_payment_transactions_membership (membership_id),
      KEY idx_payment_transactions_cooperative (cooperative_id),
      KEY idx_payment_transactions_webhook_event (source_webhook_event_id),
      KEY idx_payment_transactions_status (status),
      KEY idx_payment_transactions_allocation_status (allocation_status),
      KEY idx_payment_transactions_created_at (created_at),
      CONSTRAINT fk_payment_transactions_identity
        FOREIGN KEY (payment_identity_id) REFERENCES payment_identities(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_payment_transactions_membership
        FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_payment_transactions_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_payment_transactions_webhook_event
        FOREIGN KEY (source_webhook_event_id) REFERENCES webhook_events(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_transaction_status_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      payment_transaction_id BIGINT UNSIGNED NOT NULL,
      previous_status VARCHAR(40) NULL,
      new_status VARCHAR(40) NOT NULL,
      actor_type VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
      actor_user_id BIGINT UNSIGNED NULL,
      reason VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_payment_transaction_history_transaction (payment_transaction_id),
      KEY idx_payment_transaction_history_created_at (created_at),
      CONSTRAINT fk_payment_transaction_history_transaction
        FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_payment_transaction_history_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS obligation_allocations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      obligation_id BIGINT UNSIGNED NOT NULL,
      payment_transaction_id BIGINT UNSIGNED NOT NULL,
      amount_allocated DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      amount_excess DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      currency CHAR(3) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_obligation_allocations_obligation_transaction (obligation_id, payment_transaction_id),
      KEY idx_obligation_allocations_obligation (obligation_id),
      KEY idx_obligation_allocations_transaction (payment_transaction_id),
      CONSTRAINT fk_obligation_allocations_obligation
        FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_obligation_allocations_transaction
        FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      cycle_id BIGINT UNSIGNED NULL,
      membership_id BIGINT UNSIGNED NULL,
      obligation_id BIGINT UNSIGNED NULL,
      payment_transaction_id BIGINT UNSIGNED NULL,
      entry_type VARCHAR(50) NOT NULL,
      direction ENUM('DEBIT', 'CREDIT') NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      currency CHAR(3) NOT NULL,
      reference VARCHAR(150) NOT NULL,
      description VARCHAR(255) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_ledger_entries_reference (reference),
      KEY idx_ledger_entries_cooperative (cooperative_id),
      KEY idx_ledger_entries_cycle (cycle_id),
      KEY idx_ledger_entries_membership (membership_id),
      KEY idx_ledger_entries_obligation (obligation_id),
      KEY idx_ledger_entries_transaction (payment_transaction_id),
      KEY idx_ledger_entries_created_at (created_at),
      CONSTRAINT fk_ledger_entries_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_ledger_entries_cycle
        FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_ledger_entries_membership
        FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_ledger_entries_obligation
        FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id)
        ON DELETE RESTRICT,
      CONSTRAINT fk_ledger_entries_transaction
        FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query('DROP TRIGGER IF EXISTS trg_ledger_entries_no_update');
  await db.query(`
    CREATE TRIGGER trg_ledger_entries_no_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger entries are immutable.'
  `);

  await db.query('DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete');
  await db.query(`
    CREATE TRIGGER trg_ledger_entries_no_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger entries cannot be deleted.'
  `);
};

const down = async (db) => {
  await db.query('DROP TRIGGER IF EXISTS trg_ledger_entries_no_update');
  await db.query('DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete');
  await db.query('DROP TABLE IF EXISTS ledger_entries');
  await db.query('DROP TABLE IF EXISTS obligation_allocations');
  await db.query('DROP TABLE IF EXISTS payment_transaction_status_history');
  await db.query('DROP TABLE IF EXISTS payment_transactions');
  await db.query('DROP TABLE IF EXISTS contribution_obligations');
  await db.query('DROP TABLE IF EXISTS cycle_members');
  await db.query('DROP TABLE IF EXISTS ajo_cycles');
};

module.exports = { up, down };
