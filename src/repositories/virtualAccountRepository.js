const { pool } = require('../config/database');

const virtualAccountColumns = `
  id,
  member_id,
  account_ref,
  account_number,
  account_name,
  bank_name,
  provider,
  environment,
  status,
  reserved_at,
  assigned_at,
  disabled_at,
  created_at,
  updated_at
`;

// Returns the first account currently available in the resource pool.
const findAvailable = async (connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT ${virtualAccountColumns}
      FROM virtual_accounts
      WHERE status = ?
      ORDER BY id ASC
      LIMIT 1
    `,
    ['AVAILABLE']
  );

  return rows[0] || null;
};

// Returns and locks the first available account for the current transaction.
const findAvailableForUpdate = async (connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT ${virtualAccountColumns}
      FROM virtual_accounts
      WHERE status = ?
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE
    `,
    ['AVAILABLE']
  );

  return rows[0] || null;
};

// Returns a single virtual account by primary key.
const findById = async (id, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT ${virtualAccountColumns}
      FROM virtual_accounts
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

// Returns the assigned virtual account for a member.
const findByMemberId = async (memberId, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT ${virtualAccountColumns}
      FROM virtual_accounts
      WHERE member_id = ? AND status = ?
      LIMIT 1
    `,
    [memberId, 'ASSIGNED']
  );

  return rows[0] || null;
};

// Returns a virtual account by its provider account reference.
const findByAccountRef = async (accountRef, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT ${virtualAccountColumns}
      FROM virtual_accounts
      WHERE account_ref = ?
      LIMIT 1
    `,
    [accountRef]
  );

  return rows[0] || null;
};

// Creates a virtual account resource-pool entry.
const create = async (
  {
    memberId = null,
    accountRef,
    accountNumber,
    accountName = null,
    bankName = null,
    provider = 'NOMBA',
    environment,
    status = 'AVAILABLE'
  },
  connection = pool
) => {
  const [result] = await connection.execute(
    `
      INSERT INTO virtual_accounts (
        member_id,
        account_ref,
        account_number,
        account_name,
        bank_name,
        provider,
        environment,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      memberId,
      accountRef,
      accountNumber,
      accountName,
      bankName,
      provider,
      environment,
      status
    ]
  );

  return findById(result.insertId, connection);
};

// Counts all virtual account resource-pool entries.
const count = async (connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS total
      FROM virtual_accounts
    `
  );

  return Number(rows[0].total);
};

// Marks an available account as reserved without assigning it to a member.
const reserveAccount = async (id, connection = pool) => {
  const [result] = await connection.execute(
    `
      UPDATE virtual_accounts
      SET status = ?, reserved_at = NOW()
      WHERE id = ?
    `,
    ['RESERVED', id]
  );

  return result.affectedRows;
};

// Assigns a reserved or available account to a member.
const assignAccount = async (id, memberId, connection = pool) => {
  const [result] = await connection.execute(
    `
      UPDATE virtual_accounts
      SET status = ?, member_id = ?, assigned_at = NOW()
      WHERE id = ?
    `,
    ['ASSIGNED', memberId, id]
  );

  return result.affectedRows;
};

// Releases an account back into the available pool.
const releaseAccount = async (id, connection = pool) => {
  const [result] = await connection.execute(
    `
      UPDATE virtual_accounts
      SET
        status = ?,
        member_id = NULL,
        reserved_at = NULL,
        assigned_at = NULL
      WHERE id = ?
    `,
    ['AVAILABLE', id]
  );

  return result.affectedRows;
};

// Disables an account so it cannot be allocated.
const disableAccount = async (id, connection = pool) => {
  const [result] = await connection.execute(
    `
      UPDATE virtual_accounts
      SET status = ?, disabled_at = NOW()
      WHERE id = ?
    `,
    ['DISABLED', id]
  );

  return result.affectedRows;
};

module.exports = {
  findAvailable,
  findAvailableForUpdate,
  findById,
  findByMemberId,
  findByAccountRef,
  create,
  count,
  reserveAccount,
  assignAccount,
  releaseAccount,
  disableAccount
};
