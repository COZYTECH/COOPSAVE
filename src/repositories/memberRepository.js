const { pool } = require('../config/database');

const memberColumns = `
  m.id,
  m.cooperative_id,
  m.full_name,
  m.email,
  m.phone,
  m.account_ref,
  m.account_number,
  m.account_name,
  m.created_at
`;

const create = async ({
  cooperativeId,
  fullName,
  email,
  phone,
  accountRef,
  accountNumber,
  accountName
}, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO members (
        cooperative_id,
        full_name,
        email,
        phone,
        account_ref,
        account_number,
        account_name
      )
      VALUES (
        :cooperativeId,
        :fullName,
        :email,
        :phone,
        :accountRef,
        :accountNumber,
        :accountName
      )
    `,
    {
      cooperativeId,
      fullName,
      email,
      phone,
      accountRef,
      accountNumber,
      accountName
    }
  );

  return findById(result.insertId, db);
};

const findAllByOwnerId = async (ownerId) => {
  const [rows] = await pool.execute(
    `
      SELECT ${memberColumns}
      FROM members m
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      WHERE c.owner_id = :ownerId
      ORDER BY m.created_at DESC
    `,
    { ownerId }
  );

  return rows;
};

const findById = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${memberColumns}
      FROM members m
      WHERE m.id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

const findByIdAndOwnerId = async (id, ownerId) => {
  const [rows] = await pool.execute(
    `
      SELECT ${memberColumns}
      FROM members m
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      WHERE m.id = :id AND c.owner_id = :ownerId
      LIMIT 1
    `,
    { id, ownerId }
  );

  return rows[0] || null;
};

const findByEmailInCooperative = async (email, cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${memberColumns}
      FROM members m
      WHERE m.email = :email AND m.cooperative_id = :cooperativeId
      LIMIT 1
    `,
    { email, cooperativeId }
  );

  return rows[0] || null;
};

const findByAccountRef = async (accountRef, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${memberColumns},
        c.owner_id
      FROM members m
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      WHERE m.account_ref = :accountRef
      LIMIT 1
    `,
    { accountRef }
  );

  return rows[0] || null;
};

const findAssignedAccountRefs = async () => {
  const [rows] = await pool.execute(
    `
      SELECT account_ref
      FROM members
      WHERE account_ref IS NOT NULL
    `
  );

  return rows.map((row) => row.account_ref);
};

const updateById = async (
  id,
  {
    cooperativeId,
    fullName,
    email,
    phone,
    accountRef,
    accountNumber,
    accountName
  }
) => {
  await pool.execute(
    `
      UPDATE members
      SET
        cooperative_id = COALESCE(:cooperativeId, cooperative_id),
        full_name = COALESCE(:fullName, full_name),
        email = COALESCE(:email, email),
        phone = COALESCE(:phone, phone),
        account_ref = COALESCE(:accountRef, account_ref),
        account_number = COALESCE(:accountNumber, account_number),
        account_name = COALESCE(:accountName, account_name)
      WHERE id = :id
    `,
    {
      id,
      cooperativeId: cooperativeId || null,
      fullName: fullName || null,
      email: email || null,
      phone: phone || null,
      accountRef: accountRef || null,
      accountNumber: accountNumber || null,
      accountName: accountName || null
    }
  );

  return findById(id);
};

const deleteById = async (id) => {
  const [result] = await pool.execute(
    `
      DELETE FROM members
      WHERE id = :id
    `,
    { id }
  );

  return result.affectedRows > 0;
};

module.exports = {
  create,
  findAllByOwnerId,
  findById,
  findByIdAndOwnerId,
  findByEmailInCooperative,
  findByAccountRef,
  findAssignedAccountRefs,
  updateById,
  deleteById
};
