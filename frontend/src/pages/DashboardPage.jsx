import { BadgeDollarSign, Building2, RefreshCcw, Users } from 'lucide-react';
import { Alert } from '../components/ui/Alert.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { useDashboardData } from '../hooks/useDashboardData';
import { compactNumber, formatCurrency, formatDate } from '../lib/format';

export const DashboardPage = () => {
  const { cooperatives, members, reconciliation, loading, error } = useDashboardData();
  const transactions = reconciliation.matched_transactions.slice(0, 6);

  const columns = [
    { key: 'requestId', label: 'Request ID' },
    { key: 'memberName', label: 'Member' },
    { key: 'cooperativeName', label: 'Cooperative' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => <span className="font-semibold text-ink">{formatCurrency(row.amount)}</span>
    },
    { key: 'createdAt', label: 'Date', render: (row) => formatDate(row.createdAt) }
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational view of cooperative growth, member records, and payment settlement."
      />

      {error && <Alert>{error}</Alert>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cooperatives"
          value={loading ? '-' : compactNumber(cooperatives.length)}
          detail="Owned groups"
          icon={Building2}
          accent="moss"
        />
        <StatCard
          label="Members"
          value={loading ? '-' : compactNumber(members.length)}
          detail="Registered savers"
          icon={Users}
          accent="gold"
        />
        <StatCard
          label="Matched"
          value={loading ? '-' : formatCurrency(reconciliation.summary.totalMatched)}
          detail={`${compactNumber(reconciliation.summary.matchedCount)} payments`}
          icon={BadgeDollarSign}
          accent="clay"
        />
        <StatCard
          label="Exceptions"
          value={
            loading
              ? '-'
              : compactNumber(
                  reconciliation.summary.missingCount + reconciliation.summary.failedCount
                )
          }
          detail="Missing and failed items"
          icon={RefreshCcw}
          accent="ink"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Recent payment activity</h2>
          </div>
          <DataTable columns={columns} rows={transactions} emptyMessage="No processed payments yet." />
        </Card>

        <Card className="p-4">
          <h2 className="text-base font-bold text-ink">Portfolio mix</h2>
          <div className="mt-4 space-y-3">
            {cooperatives.slice(0, 5).map((cooperative) => {
              const memberCount = members.filter(
                (member) => String(member.cooperativeId) === String(cooperative.id)
              ).length;
              const percentage = members.length ? Math.round((memberCount / members.length) * 100) : 0;

              return (
                <div key={cooperative.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-ink">{cooperative.name}</span>
                    <span className="text-ink/50">{percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink/8">
                    <div className="h-2 rounded-full bg-moss" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!loading && cooperatives.length === 0 && (
              <p className="text-sm text-ink/55">Create a cooperative to begin tracking members.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
