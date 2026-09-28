import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Card } from '../components/ui/Card.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';

const resultCopy = {
  SUCCESS: {
    title: 'Payment verified',
    message: 'Your contribution was verified and allocated to the obligation.',
    badge: 'success'
  },
  FAILED: {
    title: 'Payment failed',
    message: 'Flutterwave did not confirm this payment. Your obligation remains unpaid.',
    badge: 'danger'
  },
  REQUIRES_VERIFICATION: {
    title: 'Payment pending verification',
    message: 'The payment redirect did not contain enough information for server-side verification yet.',
    badge: 'pending'
  },
  RECONCILIATION_REQUIRED: {
    title: 'Payment requires review',
    message: 'The provider result did not match the saved payment attempt. No contribution was marked paid automatically.',
    badge: 'pending'
  }
};

export const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'REQUIRES_VERIFICATION';
  const result = resultCopy[status] || resultCopy.REQUIRES_VERIFICATION;

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <StatusBadge status={result.badge}>{status}</StatusBadge>
        <h1 className="mt-4 text-2xl font-semibold text-pamoja-forest-deep">{result.title}</h1>
        <p className="mt-3 text-sm leading-6 text-pamoja-muted">{result.message}</p>
        <div className="mt-5"><Alert type="info">Payment status is confirmed by Pamoja's backend and Flutterwave verification, not by the browser redirect alone.</Alert></div>
        <Link to="/dashboard" className="pamoja-focus mt-6 inline-flex min-h-11 items-center rounded-lg bg-pamoja-forest px-4 text-sm font-semibold text-white hover:bg-pamoja-forest-deep">Return to dashboard</Link>
      </Card>
    </div>
  );
};
