const { rollback } = require('./migrationRunner');

rollback().catch((error) => {
  console.error('Failed to roll back migration:', error.message);
  process.exit(1);
});
