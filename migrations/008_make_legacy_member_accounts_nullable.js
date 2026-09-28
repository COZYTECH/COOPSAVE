// Legacy member rows are retained for historical Nomba records. New member
// directory rows no longer provision Nomba accounts; payment identities are
// owned by cooperative_memberships instead.
const up = async (db) => {
  await db.query(`
    ALTER TABLE members
      MODIFY COLUMN account_ref VARCHAR(100) NULL,
      MODIFY COLUMN account_number VARCHAR(50) NULL,
      MODIFY COLUMN account_name VARCHAR(150) NULL
  `);
};

const down = async (db) => {
  const [rows] = await db.query(`
    SELECT 1
    FROM members
    WHERE account_ref IS NULL OR account_number IS NULL OR account_name IS NULL
    LIMIT 1
  `);

  if (rows.length > 0) {
    throw new Error('Cannot restore legacy member account columns while NULL values exist.');
  }

  await db.query(`
    ALTER TABLE members
      MODIFY COLUMN account_ref VARCHAR(100) NOT NULL,
      MODIFY COLUMN account_number VARCHAR(50) NOT NULL,
      MODIFY COLUMN account_name VARCHAR(150) NOT NULL
  `);
};

module.exports = { up, down };
