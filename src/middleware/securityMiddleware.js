const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
  cors(corsOptions),
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.'
    }
  })
];

module.exports = securityMiddleware;
