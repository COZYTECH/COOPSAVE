import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CheckCircle2, Download, RefreshCcw } from 'lucide-react';
import { reconciliationApi } from '../services/reconciliationApi';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { compactNumber, formatCurrency, formatDate } from '../lib/format';
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
      'cooperative',
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
    link.download = `coopsave-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const transactionColumns = [
    { key: 'requestId', label: 'Request ID' },
    { key: 'transactionId', label: 'Transaction ID', render: (row) => row.transactionId || '-' },
    { key: 'memberName', label: 'Member' },
    { key: 'cooperativeName', label: 'Cooperative' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.amount)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className="rounded-full bg-mint px-2 py-1 text-xs font-semibold text-moss">
          {row.status}
        </span>
      )
    },
    { key: 'createdAt', label: 'Received', render: (row) => formatDate(row.createdAt) }
  ];

  const contributionColumns = [
    { key: 'requestId', label: 'Request ID' },
    { key: 'memberName', label: 'Member' },
    { key: 'accountRef', label: 'Account ref' },
    { key: 'cooperativeName', label: 'Cooperative' },
    {
      key: 'processed',
      label: 'Processed',
      render: (row) => (row.processed ? 'Yes' : 'No')
    },
    { key: 'createdAt', label: 'Received', render: (row) => formatDate(row.createdAt) }
  ];

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        description="Review Nomba payment webhooks, matched member transactions, and contribution totals."
        actions={
          <>
            <Button variant="secondary" onClick={loadData} loading={loading}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Button onClick={downloadCsv} disabled={data.matched_transactions.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
          </>
        }
      />

      {error && <Alert>{error}</Alert>}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Processed value"
          value={loading ? '-' : formatCurrency(data.summary.totalMatched)}
          detail="Matched payment_success events"
          icon={BadgeDollarSign}
          accent="moss"
        />
        <StatCard
          label="Transactions"
          value={loading ? '-' : compactNumber(data.summary.matchedCount)}
          detail="Matched request IDs"
          icon={RefreshCcw}
          accent="gold"
        />
        <StatCard
          label="Exceptions"
          value={loading ? '-' : compactNumber(data.summary.missingCount + data.summary.failedCount)}
          detail="Missing and failed"
          icon={CheckCircle2}
          accent="ink"
        />
      </div>

      <Card className="mt-5 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-ink/10 bg-paper p-1">
            {[
              ['matched', 'Matched'],
              ['missing', 'Missing'],
              ['failed', 'Failed']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'h-9 rounded-md px-3 text-sm font-semibold transition',
                  activeTab === key ? 'bg-white text-moss shadow-sm' : 'text-ink/55 hover:text-ink'
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-ink/10 p-6 text-sm text-ink/55">Loading reconciliation...</div>
        ) : activeTab === 'matched' ? (
          data.matched_transactions.length === 0 ? (
            <EmptyState
              title="No reconciled transactions"
              description="Successful Nomba payment webhooks will appear here after they match a member account reference."
            />
          ) : (
            <DataTable columns={transactionColumns} rows={data.matched_transactions} />
          )
        ) : activeTab === 'missing' ? (
          data.missing_transactions.length === 0 ? (
            <EmptyState
              title="No missing transactions"
              description="Webhook payloads without matching transaction records will appear here."
            />
          ) : (
            <DataTable columns={contributionColumns} rows={data.missing_transactions} />
          )
        ) : data.failed_transactions.length === 0 ? (
          <EmptyState
            title="No failed transactions"
            description="Failed transaction records and unprocessed webhook payloads will appear here."
          />
        ) : (
          <DataTable columns={contributionColumns} rows={data.failed_transactions} />
        )}
      </Card>
    </div>
  );
};
