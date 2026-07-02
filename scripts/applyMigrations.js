const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

const quoteIdentifier = (identifier) => {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }

  return `\`${identifier}\``;
};

const splitSqlStatements = (sql) => {
  const statements = [];
  const lines = sql.split(/\r?\n/);
  let delimiter = ';';
  let buffer = [];

  for (const line of lines) {
    const delimiterMatch = line.match(/^\s*DELIMITER\s+(.+)\s*$/i);

    if (delimiterMatch) {
      const statement = buffer.join('\n').trim();
      if (statement) {
        statements.push(statement);
      }

      buffer = [];
      delimiter = delimiterMatch[1];
      continue;
    }

    buffer.push(line);

    const current = buffer.join('\n').trimEnd();
    if (current.endsWith(delimiter)) {
      statements.push(current.slice(0, -delimiter.length).trim());
      buffer = [];
    }
  }

  const remaining = buffer.join('\n').trim();
  if (remaining) {
    statements.push(remaining);
  }

  return statements.filter(Boolean);
};

const applyMigrations = async () => {
  const databaseName = quoteIdentifier(env.database.name);
  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    multipleStatements: true
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${databaseName}`);
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

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
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

      const statements = splitSqlStatements(sql);
      console.log(`Applying migration: ${filename}`);

      for (const statement of statements) {
        await connection.query(statement);
      }

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

applyMigrations().catch((error) => {
  console.error('Failed to apply migrations:', error.message);
  process.exit(1);
});
