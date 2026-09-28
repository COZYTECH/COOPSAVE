const { pool } = require('../config/database');

const create = async ({ payoutId, previousStatus, newStatus, actorType = 'SYSTEM', actorUserId = null, reason = null, metadata = {} }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO payout_status_history (
        payout_id, previous_status, new_status, actor_type, actor_user_id, reason, metadata
      )
      VALUES (:payoutId, :previousStatus, :newStatus, :actorType, :actorUserId, :reason, :metadata)
    `,
    {
      payoutId,
      previousStatus,
      newStatus,
      actorType,
      actorUserId,
      reason,
      metadata: JSON.stringify(metadata)
    }
  );
  return result.insertId;
};

module.exports = { create };
