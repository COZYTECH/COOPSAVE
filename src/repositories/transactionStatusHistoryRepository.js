const { pool } = require('../config/database');

const create = async ({ paymentTransactionId, previousStatus, newStatus, actorType = 'SYSTEM', actorUserId = null, reason = null }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO payment_transaction_status_history (
        payment_transaction_id,
        previous_status,
        new_status,
        actor_type,
        actor_user_id,
        reason
      )
      VALUES (:paymentTransactionId, :previousStatus, :newStatus, :actorType, :actorUserId, :reason)
    `,
    { paymentTransactionId, previousStatus, newStatus, actorType, actorUserId, reason }
  );
  return result.insertId;
};

module.exports = { create };
