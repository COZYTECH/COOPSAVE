-- Remove legacy duplicate unique indexes left by older virtual_accounts schemas.
-- The canonical unique constraints are uq_virtual_accounts_account_ref and
-- uq_virtual_accounts_account_number; dropping these old index names preserves
-- all data and leaves the table shape aligned with the repository model.

DROP PROCEDURE IF EXISTS cleanup_virtual_account_pool_indexes;

DELIMITER $$

CREATE PROCEDURE cleanup_virtual_account_pool_indexes()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'uq_virtual_accounts_account_ref'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'account_ref'
  ) THEN
    ALTER TABLE virtual_accounts
      DROP INDEX account_ref;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'uq_virtual_accounts_account_number'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'virtual_accounts'
      AND INDEX_NAME = 'account_number'
  ) THEN
    ALTER TABLE virtual_accounts
      DROP INDEX account_number;
  END IF;
END$$

DELIMITER ;

CALL cleanup_virtual_account_pool_indexes();

DROP PROCEDURE IF EXISTS cleanup_virtual_account_pool_indexes;
