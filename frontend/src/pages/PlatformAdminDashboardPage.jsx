import { useEffect, useState } from 'react';
import { Banknote, Database, ShieldCheck } from 'lucide-react';
import { Alert } from '../components/ui/Alert.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { getApiError } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { adminApi } from '../services/adminApi';

export const PlatformAdminDashboardPage = () => {
  const [identities, setIdentities] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Pamoja | Platform administration';
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [identityData, payoutData, transactionData] = await Promise.all([
        adminApi.paymentIdentities(),
        adminApi.payouts(),
        adminApi.transactions()
      ]);
      setIdentities(identityData);
      setPayouts(payoutData);
      setTransactions(transactionData);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load payment identities.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <section>
        <p className="pamoja-eyebrow">Platform administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-pamoja-forest-deep sm:text-4xl">Keep platform operations in view.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-muted">Platform controls are kept separate from group workspaces. Only supported operational actions appear here.</p>
      </section>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-forest text-white"><Database className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="pamoja-eyebrow">Provider operations</p>
              <h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Membership-scoped identities</h2>
              <p className="mt-2 text-sm leading-6 text-pamoja-muted">Inspect Flutterwave test-mode payment identities across Ajos without exposing provider credentials or cross-group controls.</p>
              <p className="mt-4 text-3xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : identities.length}</p>
              <p className="mt-1 text-xs text-pamoja-muted">Identities visible to platform administration</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-forest text-white"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Payment monitoring</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Payment records</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Review payment attempts and provider states across all Ajos.</p><p className="mt-4 text-3xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : transactions.length}</p><p className="mt-1 text-xs text-pamoja-muted">System-wide records</p></div></div>
        </Card>
        <Card className="p-6">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><Banknote className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Payout operations</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Provider transfer records</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Monitor payout state transitions and reconciliation flags. Transfers remain in Flutterwave test mode.</p><p className="mt-4 text-3xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : payouts.length}</p><p className="mt-1 text-xs text-pamoja-muted">Payout records across Ajos</p></div></div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="pamoja-eyebrow">Access boundary</p>
              <h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Platform role is separate</h2>
              <p className="mt-2 text-sm leading-6 text-pamoja-muted">Group ownership and membership do not grant platform-admin access. User, group, and financial workflows remain scoped to their supported APIs.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-pamoja-forest/8 px-5 py-4"><p className="pamoja-eyebrow">Provider directory</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Payment identities</h2></div>
        {loading ? <LoadingState label="Loading payment identities..." /> : identities.length === 0 ? <p className="p-5 text-sm text-pamoja-muted">No payment identities have been provisioned yet.</p> : <div className="divide-y divide-pamoja-forest/8">{identities.map((identity) => <div key={identity.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-pamoja-ink">{identity.memberName || identity.memberEmail}</p><p className="text-sm text-pamoja-muted">{identity.cooperativeName || 'Ajo'} · {identity.accountNumber || 'No account number'}</p></div><StatusBadge status={identity.status === 'ACTIVE' ? 'success' : identity.status === 'FAILED' ? 'danger' : 'pending'}>{identity.status}</StatusBadge></div>)}</div>}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-pamoja-forest/8 px-5 py-4"><p className="pamoja-eyebrow">System monitoring</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Payment attempts</h2></div>
        {loading ? <LoadingState label="Loading payment records..." /> : transactions.length === 0 ? <p className="p-5 text-sm text-pamoja-muted">No payment records have been created.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase tracking-[0.08em] text-pamoja-muted"><tr><th className="px-5 py-3 font-semibold">Member</th><th className="px-5 py-3 font-semibold">Ajo</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Provider reference</th></tr></thead><tbody className="divide-y divide-pamoja-forest/8">{transactions.slice(0, 20).map((transaction) => <tr key={transaction.id}><td className="px-5 py-3 font-semibold text-pamoja-ink">{transaction.memberName || '-'}</td><td className="px-5 py-3 text-pamoja-muted">{transaction.cooperativeName || '-'}</td><td className="px-5 py-3 whitespace-nowrap">{formatCurrency(transaction.grossAmount, transaction.currency)}</td><td className="px-5 py-3"><StatusBadge status={transaction.status === 'SUCCESS' ? 'success' : transaction.status === 'FAILED' ? 'danger' : 'pending'}>{transaction.status}</StatusBadge></td><td className="px-5 py-3 font-mono text-xs text-pamoja-muted">{transaction.providerReference || transaction.providerTransactionId || '-'}</td></tr>)}</tbody></table></div>}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-pamoja-forest/8 px-5 py-4"><p className="pamoja-eyebrow">Payout directory</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Transfer status</h2></div>
        {loading ? <LoadingState label="Loading payouts..." /> : payouts.length === 0 ? <p className="p-5 text-sm text-pamoja-muted">No payout records have been created.</p> : <div className="divide-y divide-pamoja-forest/8">{payouts.map((payout) => <div key={payout.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-pamoja-ink">{payout.cooperativeName || 'Ajo'} · {payout.cycleName || 'Cycle'}</p><p className="text-sm text-pamoja-muted">{payout.recipientName || 'Recipient'} · {payout.accountNumberMasked || 'Verified account'} · {formatCurrency(payout.amount)}</p></div><StatusBadge status={payout.status === 'SUCCESS' ? 'success' : payout.status === 'FAILED' ? 'danger' : 'pending'}>{payout.status}</StatusBadge></div>)}</div>}
      </Card>
    </div>
  );
};
