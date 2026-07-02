const { pool } = require('../config/database');

const create = async ({ requestId, payload }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO webhook_logs (request_id, payload, processed)
      VALUES (:requestId, :payload, 0)
    `,
    {
      requestId: requestId || null,
      payload: JSON.stringify(payload)
    }
  );

  return findById(result.insertId, db);
};

const findById = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT id, request_id, payload, processed, created_at
      FROM webhook_logs
      WHERE id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

const markProcessed = async (id, db = pool) => {
  await db.execute(
    `
      UPDATE webhook_logs
      SET processed = 1
      WHERE id = :id
    `,
    { id }
  );
};

const accountRefExpression = `
  JSON_UNQUOTE(
    COALESCE(
      JSON_EXTRACT(w.payload, '$.account_ref'),
      JSON_EXTRACT(w.payload, '$.accountRef'),
      JSON_EXTRACT(w.payload, '$.account_reference'),
      JSON_EXTRACT(w.payload, '$.accountReference'),
      JSON_EXTRACT(w.payload, '$.data.account_ref'),
      JSON_EXTRACT(w.payload, '$.data.accountRef'),
      JSON_EXTRACT(w.payload, '$.data.account_reference'),
      JSON_EXTRACT(w.payload, '$.data.accountReference'),
      JSON_EXTRACT(w.payload, '$.data.virtual_account.account_ref'),
      JSON_EXTRACT(w.payload, '$.data.virtual_account.accountRef'),
      JSON_EXTRACT(w.payload, '$.data.virtual_account.reference'),
      JSON_EXTRACT(w.payload, '$.data.virtualAccount.account_ref'),
      JSON_EXTRACT(w.payload, '$.data.virtualAccount.accountRef'),
      JSON_EXTRACT(w.payload, '$.data.virtualAccount.reference')
    )
  )
`;

const findMissingByOwnerId = async (ownerId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        w.id,
        w.request_id,
        w.payload,
        w.processed,
        w.created_at,
        ${accountRefExpression} AS account_ref,
        m.id AS member_id,
        m.full_name AS member_name,
        c.name AS cooperative_name
      FROM webhook_logs w
      INNER JOIN members m ON m.account_ref = ${accountRefExpression}
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      LEFT JOIN transactions t ON t.request_id = w.request_id
      WHERE c.owner_id = :ownerId
        AND t.id IS NULL
        AND w.processed = 1
      ORDER BY w.created_at DESC
    `,
    { ownerId }
  );

  return rows;
};

const findFailedByOwnerId = async (ownerId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        w.id,
        w.request_id,
        w.payload,
        w.processed,
        w.created_at,
        ${accountRefExpression} AS account_ref,
        m.id AS member_id,
        m.full_name AS member_name,
        c.name AS cooperative_name
      FROM webhook_logs w
      INNER JOIN members m ON m.account_ref = ${accountRefExpression}
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      WHERE c.owner_id = :ownerId
        AND w.processed = 0
      ORDER BY w.created_at DESC
    `,
    { ownerId }
  );

  return rows;
};

module.exports = {
  create,
  findById,
  markProcessed,
  findMissingByOwnerId,
  findFailedByOwnerId
};
