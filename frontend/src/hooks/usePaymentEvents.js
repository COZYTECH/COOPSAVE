import { useEffect } from 'react';
import { createSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext.jsx';

export const usePaymentEvents = (onPaymentReceived, onPayoutUpdated = onPaymentReceived) => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const socket = createSocket();

    const handlePayment = (payload) => {
      onPaymentReceived(payload);
    };

    socket.on('payment_received', handlePayment);
    socket.on('contribution.allocated', handlePayment);
    socket.on('payout:updated', onPayoutUpdated);

    return () => {
      socket.off('payment_received', handlePayment);
      socket.off('contribution.allocated', handlePayment);
      socket.off('payout:updated', onPayoutUpdated);
      socket.disconnect();
    };
  }, [isAuthenticated, onPaymentReceived, onPayoutUpdated]);
};
