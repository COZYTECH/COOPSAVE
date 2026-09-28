const { pool } = require('../config/database');

const columns = `
  n.id,
  n.user_id,
  n.cooperative_id,
  n.cycle_id,
  n.obligation_id,
  n.type,
  n.title,
  n.body,
  n.action_path,
  n.read_at,
  n.created_at
`;

const createDueNotifications = async (asOfDate, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT IGNORE INTO notifications (
        user_id,
        cooperative_id,
        cycle_id,
        obligation_id,
        type,
        title,
        body,
        action_path
      )
      SELECT
        cm.user_id,
        ac.cooperative_id,
        co.cycle_id,
        co.id,
        'CONTRIBUTION_DUE',
        CONCAT('Contribution due for ', ac.name),
        CONCAT('Your ', co.currency, ' ', FORMAT(co.amount_outstanding, 2), ' contribution for ', ac.name, ' is due.',
          CASE WHEN co.due_at IS NOT NULL THEN CONCAT(' Due date: ', DATE_FORMAT(co.due_at, '%Y-%m-%d'), '.') ELSE '' END),
        CONCAT('/groups/', ac.cooperative_id, '/cycles/', ac.id)
      FROM contribution_obligations co
      INNER JOIN ajo_cycles ac ON ac.id = co.cycle_id
      INNER JOIN cooperative_memberships cm ON cm.id = co.membership_id
      WHERE co.status IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND co.amount_outstanding > 0
        AND DATE(co.due_at) <= DATE(:asOfDate)
    `,
    { asOfDate }
  );
  return result.affectedRows;
};

const findForUser = async (userId, { limit = 30, unreadOnly = false } = {}, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM notifications n
      WHERE n.user_id = :userId
        ${unreadOnly ? 'AND n.read_at IS NULL' : ''}
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ${Math.min(Math.max(Number(limit) || 30, 1), 100)}
    `,
    { userId }
  );
  return rows;
};

const markRead = async (id, userId, db = pool) => {
  await db.execute(
    `UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = :id AND user_id = :userId`,
    { id, userId }
  );
  const [rows] = await db.execute(
    `SELECT ${columns} FROM notifications n WHERE n.id = :id AND n.user_id = :userId LIMIT 1`,
    { id, userId }
  );
  return rows[0] || null;
};

module.exports = {
  createDueNotifications,
  findForUser,
  markRead
};
