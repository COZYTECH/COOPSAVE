DROP PROCEDURE IF EXISTS add_unique_transaction_reference;

DELIMITER $$

CREATE PROCEDURE add_unique_transaction_reference()
BEGIN
  DECLARE duplicate_count INT DEFAULT 0;

  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT transaction_id
    FROM transactions
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id
    HAVING COUNT(*) > 1
  ) duplicate_transaction_references;

  IF duplicate_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot add unique transaction reference: duplicate transaction_id values exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND INDEX_NAME = 'uq_transactions_transaction_id'
  ) THEN
    ALTER TABLE transactions
      ADD UNIQUE KEY uq_transactions_transaction_id (transaction_id);
  END IF;
END$$

DELIMITER ;

CALL add_unique_transaction_reference();

DROP PROCEDURE IF EXISTS add_unique_transaction_reference;
