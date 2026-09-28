import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { getApiError } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { adminApi } from '../services/adminApi';

const statusTone = (status) => status === 'ACTIVE' || status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'pending';

export const FinancialAccountDetailsPage = () => {
  const { groupId, cycleId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Pamoja | Ajo financial account';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(cycleId
        ? await adminApi.financialAccountCycle(groupId, cycleId, { page: 1, pageSize: 25 })
        : await adminApi.financialAccount(groupId, { page: 1, pageSize: 25 }));
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load this financial account.'));
    } finally {
      setLoading(false);
    }
  }, [groupId, cycleId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Loading financial account..." />;
  if (error) return <div className="space-y-4"><Link to="/admin/financial-accounts" className="pamoja-focus inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-pamoja-forest"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to financial accounts</Link><Alert>{error}</Alert></div>;
  if (!data) return null;

  const { account, summary, currentCycle, cycles = [], providerIdentities, payments, payouts, ledger, reconciliation } = data;
  const paymentColumns = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'memberName', label: 'Member', render: (row) => row.memberName || '-' },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount, row.currency) },
    { key: 'provider', label: 'Provider' },
    { key: 'providerReference', label: 'Provider reference', render: (row) => <span className="font-mono text-xs">{row.providerReference || '-'}</span> },
    { key: 'paymentStatus', label: 'Payment status', render: (row) => <StatusBadge status={statusTone(row.paymentStatus)}>{row.paymentStatus}</StatusBadge> },
    { key: 'allocationStatus', label: 'Allocation', render: (row) => row.allocationStatus || '-' },
    { key: 'obligation', label: 'Obligation', render: (row) => row.obligation || '-' },
    { key: 'transactionId', label: 'Transaction ID', render: (row) => `#${row.transactionId}` }
  ];
  const payoutColumns = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'recipientName', label: 'Recipient', render: (row) => row.recipientName || '-' },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount, row.currency) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={statusTone(row.status)}>{row.status}</StatusBadge> },
    { key: 'provider', label: 'Provider' },
    { key: 'providerReference', label: 'Provider reference', render: (row) => <span className="font-mono text-xs">{row.providerReference || '-'}</span> },
    { key: 'payoutId', label: 'Payout ID', render: (row) => `#${row.payoutId}` }
  ];
  const ledgerColumns = [
    { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
    { key: 'type', label: 'Type' },
    { key: 'description', label: 'Description', render: (row) => row.description || '-' },
    { key: 'amount', label: 'Amount', render: (row) => <span className={row.direction === 'CREDIT' ? 'text-pamoja-forest' : 'text-pamoja-ochre'}>{row.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(row.amount, row.currency)}</span> },
    { key: 'direction', label: 'Direction' },
    { key: 'reference', label: 'Reference', render: (row) => <span className="font-mono text-xs">{row.reference || '-'}</span> },
    { key: 'transactionId', label: 'Transaction/Payout', render: (row) => row.transactionId ? `Transaction #${row.transactionId}` : row.payoutId ? `Payout #${row.payoutId}` : '-' }
  ];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Platform administration" title={account.cooperativeName} description={`Ajo Group #${account.cooperativeId}`} actions={<div className="flex flex-wrap gap-2"><Link to="/admin/financial-accounts" className="pamoja-focus inline-flex min-h-11 items-center gap-2 rounded-lg border border-pamoja-forest/12 bg-white px-4 text-sm font-semibold text-pamoja-forest"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All accounts</Link><Button type="button" variant="secondary" onClick={load} loading={loading}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</Button></div>} />

      {reconciliation.required && <Alert type="info"><div><p className="font-semibold">Reconciliation required</p><p className="mt-1">{reconciliation.unresolvedCount} payment or payout record{reconciliation.unresolvedCount === 1 ? '' : 's'} require operational review.</p><Link to="/admin/reconciliation" className="mt-2 inline-flex font-semibold underline">View reconciliation</Link></div></Alert>}

      <Card className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="pamoja-eyebrow">Ajo financial account</p><h2 className="mt-1 text-2xl font-semibold text-pamoja-forest-deep">{account.cooperativeName}</h2><p className="mt-1 text-sm text-pamoja-muted">Read-only view of the membership-scoped provider identities and financial position.</p></div><StatusBadge status={statusTone(account.status)}>{account.status}</StatusBadge></div></Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card className="p-5"><p className="pamoja-eyebrow">Confirmed contributions</p><p className="mt-2 text-2xl font-bold text-pamoja-forest-deep">{formatCurrency(summary.totalConfirmedContributions)}</p></Card><Card className="p-5"><p className="pamoja-eyebrow">Confirmed payouts</p><p className="mt-2 text-2xl font-bold text-pamoja-forest-deep">{formatCurrency(summary.totalConfirmedPayouts)}</p></Card><Card className="p-5"><p className="pamoja-eyebrow">Available position</p><p className="mt-2 text-2xl font-bold text-pamoja-forest-deep">{formatCurrency(summary.availableFinancialPosition)}</p></Card><Card className="p-5"><p className="pamoja-eyebrow">Outstanding contributions</p><p className="mt-2 text-2xl font-bold text-pamoja-forest-deep">{formatCurrency(summary.outstandingContributions)}</p></Card></div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="overflow-hidden"><div className="border-b border-pamoja-forest/8 px-5 py-4"><div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-pamoja-forest" aria-hidden="true" /><h2 className="text-lg font-semibold text-pamoja-forest-deep">Provider identities</h2></div><p className="mt-1 text-sm text-pamoja-muted">Membership-scoped Flutterwave payment identities. Identifiers are masked.</p></div>{providerIdentities.length === 0 ? <div className="p-5"><EmptyState title="No provider identity" description="This Ajo has no payment identity provisioned yet." /></div> : <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-pamoja-sage/60 text-xs uppercase tracking-[0.08em] text-pamoja-muted"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Provider identity</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Currency</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-pamoja-forest/8">{providerIdentities.map((identity) => <tr key={identity.id}><td className="px-5 py-3"><p className="font-semibold">{identity.memberName || identity.memberEmail || '-'}</p><p className="text-xs text-pamoja-muted">Membership #{identity.cooperativeMembershipId}</p></td><td className="px-5 py-3"><p className="font-mono text-xs">{identity.accountNumber || identity.providerReference || '-'}</p><p className="text-xs text-pamoja-muted">{identity.bankName || identity.provider || '-'}</p></td><td className="px-5 py-3">{identity.providerIdentityType || '-'}</td><td className="px-5 py-3">{identity.currency || '-'}</td><td className="px-5 py-3"><StatusBadge status={statusTone(identity.status)}>{identity.status}</StatusBadge></td></tr>)}</tbody></table></div>}</Card><Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-pamoja-forest" aria-hidden="true" /><h2 className="text-lg font-semibold text-pamoja-forest-deep">{cycleId ? 'Selected cycle' : 'Ajo cycles'}</h2></div>{cycles.length > 0 && !cycleId && <div className="mt-4 space-y-2">{cycles.map((item) => <Link key={item.id} to={`/admin/financial-accounts/${groupId}/cycles/${item.id}`} className="pamoja-focus block rounded-lg bg-pamoja-sage/70 p-3"><div className="flex items-center justify-between gap-3"><span><span className="block font-semibold text-pamoja-ink">Cycle {item.cycleNumber} · {item.name}</span><span className="mt-1 block text-xs text-pamoja-muted">{item.status} · {item.progress}% collected</span></span><span className="text-sm font-semibold text-pamoja-forest">{formatCurrency(item.collectedAmount, item.currency)}</span></div></Link>)}</div>}{!currentCycle ? <p className="mt-4 rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted">No selected or active cycle</p> : <div className="mt-4 space-y-3"><div><p className="font-semibold text-pamoja-ink">Cycle #{currentCycle.cycleNumber} · {currentCycle.name}</p><p className="mt-1 text-sm text-pamoja-muted">{formatCurrency(currentCycle.contributionAmount, currentCycle.currency)} per member · {currentCycle.frequency}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-pamoja-sage/70 p-3"><p className="text-xs text-pamoja-muted">Members</p><p className="mt-1 font-semibold">{currentCycle.members}</p></div><div className="rounded-lg bg-pamoja-sage/70 p-3"><p className="text-xs text-pamoja-muted">Progress</p><p className="mt-1 font-semibold">{currentCycle.progress}%</p></div><div className="rounded-lg bg-pamoja-sage/70 p-3"><p className="text-xs text-pamoja-muted">Expected</p><p className="mt-1 font-semibold">{formatCurrency(currentCycle.expectedAmount, currentCycle.currency)}</p></div><div className="rounded-lg bg-pamoja-sage/70 p-3"><p className="text-xs text-pamoja-muted">Outstanding</p><p className="mt-1 font-semibold">{formatCurrency(currentCycle.outstandingAmount, currentCycle.currency)}</p></div></div></div>}</Card></div>

      <Card className="overflow-hidden"><div className="border-b border-pamoja-forest/8 px-5 py-4"><p className="pamoja-eyebrow">Payment activity</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Recent payments</h2></div>{payments.length === 0 ? <p className="p-5 text-sm text-pamoja-muted">No payment activity recorded.</p> : <DataTable columns={paymentColumns} rows={payments} />}</Card>
      <Card className="overflow-hidden"><div className="border-b border-pamoja-forest/8 px-5 py-4"><p className="pamoja-eyebrow">Payout activity</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Recent payouts</h2></div>{payouts.length === 0 ? <p className="p-5 text-sm text-pamoja-muted">No payout activity recorded.</p> : <DataTable columns={payoutColumns} rows={payouts} />}</Card>
      <Card className="overflow-hidden"><div className="border-b border-pamoja-forest/8 px-5 py-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-pamoja-forest" aria-hidden="true" /><h2 className="text-lg font-semibold text-pamoja-forest-deep">Financial Ledger</h2></div><p className="mt-1 text-sm text-pamoja-muted">Append-only ledger entries. This view is read-only.</p></div>{ledger.length === 0 ? <p className="p-5 text-sm text-pamoja-muted">No ledger entries recorded.</p> : <DataTable columns={ledgerColumns} rows={ledger} />}</Card>
    </div>
  );
};
