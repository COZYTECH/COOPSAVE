import { useEffect } from 'react';
import { createSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext.jsx';

export const usePaymentEvents = (onPaymentReceived) => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const socket = createSocket();

    socket.on('payment_received', (payload) => {
      onPaymentReceived(payload);
    });

    return () => {
      socket.off('payment_received');
      socket.disconnect();
    };
  }, [isAuthenticated, onPaymentReceived]);
};
