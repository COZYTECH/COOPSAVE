const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      cooperative_id BIGINT UNSIGNED NULL,
      cycle_id BIGINT UNSIGNED NULL,
      obligation_id BIGINT UNSIGNED NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(180) NOT NULL,
      body VARCHAR(500) NOT NULL,
      action_path VARCHAR(255) NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_notifications_obligation_type (obligation_id, type),
      KEY idx_notifications_user_read_created (user_id, read_at, created_at),
      KEY idx_notifications_cooperative (cooperative_id),
      CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_cycle
        FOREIGN KEY (cycle_id) REFERENCES ajo_cycles(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_obligation
        FOREIGN KEY (obligation_id) REFERENCES contribution_obligations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS notifications');
};

module.exports = { up, down };
