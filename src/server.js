const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/database');
const { initializeSocket } = require('./config/socket');

const startServer = async () => {
  try {
    await testConnection();
    const server = http.createServer(app);
    initializeSocket(server);

    server.listen(env.port, () => {
      console.log(`CoopSave API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start CoopSave API:', error);
    process.exit(1);
  }
};

startServer();
