const { pool } = require('../config/database');

const cooperativeColumns = `
  c.id,
  c.name,
  c.description,
  c.owner_id,
  c.created_at
`;

const create = async ({ name, description = null, ownerId }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO cooperatives (name, description, owner_id)
      VALUES (:name, :description, :ownerId)
    `,
    { name, description, ownerId }
  );

  return findById(result.insertId, db);
};

const findAllByOwnerId = async (ownerId) => {
  const [rows] = await pool.execute(
    `
      SELECT ${cooperativeColumns}
      FROM cooperatives c
      WHERE owner_id = :ownerId
      ORDER BY created_at DESC
    `,
    { ownerId }
  );

  return rows;
};

// Return cooperatives the user owns or belongs to through the group role model.
const findAllByUserId = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT DISTINCT ${cooperativeColumns}
      FROM cooperatives c
      LEFT JOIN cooperative_memberships gm
        ON gm.cooperative_id = c.id AND gm.user_id = :userId
      WHERE c.owner_id = :userId OR gm.user_id IS NOT NULL
      ORDER BY c.created_at DESC
    `,
    { userId }
  );

  return rows;
};

const findById = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${cooperativeColumns}
      FROM cooperatives c
      WHERE id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

const findByIdAndOwnerId = async (id, ownerId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${cooperativeColumns}
      FROM cooperatives c
      WHERE id = :id AND owner_id = :ownerId
      LIMIT 1
    `,
    { id, ownerId }
  );

  return rows[0] || null;
};

// Read access is available to any explicit group member or the legacy owner.
const findByIdAndUserId = async (id, userId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT DISTINCT ${cooperativeColumns}
      FROM cooperatives c
      LEFT JOIN cooperative_memberships gm
        ON gm.cooperative_id = c.id AND gm.user_id = :userId
      WHERE c.id = :id
        AND (c.owner_id = :userId OR gm.user_id IS NOT NULL)
      LIMIT 1
    `,
    { id, userId }
  );

  return rows[0] || null;
};

// Management operations require ownership or the explicit GROUP_ADMIN role.
const findByIdAndManagerId = async (id, userId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT DISTINCT ${cooperativeColumns}
      FROM cooperatives c
      LEFT JOIN cooperative_memberships gm
        ON gm.cooperative_id = c.id AND gm.user_id = :userId
      WHERE c.id = :id
        AND (c.owner_id = :userId OR gm.role = 'GROUP_ADMIN')
      LIMIT 1
    `,
    { id, userId }
  );

  return rows[0] || null;
};

const updateById = async (id, { name, description }, db = pool) => {
  await db.execute(
    `
      UPDATE cooperatives
      SET
        name = COALESCE(:name, name),
        description = :description
      WHERE id = :id
    `,
    { id, name: name || null, description: description || null }
  );

  return findById(id, db);
};

const deleteById = async (id, db = pool) => {
  const [result] = await db.execute(
    `
      DELETE FROM cooperatives
      WHERE id = :id
    `,
    { id }
  );

  return result.affectedRows > 0;
};

module.exports = {
  create,
  findAllByOwnerId,
  findAllByUserId,
  findById,
  findByIdAndOwnerId,
  findByIdAndUserId,
  findByIdAndManagerId,
  updateById,
  deleteById
};
