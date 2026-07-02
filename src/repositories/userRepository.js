const { pool } = require('../config/database');

const userColumns = `
  id,
  name,
  email,
  password_hash,
  role,
  is_active,
  created_at,
  updated_at
`;

const create = async ({ name, email, passwordHash }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO users (name, email, password_hash)
      VALUES (:name, :email, :passwordHash)
    `,
    { name, email, passwordHash }
  );

  return findById(result.insertId);
};

const findById = async (id) => {
  const [rows] = await pool.execute(
    `
      SELECT ${userColumns}
      FROM users
      WHERE id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await pool.execute(
    `
      SELECT ${userColumns}
      FROM users
      WHERE email = :email
      LIMIT 1
    `,
    { email }
  );

  return rows[0] || null;
};

module.exports = {
  create,
  findById,
  findByEmail
};
