import { useCallback, useEffect, useState } from 'react';
import { Building2, ExternalLink, RefreshCw, Search, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { getApiError } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { adminApi } from '../services/adminApi';

const statusTone = (status) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'SUSPENDED') return 'neutral';
  return 'pending';
};

export const FinancialAccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Pamoja | Financial accounts';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await adminApi.financialAccounts({ search, status, page, pageSize: 25 });
      setAccounts(data.accounts || []);
      setSummary(data.summary || null);
      setPagination(data.pagination || null);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load financial accounts.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const columns = [
    {
      key: 'cooperativeName',
      label: 'Ajo group',
      render: (row) => <div><p className="font-semibold text-pamoja-ink">{row.cooperativeName}</p><p className="text-xs text-pamoja-muted">Group #{row.cooperativeId}</p></div>
    },
    { key: 'provider', label: 'Provider', render: (row) => row.provider || '-' },
    {
      key: 'providerIdentity',
      label: 'Provider identity',
      render: (row) => row.providerIdentity || (row.providerIdentityCount ? `${row.providerIdentityCount} identities` : '-')
    },
    { key: 'totalContributions', label: 'Contributions', render: (row) => formatCurrency(row.totalContributions) },
    { key: 'totalPaidOut', label: 'Paid out', render: (row) => formatCurrency(row.totalPaidOut) },
    { key: 'availableForPayout', label: 'Available', render: (row) => formatCurrency(row.availableForPayout) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={statusTone(row.status)}>{row.status}</StatusBadge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => <Link className="pamoja-focus inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-pamoja-forest hover:bg-pamoja-sage" to={`/admin/financial-accounts/${row.cooperativeId}`}>View account <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    }
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Platform administration"
        title="Ajo Financial Accounts"
        description="Monitor provider identities, Ajo balances, contributions and payouts."
        actions={<Button type="button" variant="secondary" onClick={load} loading={loading}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</Button>}
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="pamoja-eyebrow">Total Ajo accounts</p><p className="mt-2 text-2xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : summary?.totalAccounts || 0}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><Building2 className="h-5 w-5" aria-hidden="true" /></span></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="pamoja-eyebrow">Active accounts</p><p className="mt-2 text-2xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : summary?.activeAccounts || 0}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><WalletCards className="h-5 w-5" aria-hidden="true" /></span></div></Card>
        <Card className="p-5"><p className="pamoja-eyebrow">Confirmed contributions</p><p className="mt-2 text-2xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : formatCurrency(summary?.totalContributions)}</p><p className="mt-1 text-xs text-pamoja-muted">Ledger credits only</p></Card>
        <Card className="p-5"><p className="pamoja-eyebrow">Available for payout</p><p className="mt-2 text-2xl font-bold tabular-nums text-pamoja-forest-deep">{loading ? '-' : formatCurrency(summary?.availableForPayout)}</p><p className="mt-1 text-xs text-pamoja-muted">After confirmed and reserved payouts</p></Card>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search Ajo groups</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pamoja-muted" aria-hidden="true" /><input className="pamoja-focus h-11 w-full rounded-lg border border-pamoja-forest/12 bg-white pl-9 pr-3 text-sm" placeholder="Search Ajo groups..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
          <label><span className="sr-only">Filter by status</span><select className="pamoja-focus h-11 min-w-44 rounded-lg border border-pamoja-forest/12 bg-white px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">ACTIVE</option><option value="PROVISIONING">PROVISIONING</option><option value="FAILED">FAILED</option><option value="SUSPENDED">SUSPENDED</option></select></label>
          <Button type="submit" variant="secondary"><Search className="h-4 w-4" aria-hidden="true" />Search</Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-pamoja-forest/8 px-5 py-4"><p className="pamoja-eyebrow">Ajo directory</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Financial account positions</h2></div>
        {loading ? <LoadingState label="Loading financial accounts..." /> : accounts.length === 0 ? <div className="p-5"><EmptyState title="No financial accounts found" description="No Ajo groups match the current search and status filters." icon={Building2} /></div> : <DataTable columns={columns} rows={accounts} />}
        {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between gap-3 border-t border-pamoja-forest/8 px-5 py-4 text-sm"><span className="text-pamoja-muted">Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><Button type="button" variant="secondary" disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button type="button" variant="secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>}
      </Card>
    </div>
  );
};
