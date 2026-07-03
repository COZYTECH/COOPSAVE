const up = async (db) => {
  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS members (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      account_ref VARCHAR(100) NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      account_name VARCHAR(150) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_members_cooperative_email (cooperative_id, email),
      UNIQUE KEY uq_members_account_ref (account_ref),
      KEY idx_members_cooperative_id (cooperative_id),
      CONSTRAINT fk_members_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
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
      KEY idx_transactions_transaction_id (transaction_id),
      KEY idx_transactions_member_id (member_id),
      CONSTRAINT fk_transactions_member
        FOREIGN KEY (member_id) REFERENCES members(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      request_id VARCHAR(100) NULL,
      payload JSON NOT NULL,
      processed TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_webhook_logs_request_id (request_id),
      KEY idx_webhook_logs_processed (processed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS contributions');
  await db.query('DROP TABLE IF EXISTS webhook_logs');
  await db.query('DROP TABLE IF EXISTS transactions');
  await db.query('DROP TABLE IF EXISTS virtual_accounts');
  await db.query('DROP TABLE IF EXISTS members');
  await db.query('DROP TABLE IF EXISTS cooperatives');
  await db.query('DROP TABLE IF EXISTS users');
};

module.exports = {
  up,
  down
};
