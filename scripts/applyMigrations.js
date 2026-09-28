const { migrate } = require('./migrationRunner');

// Keep the legacy entry point aligned with the canonical root migrations folder.
migrate().catch((error) => {
  console.error('Failed to apply migrations:', error.message);
  process.exit(1);
});
