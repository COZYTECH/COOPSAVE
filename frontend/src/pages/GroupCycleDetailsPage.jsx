import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Banknote, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { getApiError } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { groupApi } from '../services/groupApi';

export const GroupCycleDetailsPage = () => {
  const { groupId, cycleId } = useParams();
  const [cycle, setCycle] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cycleData = await groupApi.cycle(groupId, cycleId);
      setCycle(cycleData);
      if (['ACTIVE', 'COMPLETED'].includes(cycleData.status)) {
        setEligibility(await groupApi.payoutEligibility(groupId, cycleId));
      } else {
        setEligibility(null);
      }
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load cycle.'));
    } finally {
      setLoading(false);
    }
  }, [groupId, cycleId]);

  useEffect(() => {
    document.title = 'Pamoja | Cycle details';
    load();
  }, [load]);

  const initiatePayout = async () => {
    if (!eligibility?.eligible || initiating) return;
    setInitiating(true);
    setError('');
    setNotice('');
    try {
      await groupApi.createPayout(groupId, cycleId);
      setNotice('Payout request submitted. Final status will appear after verification.');
      await load();
    } catch (payoutError) {
      setError(getApiError(payoutError, 'Unable to initiate payout.'));
    } finally {
      setInitiating(false);
    }
  };

  if (loading) return <LoadingState label="Loading cycle details..." />;
  if (error || !cycle) return <Alert>{error || 'Cycle not found.'}</Alert>;

  const expected = cycle.obligations.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0);
  const paid = cycle.obligations.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
  const outstanding = cycle.obligations.reduce((sum, item) => sum + Number(item.amountOutstanding || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Cycle detail" title={cycle.name} description={`Cycle ${cycle.cycleNumber} | ${cycle.frequency} | ${cycle.startDate}`} actions={<div className="flex gap-2"><Link to={`/groups/${groupId}/manage/cycles`} className="pamoja-focus inline-flex min-h-11 items-center gap-2 rounded-lg border border-pamoja-forest/12 bg-white px-4 text-sm font-semibold text-pamoja-forest"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Cycles</Link><Button type="button" variant="secondary" onClick={load}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</Button></div>} />
      {error && <Alert>{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      <Card className="p-5"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={cycle.status === 'ACTIVE' || cycle.status === 'COMPLETED' ? 'success' : 'pending'}>{cycle.status}</StatusBadge><span className="text-sm text-pamoja-muted">{formatCurrency(cycle.contributionAmount, cycle.currency)} | {cycle.gracePeriodDays || 0} grace days</span></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div><p className="text-xs text-pamoja-muted">Expected</p><p className="mt-1 font-semibold">{formatCurrency(expected, cycle.currency)}</p></div><div><p className="text-xs text-pamoja-muted">Paid / allocated</p><p className="mt-1 font-semibold text-pamoja-forest">{formatCurrency(paid, cycle.currency)}</p></div><div><p className="text-xs text-pamoja-muted">Outstanding</p><p className="mt-1 font-semibold text-pamoja-ochre">{formatCurrency(outstanding, cycle.currency)}</p></div><div><p className="text-xs text-pamoja-muted">Progress</p><p className="mt-1 font-semibold">{expected ? Math.round((paid / expected) * 100) : 0}%</p></div></div></Card>

      {eligibility && <Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="pamoja-eyebrow">Payout workflow</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">{cycle.status === 'COMPLETED' ? 'Cycle payout is ready for review' : 'Payout eligibility'}</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Completion makes the workflow available; the transfer is only created after you deliberately confirm it.</p></div>{eligibility.eligible && !eligibility.existingPayout && <Button type="button" loading={initiating} onClick={initiatePayout}><Banknote className="h-4 w-4" aria-hidden="true" />Initiate Payout</Button>}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Eligible amount</p><p className="mt-1 font-semibold text-pamoja-forest">{formatCurrency(eligibility.approvedAmount, eligibility.ledger?.currency || cycle.currency)}</p></div><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Recipient</p><p className="mt-1 font-semibold text-pamoja-ink">{eligibility.recipient?.name || 'Not configured'}</p></div><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Verified bank account</p><p className="mt-1 font-semibold text-pamoja-ink">{eligibility.bankAccount ? `${eligibility.bankAccount.bankName || 'Verified bank'} | ${eligibility.bankAccount.accountNumberMasked || 'Account masked'}` : 'Not configured'}</p></div></div>{eligibility.existingPayout && <p className="mt-4 rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted">A payout already exists for this cycle. Current status: <strong>{eligibility.existingPayout.status}</strong>.</p>}{!eligibility.eligible && !eligibility.existingPayout && <div className="mt-4 rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted"><p className="font-semibold text-pamoja-ink">Payout is not currently available.</p><ul className="mt-2 list-disc space-y-1 pl-5">{eligibility.reasons.map((item) => <li key={item.code}>{item.message}</li>)}</ul></div>}</Card>}

      <Card className="overflow-hidden"><div className="border-b border-pamoja-forest/8 px-5 py-4"><h2 className="text-lg font-semibold text-pamoja-forest-deep">Members and contributions</h2></div><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-left text-sm"><thead className="bg-pamoja-sage/60 text-xs uppercase tracking-[0.08em] text-pamoja-muted"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Expected</th><th className="px-5 py-3">Paid</th><th className="px-5 py-3">Outstanding</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-pamoja-forest/8">{cycle.obligations.map((item) => <tr key={item.id}><td className="px-5 py-3 font-semibold">{item.memberName || `Membership #${item.membershipId}`}</td><td className="px-5 py-3">{item.dueAt ? formatDate(item.dueAt) : '-'}</td><td className="px-5 py-3">{formatCurrency(item.expectedAmount, item.currency)}</td><td className="px-5 py-3">{formatCurrency(item.amountPaid, item.currency)}</td><td className="px-5 py-3">{formatCurrency(item.amountOutstanding, item.currency)}</td><td className="px-5 py-3"><StatusBadge status={item.status === 'PAID' ? 'success' : item.status === 'OVERDUE' ? 'danger' : 'pending'}>{item.status}</StatusBadge></td></tr>)}</tbody></table></div></Card>
    </div>
  );
};
