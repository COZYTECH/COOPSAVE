const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, env.jwt.secret);
};

module.exports = {
  signToken,
  verifyToken
};
