const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

const applySchema = async () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    multipleStatements: true
  });

  try {
    await connection.query(schema);
    console.log(`Schema applied successfully to database "${env.database.name}".`);
  } finally {
    await connection.end();
  }
};

applySchema().catch((error) => {
  console.error('Failed to apply schema:', error.message);
  process.exit(1);
});
