import { io } from 'socket.io-client';
import { authStorage } from './storage';

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
  return io(getSocketUrl(), {
    auth: {
      token: authStorage.getToken()
    },
    transports: ['websocket', 'polling']
  });
};
