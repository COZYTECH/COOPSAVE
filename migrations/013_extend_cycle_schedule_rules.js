const hasColumn = async (db, table, column) => {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
};

const hasIndex = async (db, table, indexName) => {
  const [rows] = await db.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
  return rows.length > 0;
};

const up = async (db) => {
  if (!(await hasColumn(db, 'ajo_cycles', 'interval_days'))) {
    await db.query(`
      ALTER TABLE ajo_cycles
      ADD COLUMN interval_days INT UNSIGNED NULL AFTER frequency
    `);
  }

  if (!(await hasColumn(db, 'ajo_cycles', 'grace_period_days'))) {
    await db.query(`
      ALTER TABLE ajo_cycles
      ADD COLUMN grace_period_days INT UNSIGNED NOT NULL DEFAULT 0 AFTER end_date
    `);
  }

  if (!(await hasIndex(db, 'ajo_cycles', 'idx_ajo_cycles_frequency'))) {
    await db.query('ALTER TABLE ajo_cycles ADD KEY idx_ajo_cycles_frequency (frequency)');
  }

  if (!(await hasIndex(db, 'contribution_obligations', 'uq_contribution_obligations_cycle_membership_due_date'))) {
    const [duplicates] = await db.query(`
      SELECT cycle_id, membership_id, due_at, COUNT(*) AS duplicate_count
      FROM contribution_obligations
      WHERE due_at IS NOT NULL
      GROUP BY cycle_id, membership_id, due_at
      HAVING COUNT(*) > 1
      LIMIT 1
    `);

    if (duplicates.length > 0) {
      throw new Error('Cannot add period uniqueness: duplicate contribution obligations already exist.');
    }

    if (await hasIndex(db, 'contribution_obligations', 'uq_contribution_obligations_cycle_membership')) {
      await db.query(`
        ALTER TABLE contribution_obligations
        DROP INDEX uq_contribution_obligations_cycle_membership
      `);
    }

    await db.query(`
      ALTER TABLE contribution_obligations
      ADD UNIQUE KEY uq_contribution_obligations_cycle_membership_due_date
        (cycle_id, membership_id, due_at)
    `);
  }
};

const down = async (db) => {
  if (await hasIndex(db, 'contribution_obligations', 'uq_contribution_obligations_cycle_membership_due_date')) {
    await db.query(`
      ALTER TABLE contribution_obligations
      DROP INDEX uq_contribution_obligations_cycle_membership_due_date
    `);
  }

  if (!(await hasIndex(db, 'contribution_obligations', 'uq_contribution_obligations_cycle_membership'))) {
    const [duplicates] = await db.query(`
      SELECT cycle_id, membership_id, COUNT(*) AS duplicate_count
      FROM contribution_obligations
      GROUP BY cycle_id, membership_id
      HAVING COUNT(*) > 1
      LIMIT 1
    `);

    if (duplicates.length > 0) {
      throw new Error('Cannot restore legacy obligation uniqueness while multiple periods exist.');
    }

    await db.query(`
      ALTER TABLE contribution_obligations
      ADD UNIQUE KEY uq_contribution_obligations_cycle_membership
        (cycle_id, membership_id)
    `);
  }

  if (await hasIndex(db, 'ajo_cycles', 'idx_ajo_cycles_frequency')) {
    await db.query('ALTER TABLE ajo_cycles DROP INDEX idx_ajo_cycles_frequency');
  }
  if (await hasColumn(db, 'ajo_cycles', 'grace_period_days')) {
    await db.query('ALTER TABLE ajo_cycles DROP COLUMN grace_period_days');
  }
  if (await hasColumn(db, 'ajo_cycles', 'interval_days')) {
    await db.query('ALTER TABLE ajo_cycles DROP COLUMN interval_days');
  }
};

module.exports = { up, down };
