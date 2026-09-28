const { pool } = require('../config/database');

const transactionColumns = `
  id,
  request_id,
  transaction_id,
  member_id,
  amount,
  sender_name,
  narration,
  event_type,
  status,
  created_at
`;

const create = async (
  {
    requestId,
    transactionId,
    memberId,
    amount,
    senderName,
    narration,
    eventType,
    status
  },
  db = pool
) => {
  const [result] = await db.execute(
    `
      INSERT INTO transactions (
        request_id,
        transaction_id,
        member_id,
        amount,
        sender_name,
        narration,
        event_type,
        status
      )
      VALUES (
        :requestId,
        :transactionId,
        :memberId,
        :amount,
        :senderName,
        :narration,
        :eventType,
        :status
      )
    `,
    {
      requestId,
      transactionId: transactionId || null,
      memberId,
      amount,
      senderName: senderName || null,
      narration: narration || null,
      eventType,
      status
    }
  );

  return findById(result.insertId, db);
};

const findById = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${transactionColumns}
      FROM transactions
      WHERE id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

const findByRequestId = async (requestId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${transactionColumns}
      FROM transactions
      WHERE request_id = :requestId
      LIMIT 1
    `,
    { requestId }
  );

  return rows[0] || null;
};

const findByTransactionReference = async (transactionReference, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${transactionColumns}
      FROM transactions
      WHERE transaction_id = :transactionReference
      LIMIT 1
    `,
    { transactionReference }
  );

  return rows[0] || null;
};

const findAllByOwnerId = async (ownerId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        t.id,
        t.request_id,
        t.transaction_id,
        t.member_id,
        t.amount,
        t.sender_name,
        t.narration,
        t.event_type,
        t.status,
        t.created_at,
        m.full_name AS member_name,
        m.account_ref,
        c.name AS cooperative_name
      FROM transactions t
      INNER JOIN members m ON m.id = t.member_id
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      WHERE c.owner_id = :ownerId
      ORDER BY t.created_at DESC
    `,
    { ownerId }
  );

  return rows;
};

// Reconciliation is group-scoped: owners and explicit group administrators can review it.
const findAllByManagerId = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        t.id,
        t.request_id,
        t.transaction_id,
        t.member_id,
        t.amount,
        t.sender_name,
        t.narration,
        t.event_type,
        t.status,
        t.created_at,
        m.full_name AS member_name,
        m.account_ref,
        c.name AS cooperative_name
      FROM transactions t
      INNER JOIN members m ON m.id = t.member_id
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      LEFT JOIN cooperative_memberships gm
        ON gm.cooperative_id = c.id AND gm.user_id = :userId
      WHERE c.owner_id = :userId OR gm.role = 'GROUP_ADMIN'
      ORDER BY t.created_at DESC
    `,
    { userId }
  );

  return rows;
};

// Platform reconciliation intentionally has no group-owner filter.
const findAll = async (db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        t.id,
        t.request_id,
        t.transaction_id,
        t.member_id,
        t.amount,
        t.sender_name,
        t.narration,
        t.event_type,
        t.status,
        t.created_at,
        m.full_name AS member_name,
        m.account_ref,
        c.name AS cooperative_name
      FROM transactions t
      INNER JOIN members m ON m.id = t.member_id
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      ORDER BY t.created_at DESC
    `
  );

  return rows;
};

module.exports = {
  create,
  findById,
  findByRequestId,
  findByTransactionReference,
  findAllByOwnerId,
  findAllByManagerId,
  findAll
};
