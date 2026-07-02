const { pool } = require('../config/database');

const addContribution = async ({ memberId, amount, transactionId }, db = pool) => {
  await db.execute(
    `
      INSERT INTO contributions (member_id, total_amount, last_transaction_id)
      VALUES (:memberId, :amount, :transactionId)
      ON DUPLICATE KEY UPDATE
        total_amount = total_amount + VALUES(total_amount),
        last_transaction_id = VALUES(last_transaction_id),
        updated_at = CURRENT_TIMESTAMP
    `,
    { memberId, amount, transactionId }
  );
};

const findAllByOwnerId = async (ownerId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        co.id,
        co.member_id,
        co.total_amount,
        co.last_transaction_id,
        co.created_at,
        co.updated_at,
        m.full_name AS member_name,
        m.account_ref,
        c.name AS cooperative_name
      FROM contributions co
      INNER JOIN members m ON m.id = co.member_id
      INNER JOIN cooperatives c ON c.id = m.cooperative_id
      WHERE c.owner_id = :ownerId
      ORDER BY co.updated_at DESC
    `,
    { ownerId }
  );

  return rows;
};

module.exports = {
  addContribution,
  findAllByOwnerId
};
