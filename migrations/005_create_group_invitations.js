const up = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS group_invitations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      cooperative_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      max_uses INT UNSIGNED NOT NULL DEFAULT 1,
      uses INT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'USED') NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_group_invitations_token_hash (token_hash),
      KEY idx_group_invitations_cooperative_id (cooperative_id),
      KEY idx_group_invitations_created_by (created_by),
      KEY idx_group_invitations_status (status),
      KEY idx_group_invitations_expires_at (expires_at),
      CONSTRAINT fk_group_invitations_cooperative
        FOREIGN KEY (cooperative_id) REFERENCES cooperatives(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_group_invitations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const down = async (db) => {
  await db.query('DROP TABLE IF EXISTS group_invitations');
};

module.exports = {
  up,
  down
};
