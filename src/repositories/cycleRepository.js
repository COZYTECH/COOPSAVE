const { pool } = require('../config/database');

const cycleColumns = `
  ac.id,
  ac.cooperative_id,
  ac.cycle_number,
  ac.name,
  ac.contribution_amount,
  ac.currency,
  ac.frequency,
  ac.interval_days,
  DATE_FORMAT(ac.start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(ac.end_date, '%Y-%m-%d') AS end_date,
  ac.grace_period_days,
  ac.recipient_membership_id,
  ac.status,
  ac.created_at,
  ac.updated_at
`;

const findById = async (id, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${cycleColumns}
      FROM ajo_cycles ac
      WHERE ac.id = :id
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { id }
  );
  return rows[0] || null;
};

const findByIdAndCooperative = async (id, cooperativeId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${cycleColumns}
      FROM ajo_cycles ac
      WHERE ac.id = :id AND ac.cooperative_id = :cooperativeId
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { id, cooperativeId }
  );
  return rows[0] || null;
};

const findAllByCooperativeId = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${cycleColumns}
      FROM ajo_cycles ac
      WHERE ac.cooperative_id = :cooperativeId
      ORDER BY ac.cycle_number DESC
    `,
    { cooperativeId }
  );
  return rows;
};

const findAllByMembershipId = async (membershipId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${cycleColumns}
      FROM ajo_cycles ac
      INNER JOIN cycle_members cm ON cm.cycle_id = ac.id
      WHERE cm.membership_id = :membershipId
      ORDER BY ac.start_date DESC, ac.cycle_number DESC
    `,
    { membershipId }
  );
  return rows;
};

const findByIdAndMembershipId = async (cycleId, membershipId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT ${cycleColumns}
      FROM ajo_cycles ac
      INNER JOIN cycle_members cm ON cm.cycle_id = ac.id
      WHERE ac.id = :cycleId AND cm.membership_id = :membershipId
      LIMIT 1
    `,
    { cycleId, membershipId }
  );
  return rows[0] || null;
};

const findActiveByMembershipId = async (membershipId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT ${cycleColumns}
      FROM ajo_cycles ac
      INNER JOIN cycle_members cm ON cm.cycle_id = ac.id
      WHERE cm.membership_id = :membershipId
        AND ac.status = 'ACTIVE'
        AND cm.status = 'ACTIVE'
      ORDER BY ac.cycle_number DESC
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { membershipId }
  );
  return rows[0] || null;
};

const getNextCycleNumber = async (cooperativeId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next_cycle_number
      FROM ajo_cycles
      WHERE cooperative_id = :cooperativeId
    `,
    { cooperativeId }
  );
  return Number(rows[0].next_cycle_number);
};

const create = async ({
  cooperativeId,
  cycleNumber,
  name,
  contributionAmount,
  currency,
  frequency,
  intervalDays = null,
  startDate,
  endDate,
  gracePeriodDays = 0,
  recipientMembershipId = null,
  status = 'DRAFT'
}, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO ajo_cycles (
        cooperative_id,
        cycle_number,
        name,
        contribution_amount,
        currency,
        frequency,
        interval_days,
        start_date,
        end_date,
        grace_period_days,
        recipient_membership_id,
        status
      )
      VALUES (
        :cooperativeId,
        :cycleNumber,
        :name,
        :contributionAmount,
        :currency,
        :frequency,
        :intervalDays,
        :startDate,
        :endDate,
        :gracePeriodDays,
        :recipientMembershipId,
        :status
      )
    `,
    {
      cooperativeId,
      cycleNumber,
      name,
      contributionAmount,
      currency,
      frequency,
      intervalDays,
      startDate,
      endDate: endDate || null,
      gracePeriodDays,
      recipientMembershipId: recipientMembershipId || null,
      status
    }
  );
  return findById(result.insertId, db);
};

const addMember = async ({ cycleId, membershipId, position, expectedAmount, currency }, db = pool) => {
  const [result] = await db.execute(
    `
      INSERT INTO cycle_members (
        cycle_id,
        membership_id,
        position,
        expected_amount,
        currency
      )
      VALUES (:cycleId, :membershipId, :position, :expectedAmount, :currency)
    `,
    { cycleId, membershipId, position: position || null, expectedAmount, currency }
  );

  const [rows] = await db.execute(
    `SELECT * FROM cycle_members WHERE id = :id LIMIT 1`,
    { id: result.insertId }
  );
  return rows[0] || null;
};

const findMembers = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    `
      SELECT
        cm.id,
        cm.cycle_id,
        cm.membership_id,
        cm.position,
        cm.expected_amount,
        cm.currency,
        cm.status,
        cm.created_at,
        u.name AS member_name,
        u.email AS member_email
      FROM cycle_members cm
      INNER JOIN cooperative_memberships gm ON gm.id = cm.membership_id
      INNER JOIN users u ON u.id = gm.user_id
      WHERE cm.cycle_id = :cycleId
      ORDER BY cm.position IS NULL, cm.position, cm.id
    `,
    { cycleId }
  );
  return rows;
};

const countMembers = async (cycleId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS count FROM cycle_members WHERE cycle_id = :cycleId AND status = 'ACTIVE'`,
    { cycleId }
  );
  return Number(rows[0].count);
};

// Financial records are counted before any destructive cycle action.
// Keep this authoritative and scoped to the cycle's own foreign-key paths.
const getFinancialActivity = async (cycleId, db = pool, forUpdate = false) => {
  const [rows] = await db.execute(
    `
      SELECT
        (SELECT COUNT(*) FROM contribution_obligations co WHERE co.cycle_id = :cycleId) AS obligations,
        (SELECT COUNT(*)
           FROM payment_transactions pt
           LEFT JOIN contribution_obligations co ON co.id = pt.obligation_id
           INNER JOIN ajo_cycles ac ON ac.id = :cycleId
          WHERE co.cycle_id = :cycleId
             OR (pt.obligation_id IS NULL AND pt.cooperative_id = ac.cooperative_id)) AS payment_transactions,
        (SELECT COUNT(*)
           FROM obligation_allocations oa
           INNER JOIN contribution_obligations co ON co.id = oa.obligation_id
          WHERE co.cycle_id = :cycleId) AS payment_allocations,
        (SELECT COUNT(*) FROM ledger_entries le WHERE le.cycle_id = :cycleId) AS ledger_entries,
        (SELECT COUNT(*) FROM payouts p WHERE p.cycle_id = :cycleId) AS payouts,
        (SELECT COUNT(*)
           FROM payout_attempts pa
           INNER JOIN payouts p ON p.id = pa.payout_id
          WHERE p.cycle_id = :cycleId) AS payout_attempts
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    { cycleId }
  );

  const activity = Object.fromEntries(
    Object.entries(rows[0] || {}).map(([key, value]) => [key, Number(value)])
  );
  return {
    ...activity,
    hasFinancialActivity: Object.values(activity).some((count) => count > 0)
  };
};

const deleteDraft = async (cycleId, db = pool) => {
  // cycle_members are setup rows and must be removed before the cycle itself.
  await db.execute('DELETE FROM cycle_members WHERE cycle_id = :cycleId', { cycleId });
  const [result] = await db.execute(
    `DELETE FROM ajo_cycles WHERE id = :cycleId AND status = 'DRAFT'`,
    { cycleId }
  );
  return result.affectedRows > 0;
};

const cancel = async (cycleId, db = pool) => {
  const [result] = await db.execute(
    `
      UPDATE ajo_cycles
         SET status = 'CANCELLED'
       WHERE id = :cycleId
         AND status IN ('DRAFT', 'ACTIVE')
    `,
    { cycleId }
  );
  return result.affectedRows > 0 ? findById(cycleId, db) : null;
};

const activate = async (cycleId, db = pool) => {
  await db.execute(
    `UPDATE ajo_cycles SET status = 'ACTIVE' WHERE id = :cycleId AND status = 'DRAFT'`,
    { cycleId }
  );
  return findById(cycleId, db);
};

const setRecipient = async (cycleId, recipientMembershipId, db = pool) => {
  await db.execute(
    `UPDATE ajo_cycles SET recipient_membership_id = :recipientMembershipId WHERE id = :cycleId`,
    { cycleId, recipientMembershipId }
  );
  return findById(cycleId, db);
};

module.exports = {
  findById,
  findByIdAndCooperative,
  findAllByCooperativeId,
  findAllByMembershipId,
  findByIdAndMembershipId,
  findActiveByMembershipId,
  getNextCycleNumber,
  create,
  addMember,
  findMembers,
  countMembers,
  getFinancialActivity,
  deleteDraft,
  cancel,
  activate,
  setRecipient
};
