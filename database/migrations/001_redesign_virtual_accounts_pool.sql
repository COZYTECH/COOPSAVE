-- Redesign virtual_accounts as a resource pool while preserving existing rows.
-- This migration is intentionally defensive: it upgrades an old table in place
-- and stops if existing data would break the repository's uniqueness or FK rules.

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
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS migrate_virtual_accounts_pool;

DELIMITER $$

CREATE PROCEDURE migrate_virtual_accounts_pool()
BEGIN
  DECLARE duplicate_count INT DEFAULT 0;
  DECLARE invalid_count INT DEFAULT 0;
  DECLARE member_fk_drops TEXT DEFAULT NULL;

  IF DATABASE() IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No database selected for virtual_accounts migration.';
  END IF;

  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT account_ref
    FROM virtual_accounts
    GROUP BY account_ref
    HAVING COUNT(*) > 1
  ) duplicate_refs;

  IF duplicate_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot migrate virtual_accounts: duplicate account_ref values exist.';
  END IF;

  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT account_number
    FROM virtual_accounts
    GROUP BY account_number
    HAVING COUNT(*) > 1
  ) duplicate_numbers;

  IF duplicate_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot migrate virtual_accounts: duplicate account_number values exist.';
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM virtual_accounts
  WHERE CHAR_LENGTH(account_ref) > 100
     OR CHAR_LENGTH(account_number) > 30
     OR CHAR_LENGTH(account_name) > 150
     OR CHAR_LENGTH(bank_name) > 100;

  IF invalid_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot migrate virtual_accounts: one or more values exceed the repository column lengths.';
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM virtual_accounts
  WHERE member_id < 0;

  IF invalid_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot migrate virtual_accounts: member_id contains a negative value.';
  END IF;

  SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`') SEPARATOR ', ')
    INTO member_fk_drops
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'virtual_accounts'
    AND COLUMN_NAME = 'member_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

  IF member_fk_drops IS NOT NULL THEN
    SET @drop_member_fks_sql = CONCAT('ALTER TABLE virtual_accounts ', member_fk_drops);
    PREPARE drop_member_fks_stmt FROM @drop_member_fks_sql;
    EXECUTE drop_member_fks_stmt;
    DEALLOCATE PREPARE drop_member_fks_stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND COLUMN_NAME = 'provider'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'NOMBA' AFTER bank_name;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND COLUMN_NAME = 'environment'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD COLUMN environment VARCHAR(20) NULL DEFAULT 'SANDBOX' AFTER provider;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND COLUMN_NAME = 'reserved_at'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD COLUMN reserved_at DATETIME NULL AFTER status;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND COLUMN_NAME = 'disabled_at'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD COLUMN disabled_at DATETIME NULL AFTER assigned_at;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND COLUMN_NAME = 'updated_at'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
  END IF;

  ALTER TABLE virtual_accounts
    MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    MODIFY COLUMN member_id BIGINT UNSIGNED NULL,
    MODIFY COLUMN account_ref VARCHAR(100) NOT NULL,
    MODIFY COLUMN account_number VARCHAR(30) NOT NULL,
    MODIFY COLUMN account_name VARCHAR(150) NULL,
    MODIFY COLUMN bank_name VARCHAR(100) NULL,
    MODIFY COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'NOMBA',
    MODIFY COLUMN environment VARCHAR(20) NULL DEFAULT 'SANDBOX',
    MODIFY COLUMN status VARCHAR(20) NULL DEFAULT 'AVAILABLE',
    MODIFY COLUMN reserved_at DATETIME NULL,
    MODIFY COLUMN assigned_at DATETIME NULL,
    MODIFY COLUMN disabled_at DATETIME NULL,
    MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

  UPDATE virtual_accounts
  SET environment = 'SANDBOX'
  WHERE environment IS NULL OR environment = '';

  UPDATE virtual_accounts
  SET status = CASE
    WHEN member_id IS NOT NULL THEN 'ASSIGNED'
    WHEN LOWER(status) = 'reserved' THEN 'RESERVED'
    WHEN LOWER(status) = 'assigned' THEN 'ASSIGNED'
    WHEN LOWER(status) = 'disabled' THEN 'DISABLED'
    WHEN LOWER(status) = 'available' THEN 'AVAILABLE'
    WHEN status IS NULL OR status = '' THEN 'AVAILABLE'
    ELSE status
  END;

  SELECT COUNT(*) INTO invalid_count
  FROM virtual_accounts
  WHERE environment NOT IN ('SANDBOX', 'PRODUCTION')
     OR status NOT IN ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'DISABLED');

  IF invalid_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot migrate virtual_accounts: invalid environment or status value exists.';
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM virtual_accounts va
  LEFT JOIN members m ON m.id = va.member_id
  WHERE va.member_id IS NOT NULL
    AND m.id IS NULL;

  IF invalid_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot migrate virtual_accounts: member_id references a missing member.';
  END IF;

  ALTER TABLE virtual_accounts
    MODIFY COLUMN environment ENUM('SANDBOX', 'PRODUCTION') NOT NULL DEFAULT 'SANDBOX',
    MODIFY COLUMN status ENUM('AVAILABLE', 'RESERVED', 'ASSIGNED', 'DISABLED') NOT NULL DEFAULT 'AVAILABLE';

  ALTER TABLE virtual_accounts
    ENGINE=InnoDB,
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'uq_virtual_accounts_account_ref'
      AND NON_UNIQUE = 1
  ) THEN
    ALTER TABLE virtual_accounts
      DROP INDEX uq_virtual_accounts_account_ref;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'uq_virtual_accounts_account_ref'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD UNIQUE KEY uq_virtual_accounts_account_ref (account_ref);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'uq_virtual_accounts_account_number'
      AND NON_UNIQUE = 1
  ) THEN
    ALTER TABLE virtual_accounts
      DROP INDEX uq_virtual_accounts_account_number;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'uq_virtual_accounts_account_number'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD UNIQUE KEY uq_virtual_accounts_account_number (account_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'idx_virtual_accounts_status'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD KEY idx_virtual_accounts_status (status);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'idx_virtual_accounts_member_id'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD KEY idx_virtual_accounts_member_id (member_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'idx_virtual_accounts_account_ref'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD KEY idx_virtual_accounts_account_ref (account_ref);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'idx_virtual_accounts_account_number'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD KEY idx_virtual_accounts_account_number (account_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_virtual_accounts_member'
      AND TABLE_NAME = 'virtual_accounts'
  ) THEN
    ALTER TABLE virtual_accounts
      ADD CONSTRAINT fk_virtual_accounts_member
        FOREIGN KEY (member_id) REFERENCES members(id)
        ON DELETE SET NULL;
  END IF;
END$$

DELIMITER ;

CALL migrate_virtual_accounts_pool();

DROP PROCEDURE IF EXISTS migrate_virtual_accounts_pool;
