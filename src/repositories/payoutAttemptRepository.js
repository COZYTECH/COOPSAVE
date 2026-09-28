const { pool } = require('../config/database');

const columns = `
  pa.id,
  pa.payout_id,
  pa.attempt_number,
  pa.provider,
  pa.provider_transfer_id,
  pa.provider_reference,
  pa.status,
  pa.request_metadata,
  pa.response_metadata,
  pa.failure_reason,
  pa.created_at,
  pa.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `SELECT ${columns} FROM payout_attempts pa WHERE pa.id = :id LIMIT 1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    { id }
  );
  return rows[0] || null;
};

const findLatestByPayoutId = async (payoutId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payout_attempts pa
      WHERE pa.payout_id = :payoutId
      ORDER BY pa.attempt_number DESC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { payoutId }
  );
  return rows[0] || null;
};

const findByProviderIdentifiers = async ({ provider, providerTransferId = null, providerReference = null }, db = pool, forUpdate = false) => {
  const conditions = [];
  const params = { provider };
  if (providerTransferId) {
    conditions.push('pa.provider_transfer_id = :providerTransferId');
    params.providerTransferId = providerTransferId;
  }
  if (providerReference) {
    conditions.push('pa.provider_reference = :providerReference');
    params.providerReference = providerReference;
  }
  if (!conditions.length) return null;
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM payout_attempts pa
      WHERE pa.provider = :provider
        AND (${conditions.join(' OR ')})
      ORDER BY pa.id ASC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    params
  );
  return rows[0] || null;
};

const create = async ({ payoutId, attemptNumber, provider = 'FLUTTERWAVE', providerReference, status = 'INITIATED', requestMetadata = {} }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO payout_attempts (
        payout_id, attempt_number, provider, provider_reference, status, request_metadata
      )
      VALUES (:payoutId, :attemptNumber, :provider, :providerReference, :status, :requestMetadata)
    `,
    {
      payoutId,
      attemptNumber,
      provider,
      providerReference,
      status,
      requestMetadata: JSON.stringify(requestMetadata)
    }
  );
  return findById(result.insertId, db);
};

const updateProviderData = async (id, { providerTransferId = null, status, responseMetadata = {}, failureReason = null }, db = pool) => {
  await db.execute(
    `
      UPDATE payout_attempts
      SET provider_transfer_id = COALESCE(:providerTransferId, provider_transfer_id),
        status = :status,
        response_metadata = :responseMetadata,
        failure_reason = :failureReason
      WHERE id = :id
    `,
    {
      id,
      providerTransferId,
      status,
      responseMetadata: JSON.stringify(responseMetadata),
      failureReason
    }
  );
  return findById(id, db);
};

module.exports = {
  findById,
  findLatestByPayoutId,
  findByProviderIdentifiers,
  create,
  updateProviderData
};
