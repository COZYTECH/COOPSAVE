const hasIndex = async (db, table, indexName) => {
  const [rows] = await db.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
  return rows.length > 0;
};

const up = async (db) => {
  // The old key allowed only one obligation per cycle member. Period-based
  // schedules need the new cycle/member/due_at key to be authoritative.
  if (await hasIndex(db, 'contribution_obligations', 'uq_contribution_obligations_cycle_member')) {
    if (!(await hasIndex(db, 'contribution_obligations', 'idx_contribution_obligations_cycle_member'))) {
      await db.query(`
        ALTER TABLE contribution_obligations
        ADD KEY idx_contribution_obligations_cycle_member (cycle_member_id)
      `);
    }
    await db.query(`
      ALTER TABLE contribution_obligations
      DROP INDEX uq_contribution_obligations_cycle_member
    `);
  }
};

const down = async (db) => {
  const [duplicates] = await db.query(`
    SELECT cycle_member_id, COUNT(*) AS duplicate_count
    FROM contribution_obligations
    GROUP BY cycle_member_id
    HAVING COUNT(*) > 1
    LIMIT 1
  `);
  if (duplicates.length > 0) {
    throw new Error('Cannot restore single-period obligation uniqueness while multiple periods exist.');
  }
  if (!(await hasIndex(db, 'contribution_obligations', 'uq_contribution_obligations_cycle_member'))) {
    await db.query(`
      ALTER TABLE contribution_obligations
      ADD UNIQUE KEY uq_contribution_obligations_cycle_member (cycle_member_id)
    `);
  }
};

module.exports = { up, down };
