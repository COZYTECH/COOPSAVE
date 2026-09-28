const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cooperative_memberships (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      role ENUM('GROUP_ADMIN', 'GROUP_MEMBER') NOT NULL DEFAULT 'GROUP_MEMBER',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_cooperative_memberships_group_user (cooperative_id, user_id),
      KEY idx_cooperative_memberships_cooperative_id (cooperative_id),
      KEY idx_cooperative_memberships_user_id (user_id),
      KEY idx_cooperative_memberships_role (role),
      CONSTRAINT fk_cooperative_memberships_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_cooperative_memberships_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Preserve the current ownership model by making every existing owner an
  // explicit group administrator in the new membership model.
  await db.query(`
    INSERT IGNORE INTO cooperative_memberships (cooperative_id, user_id, role)
    SELECT id, owner_id, 'GROUP_ADMIN'
    FROM cooperatives
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS cooperative_memberships');
};

module.exports = {
  up,
  down
};
