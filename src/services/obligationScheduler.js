const notificationService = require('./notificationService');

const startObligationScheduler = () => {
  if (String(process.env.OBLIGATION_SCHEDULER_ENABLED || 'true').toLowerCase() === 'false') {
    return null;
  }

  const intervalMs = Math.max(Number(process.env.OBLIGATION_SCHEDULER_INTERVAL_MS || 60 * 60 * 1000), 60 * 1000);
  const run = () => notificationService.processDueObligations().catch((error) => {
    console.error(JSON.stringify({
      level: 'error',
      event: 'obligation.scheduler.failed',
      timestamp: new Date().toISOString(),
      error: error.message
    }));
  });

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
};

module.exports = { startObligationScheduler };
