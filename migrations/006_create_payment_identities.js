const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_identities (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_membership_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'FLUTTERWAVE',
      provider_identity_type VARCHAR(50) NOT NULL DEFAULT 'VIRTUAL_ACCOUNT',
      provider_reference VARCHAR(150) NULL,
      virtual_account_reference VARCHAR(150) NULL,
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
      KEY idx_payment_identities_provider (provider),
      KEY idx_payment_identities_status (status),
      KEY idx_payment_identities_account_number (account_number),
      CONSTRAINT fk_payment_identities_membership
        FOREIGN KEY (cooperative_membership_id) REFERENCES cooperative_memberships(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS payment_identities');
};

module.exports = { up, down };
