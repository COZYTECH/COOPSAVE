CREATE DATABASE IF NOT EXISTS coopsave
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE coopsave;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


/* Phase 2 financial core. The migration runner is authoritative for upgrades;
-- these definitions keep a fresh schema recreation path available.
CREATE TABLE IF NOT EXISTS ajo_cycles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  cycle_number INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  contribution_amount DECIMAL(15, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
  interval_days INT UNSIGNED NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  grace_period_days INT UNSIGNED NOT NULL DEFAULT 0,
  recipient_membership_id BIGINT UNSIGNED NULL,
  status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ajo_cycles_cooperative_number (cooperative_id, cycle_number),
  KEY idx_ajo_cycles_cooperative_id (cooperative_id),
  KEY idx_ajo_cycles_status (status),
  KEY idx_ajo_cycles_frequency (frequency),
  KEY idx_ajo_cycles_recipient_membership (recipient_membership_id),
  CONSTRAINT fk_ajo_cycles_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ajo_cycles_recipient_membership FOREIGN KEY (recipient_membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_cycle_members_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cycle_members_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contribution_obligations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cycle_id BIGINT UNSIGNED NOT NULL,
  cycle_member_id BIGINT UNSIGNED NOT NULL,
  membership_id BIGINT UNSIGNED NOT NULL,
  expected_amount DECIMAL(15, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  due_at DATETIME NULL,
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED', 'EXCESS_PENDING_REVIEW') NOT NULL DEFAULT 'PENDING',
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  amount_outstanding DECIMAL(15, 2) NOT NULL,
  amount_excess DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contribution_obligations_cycle_membership_due_date (cycle_id, membership_id, due_at),
  KEY idx_contribution_obligations_membership_id (membership_id),
  KEY idx_contribution_obligations_cycle_member (cycle_member_id),
  KEY idx_contribution_obligations_status (status),
  CONSTRAINT fk_contribution_obligations_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contribution_obligations_cycle_member FOREIGN KEY (cycle_member_id) REFERENCES cycle_members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contribution_obligations_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  status ENUM('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'INITIATED',
  allocation_status ENUM('UNALLOCATED', 'ALLOCATED', 'EXCESS_PENDING_REVIEW', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'UNALLOCATED',
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'CONTRIBUTION',
  internal_reference VARCHAR(150) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_transactions_internal_reference (internal_reference),
  UNIQUE KEY uq_payment_transactions_provider_transaction (provider, provider_transaction_id),
  UNIQUE KEY uq_payment_transactions_provider_reference (provider, provider_reference),
  KEY idx_payment_transactions_membership (membership_id),
  KEY idx_payment_transactions_cooperative (cooperative_id),
  KEY idx_payment_transactions_status (status),
  KEY idx_payment_transactions_allocation_status (allocation_status),
  CONSTRAINT fk_payment_transactions_identity FOREIGN KEY (payment_identity_id) REFERENCES payment_identities(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transactions_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transactions_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transactions_webhook_event FOREIGN KEY (source_webhook_event_id) REFERENCES webhook_events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_payment_transaction_history_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transaction_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_obligation_allocations_transaction (payment_transaction_id),
  CONSTRAINT fk_obligation_allocations_obligation FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_obligation_allocations_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  cycle_id BIGINT UNSIGNED NULL,
  membership_id BIGINT UNSIGNED NULL,
  obligation_id BIGINT UNSIGNED NULL,
  payment_transaction_id BIGINT UNSIGNED NULL,
  payout_id BIGINT UNSIGNED NULL,
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
  KEY idx_ledger_entries_payout (payout_id),
  CONSTRAINT fk_ledger_entries_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_obligation FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; */

CREATE TABLE IF NOT EXISTS cooperatives (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cooperatives_owner_id (owner_id),
  CONSTRAINT fk_cooperatives_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cooperative_memberships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('GROUP_ADMIN', 'GROUP_MEMBER') NOT NULL DEFAULT 'GROUP_MEMBER',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cooperative_memberships_group_user (cooperative_id, user_id),
  KEY idx_cooperative_memberships_cooperative_id (cooperative_id),
  KEY idx_cooperative_memberships_user_id (user_id),
  KEY idx_cooperative_memberships_role (role),
  CONSTRAINT fk_cooperative_memberships_cooperative
    FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_cooperative_memberships_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  max_uses INT UNSIGNED NOT NULL DEFAULT 1,
  uses INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'USED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_group_invitations_token_hash (token_hash),
  KEY idx_group_invitations_cooperative_id (cooperative_id),
  KEY idx_group_invitations_created_by (created_by),
  KEY idx_group_invitations_status (status),
  KEY idx_group_invitations_expires_at (expires_at),
  CONSTRAINT fk_group_invitations_cooperative
    FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_group_invitations_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  account_ref VARCHAR(100) NULL,
  account_number VARCHAR(50) NULL,
  account_name VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_members_cooperative_email (cooperative_id, email),
  UNIQUE KEY uq_members_account_ref (account_ref),
  KEY idx_members_cooperative_id (cooperative_id),
  CONSTRAINT fk_members_cooperative
    FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS virtual_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NULL,
  account_ref VARCHAR(100) NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  account_name VARCHAR(150) NULL,
  bank_name VARCHAR(100) NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'NOMBA',
  environment ENUM('SANDBOX', 'PRODUCTION') NOT NULL DEFAULT 'SANDBOX',
  status ENUM('AVAILABLE', 'RESERVED', 'ASSIGNED', 'DISABLED') NOT NULL DEFAULT 'AVAILABLE',
  reserved_at DATETIME NULL,
  assigned_at DATETIME NULL,
  disabled_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_virtual_accounts_account_ref (account_ref),
  UNIQUE KEY uq_virtual_accounts_account_number (account_number),
  KEY idx_virtual_accounts_status (status),
  KEY idx_virtual_accounts_member_id (member_id),
  KEY idx_virtual_accounts_account_ref (account_ref),
  KEY idx_virtual_accounts_account_number (account_number),
  CONSTRAINT fk_virtual_accounts_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(100) NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  sender_name VARCHAR(150) NULL,
  narration TEXT NULL,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_request_id (request_id),
  UNIQUE KEY uq_transactions_transaction_id (transaction_id),
  KEY idx_transactions_transaction_id (transaction_id),
  KEY idx_transactions_member_id (member_id),
  CONSTRAINT fk_transactions_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(100) NULL,
  payload JSON NOT NULL,
  processed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_webhook_logs_request_id (request_id),
  KEY idx_webhook_logs_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(150) NULL,
  account_ref VARCHAR(100) NULL,
  transaction_reference VARCHAR(150) NULL,
  processing_status ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'IDENTITY_RESOLVED', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'PENDING',
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_events_provider_event_id (provider, event_id),
  UNIQUE KEY uq_webhook_events_provider_transaction_reference (provider, transaction_reference),
  KEY idx_webhook_events_provider (provider),
  KEY idx_webhook_events_event_type (event_type),
  KEY idx_webhook_events_account_ref (account_ref),
  KEY idx_webhook_events_processing_status (processing_status),
  KEY idx_webhook_events_received_at (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_identities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_membership_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'FLUTTERWAVE',
  provider_identity_type VARCHAR(50) NOT NULL DEFAULT 'VIRTUAL_ACCOUNT',
  provider_reference VARCHAR(150) NULL,
  virtual_account_reference VARCHAR(150) NULL,
  transaction_reference VARCHAR(150) NULL,
  account_number VARCHAR(50) NULL,
  account_name VARCHAR(150) NULL,
  bank_name VARCHAR(100) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status ENUM('PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED') NOT NULL DEFAULT 'PROVISIONING',
  provisioning_error TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_identities_membership_provider (cooperative_membership_id, provider),
  UNIQUE KEY uq_payment_identities_provider_reference (provider, provider_reference),
  UNIQUE KEY uq_payment_identities_virtual_account_reference (provider, virtual_account_reference),
  UNIQUE KEY uq_payment_identities_transaction_reference (provider, transaction_reference),
  KEY idx_payment_identities_provider (provider),
  KEY idx_payment_identities_status (status),
  KEY idx_payment_identities_account_number (account_number),
  CONSTRAINT fk_payment_identities_membership
    FOREIGN KEY (cooperative_membership_id) REFERENCES cooperative_memberships(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contributions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  last_transaction_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contributions_member_id (member_id),
  KEY idx_contributions_last_transaction_id (last_transaction_id),
  CONSTRAINT fk_contributions_member
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_contributions_last_transaction
    FOREIGN KEY (last_transaction_id) REFERENCES transactions(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ajo_cycles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  cycle_number INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  contribution_amount DECIMAL(15, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  frequency VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
  interval_days INT UNSIGNED NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  grace_period_days INT UNSIGNED NOT NULL DEFAULT 0,
  recipient_membership_id BIGINT UNSIGNED NULL,
  status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ajo_cycles_cooperative_number (cooperative_id, cycle_number),
  KEY idx_ajo_cycles_cooperative_id (cooperative_id),
  KEY idx_ajo_cycles_status (status),
  KEY idx_ajo_cycles_frequency (frequency),
  KEY idx_ajo_cycles_recipient_membership (recipient_membership_id),
  CONSTRAINT fk_ajo_cycles_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ajo_cycles_recipient_membership FOREIGN KEY (recipient_membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_cycle_members_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cycle_members_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contribution_obligations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cycle_id BIGINT UNSIGNED NOT NULL,
  cycle_member_id BIGINT UNSIGNED NOT NULL,
  membership_id BIGINT UNSIGNED NOT NULL,
  expected_amount DECIMAL(15, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  due_at DATETIME NULL,
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED', 'EXCESS_PENDING_REVIEW') NOT NULL DEFAULT 'PENDING',
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  amount_outstanding DECIMAL(15, 2) NOT NULL,
  amount_excess DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contribution_obligations_cycle_membership_due_date (cycle_id, membership_id, due_at),
  UNIQUE KEY uq_contribution_obligations_cycle_member (cycle_member_id),
  KEY idx_contribution_obligations_membership_id (membership_id),
  KEY idx_contribution_obligations_status (status),
  CONSTRAINT fk_contribution_obligations_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contribution_obligations_cycle_member FOREIGN KEY (cycle_member_id) REFERENCES cycle_members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contribution_obligations_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  status ENUM('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'INITIATED',
  allocation_status ENUM('UNALLOCATED', 'ALLOCATED', 'EXCESS_PENDING_REVIEW', 'RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'UNALLOCATED',
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'CONTRIBUTION',
  internal_reference VARCHAR(150) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_transactions_internal_reference (internal_reference),
  UNIQUE KEY uq_payment_transactions_provider_transaction (provider, provider_transaction_id),
  UNIQUE KEY uq_payment_transactions_provider_reference (provider, provider_reference),
  KEY idx_payment_transactions_membership (membership_id),
  KEY idx_payment_transactions_cooperative (cooperative_id),
  KEY idx_payment_transactions_status (status),
  KEY idx_payment_transactions_allocation_status (allocation_status),
  CONSTRAINT fk_payment_transactions_identity FOREIGN KEY (payment_identity_id) REFERENCES payment_identities(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transactions_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transactions_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transactions_webhook_event FOREIGN KEY (source_webhook_event_id) REFERENCES webhook_events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_payment_transaction_history_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_transaction_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_obligation_allocations_transaction (payment_transaction_id),
  CONSTRAINT fk_obligation_allocations_obligation FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_obligation_allocations_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cooperative_id BIGINT UNSIGNED NOT NULL,
  cycle_id BIGINT UNSIGNED NULL,
  membership_id BIGINT UNSIGNED NULL,
  obligation_id BIGINT UNSIGNED NULL,
  payment_transaction_id BIGINT UNSIGNED NULL,
  payout_id BIGINT UNSIGNED NULL,
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
  KEY idx_ledger_entries_payout (payout_id),
  CONSTRAINT fk_ledger_entries_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_obligation FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_entries_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_verified_bank_accounts_membership FOREIGN KEY (membership_id) REFERENCES cooperative_memberships(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  cooperative_id BIGINT UNSIGNED NULL,
  cycle_id BIGINT UNSIGNED NULL,
  obligation_id BIGINT UNSIGNED NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(500) NOT NULL,
  action_path VARCHAR(255) NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_obligation_type (obligation_id, type),
  KEY idx_notifications_user_read_created (user_id, read_at, created_at),
  KEY idx_notifications_cooperative (cooperative_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_cooperative FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_cycle FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_obligation FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_entries_payout
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE RESTRICT;

DROP TRIGGER IF EXISTS trg_ledger_entries_no_update;

CREATE TRIGGER trg_ledger_entries_no_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger entries are immutable.';

DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete;

CREATE TRIGGER trg_ledger_entries_no_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ledger entries cannot be deleted.';
