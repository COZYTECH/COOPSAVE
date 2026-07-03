const { migrate } = require('./migrationRunner');

migrate().catch((error) => {
  console.error('Failed to run migrations:', error.message);
  process.exit(1);
});
