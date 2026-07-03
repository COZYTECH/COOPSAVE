const indexExists = async (db, indexName) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'webhook_events'
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [indexName]
  );

  return rows.length > 0;
};

const addIndexIfMissing = async (db, indexName, sql) => {
  if (!(await indexExists(db, indexName))) {
    await db.query(sql);
  }
};

const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      provider VARCHAR(50) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_id VARCHAR(150) NULL,
      account_ref VARCHAR(100) NULL,
      transaction_reference VARCHAR(150) NULL,
      processing_status ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await addIndexIfMissing(
    db,
    'uq_webhook_events_provider_event_id',
    'ALTER TABLE webhook_events ADD UNIQUE KEY uq_webhook_events_provider_event_id (provider, event_id)'
  );
  await addIndexIfMissing(
    db,
    'uq_webhook_events_provider_transaction_reference',
    'ALTER TABLE webhook_events ADD UNIQUE KEY uq_webhook_events_provider_transaction_reference (provider, transaction_reference)'
  );
  await addIndexIfMissing(
    db,
    'idx_webhook_events_provider',
    'ALTER TABLE webhook_events ADD KEY idx_webhook_events_provider (provider)'
  );
  await addIndexIfMissing(
    db,
    'idx_webhook_events_event_type',
    'ALTER TABLE webhook_events ADD KEY idx_webhook_events_event_type (event_type)'
  );
  await addIndexIfMissing(
    db,
    'idx_webhook_events_account_ref',
    'ALTER TABLE webhook_events ADD KEY idx_webhook_events_account_ref (account_ref)'
  );
  await addIndexIfMissing(
    db,
    'idx_webhook_events_processing_status',
    'ALTER TABLE webhook_events ADD KEY idx_webhook_events_processing_status (processing_status)'
  );
  await addIndexIfMissing(
    db,
    'idx_webhook_events_received_at',
    'ALTER TABLE webhook_events ADD KEY idx_webhook_events_received_at (received_at)'
  );
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS webhook_events');
};

module.exports = {
  up,
  down
};
