import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeDollarSign, Building2, CircleAlert, Clock3, FileCheck2, Users } from 'lucide-react';
import { Alert } from '../components/ui/Alert.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboardData } from '../hooks/useDashboardData';
import { compactNumber, formatCurrency, formatDate } from '../lib/format';
import { getStatusTone } from '../lib/status';

const getInitials = (name) => String(name || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

const Metric = ({ label, value, detail, tone = 'surface', icon: Icon }) => (
  <div className={['min-h-[126px] rounded-xl p-4', tone === 'forest' ? 'bg-pamoja-forest text-white' : tone === 'ochre' ? 'bg-orange-50 text-pamoja-ink' : 'bg-pamoja-sage/70 text-pamoja-ink'].join(' ')}>
    <div className="flex items-start justify-between gap-3">
      <p className={['text-[11px] font-semibold uppercase tracking-[0.1em]', tone === 'forest' ? 'text-pamoja-sage-deep' : 'text-pamoja-muted'].join(' ')}>{label}</p>
      {Icon && <Icon className={['h-4 w-4', tone === 'forest' ? 'text-pamoja-ochre' : 'text-pamoja-forest'].join(' ')} aria-hidden="true" />}
    </div>
    <p className={['mt-3 text-2xl font-bold tabular-nums tracking-[-0.02em]', tone === 'forest' ? 'text-white' : tone === 'ochre' ? 'text-pamoja-ochre' : 'text-pamoja-forest'].join(' ')}>{value}</p>
    <p className={['mt-1 text-xs', tone === 'forest' ? 'text-pamoja-sage-deep' : 'text-pamoja-muted'].join(' ')}>{detail}</p>
  </div>
);

export const DashboardPage = () => {
  const { cooperatives, members, reconciliation, loading, error } = useDashboardData();
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const currentGroup = cooperatives[0];
  const groupMembers = currentGroup
    ? members.filter((member) => String(member.cooperativeId) === String(currentGroup.id))
    : members;
  const totalRecords = reconciliation.summary.matchedCount + reconciliation.summary.failedCount;
  const matchRate = totalRecords ? Math.round((reconciliation.summary.matchedCount / totalRecords) * 100) : 0;
  const exceptions = reconciliation.summary.missingCount + reconciliation.summary.failedCount;
  const activity = [
    ...reconciliation.matched_transactions,
    ...reconciliation.failed_transactions
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6);

  useEffect(() => {
    document.title = 'Pamoja | Dashboard';
  }, []);

  const activityColumns = [
    {
      key: 'memberName',
      label: 'Record',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pamoja-sage text-xs font-bold text-pamoja-forest" aria-hidden="true">
            {getInitials(row.memberName || row.senderName || row.accountRef)}
          </span>
          <div>
            <p className="font-semibold text-pamoja-ink">{row.memberName || row.senderName || 'Unmatched record'}</p>
            <p className="text-xs text-pamoja-muted">{row.requestId || row.transactionId || row.accountRef || 'No reference'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => row.amount === undefined ? '-' : <span className="font-semibold tabular-nums text-pamoja-ink">{formatCurrency(row.amount)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={getStatusTone(row.status || (row.processed ? 'success' : 'pending'))}>{row.status || (row.processed ? 'Processed' : 'Review')}</StatusBadge>
    },
    { key: 'createdAt', label: 'Received', render: (row) => formatDate(row.createdAt) }
  ];

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="pamoja-eyebrow">Group admin overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-pamoja-forest-deep sm:text-4xl">Good morning, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-muted">Keep your groups, members, and payment records in view from one calm operating space.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/cooperatives" className="pamoja-focus inline-flex min-h-11 items-center gap-2 rounded-lg bg-pamoja-forest px-4 text-sm font-semibold text-white shadow-pamoja-soft hover:bg-pamoja-forest-deep"><Building2 className="h-4 w-4" aria-hidden="true" /> Manage groups</Link>
          <Link to="/reconciliation" className="pamoja-focus inline-flex min-h-11 items-center gap-2 rounded-lg border border-pamoja-forest/12 bg-white px-4 text-sm font-semibold text-pamoja-forest hover:bg-pamoja-sage"><FileCheck2 className="h-4 w-4" aria-hidden="true" /> Review activity</Link>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      <section className="overflow-hidden rounded-2xl bg-white p-4 shadow-pamoja-raised sm:p-5">
        <div className="flex flex-col gap-4 border-b border-pamoja-forest/8 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-pamoja-forest text-white"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-pamoja-forest-deep">{currentGroup?.name || 'Pamoja workspace'}</h2>
                <StatusBadge status={currentGroup ? 'success' : 'neutral'}>{currentGroup ? 'Active group' : 'No group selected'}</StatusBadge>
              </div>
              <p className="mt-1 text-sm text-pamoja-muted">{currentGroup?.description || 'Create a group to begin organizing members and payment records.'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-pamoja-muted">
            <span>{compactNumber(cooperatives.length)} group{cooperatives.length === 1 ? '' : 's'}</span>
            <span>{compactNumber(members.length)} member{members.length === 1 ? '' : 's'}</span>
            <span>Operational data only</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Matched payment value" value={loading ? '-' : formatCurrency(reconciliation.summary.totalMatched)} detail="Successful records" tone="forest" icon={BadgeDollarSign} />
          <Metric label="Group members" value={loading ? '-' : compactNumber(groupMembers.length)} detail="In the selected group" icon={Users} />
          <Metric label="Match rate" value={loading ? '-' : `${matchRate}%`} detail={totalRecords ? `${reconciliation.summary.matchedCount} of ${totalRecords} records` : 'Awaiting payment records'} icon={FileCheck2} />
          <Metric label="Exceptions" value={loading ? '-' : compactNumber(exceptions)} detail="Missing or failed review items" tone={exceptions ? 'ochre' : 'surface'} icon={exceptions ? CircleAlert : Clock3} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-pamoja-forest/8 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="pamoja-eyebrow">Financial operations</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-pamoja-forest-deep">Recent activity</h2>
              <p className="mt-1 text-sm text-pamoja-muted">Verified payment and reconciliation records from your account.</p>
            </div>
            <Link to="/reconciliation" className="pamoja-focus inline-flex items-center gap-1 text-sm font-semibold text-pamoja-forest hover:text-pamoja-ochre">View full ledger <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          {loading ? <div className="p-5"><LoadingState label="Loading activity..." compact /></div> : activity.length === 0 ? (
            <div className="p-5"><EmptyState icon={FileCheck2} title="No payment activity yet" description="Successful payment records and review items will appear here when the backend receives them." /></div>
          ) : <DataTable plain columns={activityColumns} rows={activity} emptyMessage="No activity yet." />}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="pamoja-eyebrow">Data health</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-pamoja-forest-deep">Operations status</h2></div>
              <span className={['grid h-10 w-10 place-items-center rounded-full', exceptions ? 'bg-orange-100 text-pamoja-ochre' : 'bg-pamoja-sage text-pamoja-forest'].join(' ')}><FileCheck2 className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-pamoja-sage/70 px-3 py-3 text-sm"><span className="text-pamoja-muted">Matched records</span><span className="font-semibold tabular-nums text-pamoja-forest">{loading ? '-' : reconciliation.summary.matchedCount}</span></div>
              <div className="flex items-center justify-between rounded-lg bg-pamoja-sage/70 px-3 py-3 text-sm"><span className="text-pamoja-muted">Missing records</span><span className="font-semibold tabular-nums text-pamoja-ochre">{loading ? '-' : reconciliation.summary.missingCount}</span></div>
              <div className="flex items-center justify-between rounded-lg bg-pamoja-sage/70 px-3 py-3 text-sm"><span className="text-pamoja-muted">Failed records</span><span className="font-semibold tabular-nums text-pamoja-ochre">{loading ? '-' : reconciliation.summary.failedCount}</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="pamoja-eyebrow">Group directory</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-pamoja-forest-deep">Your groups</h2></div><Link to="/cooperatives" className="pamoja-focus text-sm font-semibold text-pamoja-forest" aria-label="Manage groups"><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
            <div className="mt-4 space-y-2">
              {loading ? <LoadingState label="Loading groups..." compact /> : cooperatives.length === 0 ? <p className="rounded-lg bg-pamoja-sage/70 p-4 text-sm leading-6 text-pamoja-muted">No groups yet. Create one to start organizing members.</p> : cooperatives.slice(0, 4).map((group) => {
                const count = members.filter((member) => String(member.cooperativeId) === String(group.id)).length;
                return <Link key={group.id} to="/cooperatives" className="pamoja-focus flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-pamoja-sage/70"><span className="grid h-9 w-9 place-items-center rounded-lg bg-pamoja-sage text-pamoja-forest"><Building2 className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-pamoja-ink">{group.name}</span><span className="block text-xs text-pamoja-muted">{count} member{count === 1 ? '' : 's'}</span></span><ArrowRight className="h-4 w-4 text-pamoja-muted" aria-hidden="true" /></Link>;
              })}
            </div>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-pamoja-forest/8 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="pamoja-eyebrow">Member directory</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-pamoja-forest-deep">Roster snapshot</h2><p className="mt-1 text-sm text-pamoja-muted">Identity and assigned account references currently stored by the application.</p></div>
          <Link to="/members" className="pamoja-focus inline-flex items-center gap-1 text-sm font-semibold text-pamoja-forest">View members <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {loading ? <div className="p-5"><LoadingState label="Loading members..." compact /></div> : members.length === 0 ? <div className="p-5"><EmptyState icon={Users} title="No members yet" description="Members added to your groups will appear in this roster." /></div> : (
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.slice(0, 6).map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-pamoja-sage/60 p-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-bold text-pamoja-forest">{getInitials(member.fullName)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-pamoja-ink">{member.fullName}</p><p className="truncate text-xs text-pamoja-muted">{member.accountRef || 'Account not assigned'}</p></div><StatusBadge status={member.accountRef ? 'success' : 'neutral'}>{member.accountRef ? 'Assigned' : 'Pending'}</StatusBadge></div>)}
          </div>
        )}
      </Card>
    </div>
  );
};
