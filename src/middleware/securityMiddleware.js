const cors = require('cors');
const helmet = require('helmet');
const env = require('../config/env');

const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin(origin, callback) {
    const allowedOrigins =
      env.nodeEnv === 'development'
        ? [...new Set([...env.cors.origins, ...developmentOrigins])]
        : env.cors.origins;

    if (!origin || env.cors.origin === '*' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS.'));
  }
};

const securityMiddleware = [
  helmet(),
  cors(corsOptions)
];

module.exports = securityMiddleware;
