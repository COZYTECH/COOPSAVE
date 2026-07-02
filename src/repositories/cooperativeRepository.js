const { pool } = require('../config/database');

const cooperativeColumns = `
  id,
  name,
  description,
  owner_id,
  created_at
`;

const create = async ({ name, description = null, ownerId }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO cooperatives (name, description, owner_id)
      VALUES (:name, :description, :ownerId)
    `,
    { name, description, ownerId }
  );

  return findById(result.insertId);
};

const findAllByOwnerId = async (ownerId) => {
  const [rows] = await pool.execute(
    `
      SELECT ${cooperativeColumns}
      FROM cooperatives
      WHERE owner_id = :ownerId
      ORDER BY created_at DESC
    `,
    { ownerId }
  );

  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.execute(
    `
      SELECT ${cooperativeColumns}
      FROM cooperatives
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
      FROM cooperatives
      WHERE id = :id AND owner_id = :ownerId
      LIMIT 1
    `,
    { id, ownerId }
  );

  return rows[0] || null;
};

const updateById = async (id, { name, description }) => {
  await pool.execute(
    `
      UPDATE cooperatives
      SET
        name = COALESCE(:name, name),
        description = :description
      WHERE id = :id
    `,
    { id, name: name || null, description: description || null }
  );

  return findById(id);
};

const deleteById = async (id) => {
  const [result] = await pool.execute(
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
  findById,
  findByIdAndOwnerId,
  updateById,
  deleteById
};
