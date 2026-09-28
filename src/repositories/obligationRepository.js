const { pool } = require('../config/database');

const columns = `
  co.id,
  co.cycle_id,
  co.cycle_member_id,
  co.membership_id,
  co.expected_amount,
  co.currency,
  co.due_at,
  co.status,
  co.amount_paid,
  co.amount_outstanding,
  co.amount_excess,
  co.created_at,
  co.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM contribution_obligations co
      WHERE co.id = :id
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { id }
  );
  return rows[0] || null;
};

const findByCycleAndMembership = async (cycleId, membershipId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM contribution_obligations co
      WHERE co.cycle_id = :cycleId AND co.membership_id = :membershipId
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { cycleId, membershipId }
  );
  return rows[0] || null;
};

const findByCycleMembershipDueAt = async (cycleId, membershipId, dueAt, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM contribution_obligations co
      WHERE co.cycle_id = :cycleId
        AND co.membership_id = :membershipId
        AND co.due_at = :dueAt
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { cycleId, membershipId, dueAt }
  );
  return rows[0] || null;
};

const findActiveByMembership = async (membershipId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}, ac.name AS cycle_name, ac.cycle_number, ac.cooperative_id
      FROM contribution_obligations co
      INNER JOIN ajo_cycles ac ON ac.id = co.cycle_id
      WHERE co.membership_id = :membershipId
        AND ac.status = 'ACTIVE'
        AND co.status IN ('PENDING', 'PARTIAL', 'OVERDUE', 'EXCESS_PENDING_REVIEW')
      ORDER BY ac.cycle_number DESC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { membershipId }
  );
  return rows[0] || null;
};

const findAllByCycleId = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        u.name AS member_name,
        u.email AS member_email
      FROM contribution_obligations co
      INNER JOIN cooperative_memberships gm ON gm.id = co.membership_id
      INNER JOIN users u ON u.id = gm.user_id
      WHERE co.cycle_id = :cycleId
      ORDER BY co.status, u.name
    `,
    { cycleId }
  );
  return rows;
};

const findAllByCycleAndMembershipId = async (cycleId, membershipId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${columns}
      FROM contribution_obligations co
      WHERE co.cycle_id = :cycleId AND co.membership_id = :membershipId
      ORDER BY co.due_at ASC, co.id ASC
    `,
    { cycleId, membershipId }
  );
  return rows;
};

const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        ac.name AS cycle_name,
        ac.cycle_number,
        ac.cooperative_id,
        u.name AS member_name,
        u.email AS member_email
      FROM contribution_obligations co
      INNER JOIN ajo_cycles ac ON ac.id = co.cycle_id
      INNER JOIN cooperative_memberships gm ON gm.id = co.membership_id
      INNER JOIN users u ON u.id = gm.user_id
      WHERE ac.cooperative_id = :cooperativeId
      ORDER BY ac.cycle_number DESC, u.name
    `,
    { cooperativeId }
  );
  return rows;
};

const findAllByUserId = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        ${columns},
        ac.name AS cycle_name,
        ac.cycle_number,
        ac.cooperative_id,
        c.name AS cooperative_name
      FROM contribution_obligations co
      INNER JOIN ajo_cycles ac ON ac.id = co.cycle_id
      INNER JOIN cooperatives c ON c.id = ac.cooperative_id
      INNER JOIN cooperative_memberships gm ON gm.id = co.membership_id
      WHERE gm.user_id = :userId
      ORDER BY ac.start_date DESC, ac.cycle_number DESC
    `,
    { userId }
  );
  return rows;
};

const create = async ({ cycleId, cycleMemberId, membershipId, expectedAmount, currency, dueAt }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO contribution_obligations (
        cycle_id,
        cycle_member_id,
        membership_id,
        expected_amount,
        currency,
        due_at,
        amount_outstanding
      )
      VALUES (:cycleId, :cycleMemberId, :membershipId, :expectedAmount, :currency, :dueAt, :expectedAmount)
    `,
    { cycleId, cycleMemberId, membershipId, expectedAmount, currency, dueAt: dueAt || null }
  );
  return findById(result.insertId, db);
};

// Schedule generation can safely be retried after a worker failure because
// the database uniqueness rule identifies one cycle/member/period obligation.
const createIfMissing = async (data, db = pool) => {
  await db.execute(
    `
      INSERT INTO contribution_obligations (
        cycle_id, cycle_member_id, membership_id, expected_amount, currency, due_at, amount_outstanding
      )
      VALUES (:cycleId, :cycleMemberId, :membershipId, :expectedAmount, :currency, :dueAt, :expectedAmount)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `,
    {
      cycleId: data.cycleId,
      cycleMemberId: data.cycleMemberId,
      membershipId: data.membershipId,
      expectedAmount: data.expectedAmount,
      currency: data.currency,
      dueAt: data.dueAt || null
    }
  );
  return findByCycleMembershipDueAt(data.cycleId, data.membershipId, data.dueAt, db);
};

const markOverdue = async (asOfDate, db = pool) => {
  const [result] = await db.execute(
    `
      UPDATE contribution_obligations co
      INNER JOIN ajo_cycles ac ON ac.id = co.cycle_id
      SET co.status = 'OVERDUE'
      WHERE co.status IN ('PENDING', 'PARTIAL')
        AND co.amount_outstanding > 0
        AND DATE(:asOfDate) > DATE_ADD(DATE(co.due_at), INTERVAL ac.grace_period_days DAY)
    `,
    { asOfDate }
  );
  return result.affectedRows;
};

const applyPayment = async (
  id,
  { amountPaid, amountOutstanding, amountExcess, status },
  db = pool
) => {
  await db.execute(
    `
      UPDATE contribution_obligations
      SET
        amount_paid = :amountPaid,
        amount_outstanding = :amountOutstanding,
        amount_excess = :amountExcess,
        status = :status
      WHERE id = :id
    `,
    { id, amountPaid, amountOutstanding, amountExcess, status }
  );
  return findById(id, db);
};

module.exports = {
  findById,
  findByCycleAndMembership,
  findByCycleMembershipDueAt,
  findActiveByMembership,
  findAllByCycleId,
  findAllByCycleAndMembershipId,
  findAllByCooperativeId,
  findAllByUserId,
  create,
  createIfMissing,
  markOverdue,
  applyPayment
};
