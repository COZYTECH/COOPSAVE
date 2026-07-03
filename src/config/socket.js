const { Server } = require('socket.io');
const env = require('./env');
const userRepository = require('../repositories/userRepository');
const { verifyToken } = require('../utils/jwt');

let io = null;

const userRoom = (userId) => `user:${userId}`;
const developmentOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const getSocketCorsOrigin = () => {
  if (env.cors.origin === '*') {
    return '*';
  }

  if (env.nodeEnv === 'development') {
    return [...new Set([...env.cors.origins, ...developmentOrigins])];
  }

  return env.cors.origins;
};

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: getSocketCorsOrigin(),
      methods: ['GET', 'POST']
    }
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication token is required.'));
      }

      const decoded = verifyToken(token);
      const user = await userRepository.findById(decoded.sub);

      if (!user || !user.is_active) {
        return next(new Error('Authentication token is invalid.'));
      }

      socket.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      return next();
    } catch (error) {
      return next(new Error('Authentication token is invalid.'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.user.id));
  });

  return io;
};

const emitPaymentReceived = (ownerId, payload) => {
  if (!io || !ownerId) {
    return;
  }

  io.to(userRoom(ownerId)).emit('payment.received', payload);
  io.to(userRoom(ownerId)).emit('payment_received', payload);
};

module.exports = {
  initializeSocket,
  emitPaymentReceived
};
