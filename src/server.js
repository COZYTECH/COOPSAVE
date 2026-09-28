const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/database');
const { initializeSocket } = require('./config/socket');
const { startObligationScheduler } = require('./services/obligationScheduler');

const validateProductionConfiguration = () => {
  if (env.nodeEnv !== 'production') {
    return;
  }

  const errors = [];
  if (!env.jwt.secret) {
    errors.push('JWT_SECRET must be configured in production.');
  }
  if (env.flutterwave.mode !== 'test') {
    errors.push('FLUTTERWAVE_MODE must remain test until production cutover is approved.');
  }
  if (!process.env.CORS_ORIGIN) {
    errors.push('CORS_ORIGIN must be configured in production.');
  }

  if (errors.length > 0) {
    throw new Error(`Unsafe production configuration: ${errors.join(' ')}`);
  }
};

const startServer = async () => {
  try {
    validateProductionConfiguration();
    await testConnection();
    const server = http.createServer(app);
    initializeSocket(server);
    startObligationScheduler();

    server.listen(env.port, () => {
      console.log(`CoopSave API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start CoopSave API:', error);
    process.exit(1);
  }
};

startServer();
