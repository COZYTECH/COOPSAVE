const { pool } = require('../config/database');

const membershipColumns = `
  gm.id,
  gm.cooperative_id,
  gm.user_id,
  gm.role,
  gm.created_at,
  gm.updated_at,
  c.name AS cooperative_name,
  c.description AS cooperative_description,
  c.owner_id
`;

// Return every group a user belongs to, including the group's current owner.
const findByUserId = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${membershipColumns}
      FROM cooperative_memberships gm
      INNER JOIN cooperatives c ON c.id = gm.cooperative_id
      WHERE gm.user_id = :userId
      ORDER BY gm.created_at DESC
    `,
    { userId }
  );

  return rows;
};

// Resolve one user's role inside one cooperative.
const findByUserAndCooperative = async (userId, cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${membershipColumns}
      FROM cooperative_memberships gm
      INNER JOIN cooperatives c ON c.id = gm.cooperative_id
      WHERE gm.user_id = :userId AND gm.cooperative_id = :cooperativeId
      LIMIT 1
    `,
    { userId, cooperativeId }
  );

  return rows[0] || null;
};

// Load the membership and its user identity for provider provisioning. The
// membership remains the authoritative group-scoped payment relationship.
const findByIdWithUser = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        gm.id,
        gm.cooperative_id,
        gm.user_id,
        gm.role,
        u.name,
        u.email,
        c.name AS cooperative_name
      FROM cooperative_memberships gm
      INNER JOIN users u ON u.id = gm.user_id
      INNER JOIN cooperatives c ON c.id = gm.cooperative_id
      WHERE gm.id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

// Return authenticated users who belong to one cooperative. The membership
// table is the source of truth for group identity; legacy member records are
// intentionally not used for authorization or this directory.
const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        gm.id,
        gm.cooperative_id,
        gm.user_id,
        gm.role,
        gm.created_at,
        u.name AS full_name,
        u.email
      FROM cooperative_memberships gm
      INNER JOIN users u ON u.id = gm.user_id
      WHERE gm.cooperative_id = :cooperativeId
      ORDER BY gm.created_at ASC
    `,
    { cooperativeId }
  );

  return rows;
};

// Group-admin access includes the cooperative owner for backward compatibility.
const hasGroupAdminAccess = async (userId, cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM cooperatives c
      LEFT JOIN cooperative_memberships gm
        ON gm.cooperative_id = c.id AND gm.user_id = :userId
      WHERE c.id = :cooperativeId
        AND (c.owner_id = :userId OR gm.role = 'GROUP_ADMIN')
      LIMIT 1
    `,
    { userId, cooperativeId }
  );

  return rows.length > 0;
};

// This write helper is intentionally small; invitation workflows can build on it later.
const upsert = async ({ cooperativeId, userId, role = 'GROUP_MEMBER' }, db = pool) => {
  await db.execute(
    `
      INSERT INTO cooperative_memberships (cooperative_id, user_id, role)
      VALUES (:cooperativeId, :userId, :role)
      ON DUPLICATE KEY UPDATE role = VALUES(role)
    `,
    { cooperativeId, userId, role }
  );

  return findByUserAndCooperative(userId, cooperativeId, db);
};

const create = async ({ cooperativeId, userId, role }, db = pool) => {
  await db.execute(
    `
      INSERT INTO cooperative_memberships (cooperative_id, user_id, role)
      VALUES (:cooperativeId, :userId, :role)
    `,
    { cooperativeId, userId, role }
  );

  return findByUserAndCooperative(userId, cooperativeId, db);
};

module.exports = {
  findByUserId,
  findByUserAndCooperative,
  findByIdWithUser,
  findAllByCooperativeId,
  hasGroupAdminAccess,
  upsert,
  create
};
