const { pool } = require('../config/database');

const webhookEventColumns = `
  id,
  provider,
  event_type,
  event_id,
  account_ref,
  transaction_reference,
  processing_status,
  received_at,
  raw_payload,
  created_at,
  updated_at
`;

const findById = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${webhookEventColumns}
      FROM webhook_events
      WHERE id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

const findDuplicate = async (
  { provider, eventId = null, transactionReference = null },
  db = pool
) => {
  const duplicateConditions = [];
  const params = { provider };

  if (eventId) {
    duplicateConditions.push('event_id = :eventId');
    params.eventId = eventId;
  }

  if (transactionReference) {
    duplicateConditions.push('transaction_reference = :transactionReference');
    params.transactionReference = transactionReference;
  }

  if (duplicateConditions.length === 0) {
    return null;
  }

  const [rows] = await db.execute(
    `
      SELECT ${webhookEventColumns}
      FROM webhook_events
      WHERE provider = :provider
        AND (${duplicateConditions.join(' OR ')})
      ORDER BY received_at ASC
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
};

const create = async (
  {
    provider,
    eventType,
    eventId = null,
    accountRef = null,
    transactionReference = null,
    processingStatus = 'PENDING',
    rawPayload
  },
  db = pool
) => {
  const [result] = await db.execute(
    `
      INSERT INTO webhook_events (
        provider,
        event_type,
        event_id,
        account_ref,
        transaction_reference,
        processing_status,
        raw_payload
      )
      VALUES (
        :provider,
        :eventType,
        :eventId,
        :accountRef,
        :transactionReference,
        :processingStatus,
        :rawPayload
      )
    `,
    {
      provider,
      eventType,
      eventId,
      accountRef,
      transactionReference,
      processingStatus,
      rawPayload: JSON.stringify(rawPayload)
    }
  );

  return findById(result.insertId, db);
};

const updateProcessingStatus = async (id, processingStatus, db = pool) => {
  await db.execute(
    `
      UPDATE webhook_events
      SET processing_status = :processingStatus
      WHERE id = :id
    `,
    { id, processingStatus }
  );

  return findById(id, db);
};

module.exports = {
  findById,
  findDuplicate,
  create,
  updateProcessingStatus
};
