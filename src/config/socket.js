const { Server } = require('socket.io');
const env = require('./env');
const userRepository = require('../repositories/userRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');
const { verifyToken } = require('../utils/jwt');

let io = null;

const userRoom = (userId) => `user:${userId}`;
const groupRoom = (groupId) => `group:${groupId}`;
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
    groupMembershipRepository.findByUserId(socket.user.id)
      .then((memberships) => memberships.forEach((membership) => socket.join(groupRoom(membership.cooperative_id))))
      .catch((error) => console.error('Unable to join Socket.IO group rooms.', error.message));
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

// Emit only after the payment transaction, obligation and ledger entry have
// committed. The member room is group-scoped through the authenticated user,
// so this event never exposes another Ajo's financial data.
const emitContributionAllocated = (memberUserId, cooperativeId, payload) => {
  if (!io) {
    return;
  }

  let target = io;
  if (memberUserId) {
    target = target.to(userRoom(memberUserId));
  }
  if (cooperativeId) {
    target = target.to(groupRoom(cooperativeId));
  }
  target.emit('contribution.allocated', payload);
  target.emit('payment.received', payload);
  target.emit('payment_received', payload);
};

// Payout notifications are emitted only after the payout state and any
// completed payout ledger debit have committed successfully.
const emitPayoutUpdated = (memberUserId, cooperativeId, payload) => {
  if (!io) {
    return;
  }

  let target = io;
  if (memberUserId) {
    target = target.to(userRoom(memberUserId));
  }
  if (cooperativeId) {
    target = target.to(groupRoom(cooperativeId));
  }
  target.emit('payout:updated', payload);
};

module.exports = {
  initializeSocket,
  emitPaymentReceived,
  emitContributionAllocated,
  emitPayoutUpdated
};
