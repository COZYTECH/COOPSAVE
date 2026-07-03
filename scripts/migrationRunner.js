const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const migrationsDir = path.join(__dirname, '..', 'migrations');

const quoteIdentifier = (identifier) => {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }

  return `\`${identifier}\``;
};

const createConnection = async () => {
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    multipleStatements: true
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(env.database.name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE ${quoteIdentifier(env.database.name)}`);

  return connection;
};

const ensureMigrationTable = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const getMigrationFiles = () => {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();
};

const getChecksum = (filename) => {
  const filePath = path.join(migrationsDir, filename);
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
};

const loadMigration = (filename) => {
  return require(path.join(migrationsDir, filename));
};

const migrate = async () => {
  const connection = await createConnection();

  try {
    await ensureMigrationTable(connection);

    for (const filename of getMigrationFiles()) {
      const checksum = getChecksum(filename);
      const [existingRows] = await connection.execute(
        'SELECT checksum FROM schema_migrations WHERE filename = ? LIMIT 1',
        [filename]
      );

      if (existingRows.length > 0) {
        if (existingRows[0].checksum !== checksum) {
          throw new Error(
            `Migration checksum mismatch for ${filename}. Create a new migration instead of editing an applied one.`
          );
        }

        console.log(`Skipping already applied migration: ${filename}`);
        continue;
      }

      const migration = loadMigration(filename);

      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${filename} does not export an up() function.`);
      }

      console.log(`Applying migration: ${filename}`);
      await migration.up(connection);
      await connection.execute(
        'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)',
        [filename, checksum]
      );
      console.log(`Applied migration: ${filename}`);
    }
  } finally {
    await connection.end();
  }
};

const rollback = async () => {
  const connection = await createConnection();

  try {
    await ensureMigrationTable(connection);

    const [rows] = await connection.execute(
      'SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('No migrations to roll back.');
      return;
    }

    const filename = rows[0].filename;
    const migration = loadMigration(filename);

    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${filename} does not export a down() function.`);
    }

    console.log(`Rolling back migration: ${filename}`);
    await migration.down(connection);
    await connection.execute('DELETE FROM schema_migrations WHERE filename = ?', [
      filename
    ]);
    console.log(`Rolled back migration: ${filename}`);
  } finally {
    await connection.end();
  }
};

module.exports = {
  migrate,
  rollback
};
