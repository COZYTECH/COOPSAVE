import { io } from 'socket.io-client';
import { authStorage } from './storage';

const activeSockets = new Set();

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(
    /\/api(?:\/v1)?\/?$/,
    ''
  );
};

export const createSocket = () => {
  const socket = io(getSocketUrl(), {
    auth: {
      token: authStorage.getToken()
    },
    transports: ['websocket', 'polling']
  });

  activeSockets.add(socket);
  socket.once('disconnect', () => activeSockets.delete(socket));

  return socket;
};

// Logout must close every authenticated socket so it cannot continue receiving
// protected events after the client token has been removed.
export const disconnectSockets = () => {
  activeSockets.forEach((socket) => {
    socket.removeAllListeners();
    socket.disconnect();
  });
  activeSockets.clear();
};
