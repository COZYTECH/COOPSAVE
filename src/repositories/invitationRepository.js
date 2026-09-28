const { pool } = require('../config/database');

const invitationColumns = `
  gi.id,
  gi.cooperative_id,
  gi.token_hash,
  gi.created_by,
  gi.expires_at,
  gi.max_uses,
  gi.uses,
  gi.status,
  gi.created_at,
  gi.updated_at,
  c.name AS cooperative_name
`;

const create = async ({ cooperativeId, tokenHash, createdBy, expiresAt, maxUses }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO group_invitations (
        cooperative_id,
        token_hash,
        created_by,
        expires_at,
        max_uses
      )
      VALUES (
        :cooperativeId,
        :tokenHash,
        :createdBy,
        :expiresAt,
        :maxUses
      )
    `,
    { cooperativeId, tokenHash, createdBy, expiresAt, maxUses }
  );

  return findById(result.insertId, db);
};

const findById = async (id, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${invitationColumns}
      FROM group_invitations gi
      INNER JOIN cooperatives c ON c.id = gi.cooperative_id
      WHERE gi.id = :id
      LIMIT 1
    `,
    { id }
  );

  return rows[0] || null;
};

// Lock the invitation row so two concurrent joins cannot exceed max_uses.
const findByTokenHash = async (tokenHash, db = pool, forUpdate = false) => {
  const lockClause = forUpdate ? 'FOR UPDATE' : '';
  const [rows] = await db.execute(
    `
      SELECT ${invitationColumns}
      FROM group_invitations gi
      INNER JOIN cooperatives c ON c.id = gi.cooperative_id
      WHERE gi.token_hash = :tokenHash
      LIMIT 1
      ${lockClause}
    `,
    { tokenHash }
  );

  return rows[0] || null;
};

const incrementUsage = async (id, db = pool) => {
  const [result] = await db.execute(
    `
      UPDATE group_invitations
      SET
        uses = uses + 1,
        status = CASE WHEN uses >= max_uses - 1 THEN 'USED' ELSE status END
      WHERE id = :id
        AND status = 'ACTIVE'
        AND uses < max_uses
    `,
    { id }
  );

  return result.affectedRows > 0;
};

module.exports = {
  create,
  findById,
  findByTokenHash,
  incrementUsage
};
