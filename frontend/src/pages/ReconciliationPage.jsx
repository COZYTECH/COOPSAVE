import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Download, RefreshCcw } from 'lucide-react';
import { reconciliationApi } from '../services/reconciliationApi';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { compactNumber, formatCurrency, formatDate } from '../lib/format';
import { getStatusTone } from '../lib/status';
import { usePaymentEvents } from '../hooks/usePaymentEvents';

const emptyData = {
  summary: { matchedCount: 0, missingCount: 0, failedCount: 0, totalMatched: 0 },
  matched_transactions: [],
  missing_transactions: [],
  failed_transactions: []
};

export const ReconciliationPage = () => {
  const [data, setData] = useState(emptyData);
  const [activeTab, setActiveTab] = useState('matched');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Pamoja | Reconciliation';
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setData(await reconciliationApi.get());
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load reconciliation data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  usePaymentEvents(loadData);

  const csvRows = useMemo(() => {
    const header = [
      'request_id',
      'transaction_id',
      'member',
      'group',
      'amount',
      'status',
      'created_at'
    ];

    const rows = data.matched_transactions.map((transaction) => [
      transaction.requestId,
      transaction.transactionId,
      transaction.memberName,
      transaction.cooperativeName,
      transaction.amount,
      transaction.status,
      transaction.createdAt
    ]);

    return [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }, [data.matched_transactions]);

  const downloadCsv = () => {
    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pamoja-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const transactionColumns = [
    { key: 'requestId', label: 'Request ID' },
    { key: 'transactionId', label: 'Transaction ID', render: (row) => row.transactionId || '-' },
    { key: 'memberName', label: 'Member' },
    { key: 'cooperativeName', label: 'Group' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => <span className="font-semibold tabular-nums text-ink">{formatCurrency(row.amount)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={getStatusTone(row.status)}>{row.status || 'Matched'}</StatusBadge>
    },
    { key: 'createdAt', label: 'Received', render: (row) => formatDate(row.createdAt) }
  ];

  const contributionColumns = [
    { key: 'requestId', label: 'Request ID' },
    { key: 'memberName', label: 'Member' },
    { key: 'accountRef', label: 'Account ref' },
    { key: 'cooperativeName', label: 'Group' },
    {
      key: 'processed',
      label: 'Processed',
      render: (row) => <StatusBadge status={row.processed ? 'success' : 'pending'}>{row.processed ? 'Processed' : 'Not processed'}</StatusBadge>
    },
    { key: 'createdAt', label: 'Received', render: (row) => formatDate(row.createdAt) }
  ];

  const failedColumns = [
    { key: 'requestId', label: 'Request ID' },
    { key: 'memberName', label: 'Member', render: (row) => row.memberName || '-' },
    { key: 'accountRef', label: 'Account ref', render: (row) => row.accountRef || '-' },
    { key: 'source', label: 'Source', render: (row) => row.source || 'transaction' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={getStatusTone(row.status)}>{row.status || (row.processed ? 'Processed' : 'Failed')}</StatusBadge>
    },
    { key: 'createdAt', label: 'Received', render: (row) => formatDate(row.createdAt) }
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-pamoja-forest p-5 text-white shadow-pamoja-deep sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status="success">Financial operations</StatusBadge><StatusBadge status={data.summary.missingCount + data.summary.failedCount ? 'pending' : 'neutral'}>{data.summary.missingCount + data.summary.failedCount ? 'Review required' : 'Clear queue'}</StatusBadge></div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Reconciliation</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-sage-deep">Review historical provider records and items that still need attention. New Flutterwave identity processing is not reconciled into cycles yet.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadData} loading={loading}><RefreshCcw className="h-4 w-4" aria-hidden="true" /> Refresh</Button>
            <Button onClick={downloadCsv} disabled={data.matched_transactions.length === 0} className="bg-pamoja-ochre text-white hover:bg-pamoja-ochre/90"><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Matched value</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : formatCurrency(data.summary.totalMatched)}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Successful payment events</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Matched records</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : compactNumber(data.summary.matchedCount)}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Request IDs reconciled</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Exceptions</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : compactNumber(data.summary.missingCount + data.summary.failedCount)}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Missing and failed items</p></div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-ink/8 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="pamoja-eyebrow">Settlement review</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">Payment matching queue</h2>
            <p className="mt-1 text-sm text-ink/55">Review the provider records currently available to the application.</p>
          </div>
          <Tabs
            items={[
              { key: 'matched', label: 'Matched' },
              { key: 'missing', label: 'Missing' },
              { key: 'failed', label: 'Failed' }
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingState label="Loading reconciliation..." />
          ) : activeTab === 'matched' ? (
            data.matched_transactions.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No reconciled transactions"
                description="Historical successful payment records will appear here when they match a legacy member account reference."
              />
            ) : (
              <DataTable plain columns={transactionColumns} rows={data.matched_transactions} />
            )
          ) : activeTab === 'missing' ? (
            data.missing_transactions.length === 0 ? (
              <EmptyState
                icon={RefreshCcw}
                title="No missing transactions"
                description="Webhook payloads without matching transaction records will appear here."
              />
            ) : (
              <DataTable plain columns={contributionColumns} rows={data.missing_transactions} />
            )
          ) : data.failed_transactions.length === 0 ? (
              <EmptyState
              icon={CircleAlert}
              title="No failed transactions"
              description="Failed transaction records and unprocessed webhook payloads will appear here."
            />
          ) : (
            <DataTable plain columns={failedColumns} rows={data.failed_transactions} />
          )}
        </div>
      </Card>
    </div>
  );
};
