const up = async (db) => {
  await db.query(`
    ALTER TABLE webhook_events
      MODIFY COLUMN processing_status ENUM(
        'PENDING',
        'PROCESSING',
        'PROCESSED',
        'FAILED',
        'IDENTITY_RESOLVED',
        'RECONCILIATION_REQUIRED'
      ) NOT NULL DEFAULT 'PENDING'
  `);
};

const down = async (db) => {
  await db.query(`
    UPDATE webhook_events
    SET processing_status = 'FAILED'
    WHERE processing_status IN ('IDENTITY_RESOLVED', 'RECONCILIATION_REQUIRED')
  `);
  await db.query(`
    ALTER TABLE webhook_events
      MODIFY COLUMN processing_status ENUM(
        'PENDING',
        'PROCESSING',
        'PROCESSED',
        'FAILED'
      ) NOT NULL DEFAULT 'PENDING'
  `);
};

module.exports = { up, down };
