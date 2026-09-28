import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Copy, MailPlus, Play, Users, WalletCards, Banknote, CreditCard } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { usePaymentEvents } from '../hooks/usePaymentEvents';
import { getApiError } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { groupApi } from '../services/groupApi';

const getToday = () => new Date().toISOString().slice(0, 10);

const getObligationCycleLabel = (obligation) => {
  if (obligation.cycleNumber && obligation.cycleName) {
    return `Cycle ${obligation.cycleNumber}: ${obligation.cycleName}`;
  }

  return obligation.cycleName || (obligation.cycleNumber ? `Cycle ${obligation.cycleNumber}` : 'Cycle');
};

const getPaymentIdentityDisplay = (identity) => {
  if (identity?.status === 'ACTIVE') {
    return { label: 'Ready', tone: 'success' };
  }

  if (identity?.status === 'FAILED') {
    return { label: 'Setup unavailable', tone: 'danger' };
  }

  return { label: 'Setup pending', tone: 'neutral' };
};

const getPayoutStatusDisplay = (status) => {
  if (status === 'SUCCESS') {
    return { label: 'Completed', tone: 'success' };
  }

  if (status === 'FAILED') {
    return { label: 'Payment issue', tone: 'danger' };
  }

  if (status === 'RECONCILIATION_REQUIRED') {
    return { label: 'Pending verification', tone: 'pending' };
  }

  return { label: 'Pending', tone: 'pending' };
};

const getPayoutEligibilityMessage = (code) => ({
  CYCLE_NOT_ELIGIBLE: 'This cycle is not ready for payout.',
  CONTRIBUTIONS_OUTSTANDING: 'Some member contributions are still outstanding.',
  RECIPIENT_NOT_VERIFIED: 'Configure a verified recipient and bank account.',
  PAYOUT_ALREADY_PENDING: 'A payout is already being processed for this cycle.',
  PAYMENT_VERIFICATION_PENDING: 'Payout is pending payment verification.',
  INSUFFICIENT_AVAILABLE_BALANCE: 'There is no available balance for payout.'
}[code] || 'Payout is not ready yet.');

export const GroupAdminDashboardPage = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [paymentIdentities, setPaymentIdentities] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [obligations, setObligations] = useState([]);
  const [myObligations, setMyObligations] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [creatingPayout, setCreatingPayout] = useState(false);
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [startingCycleId, setStartingCycleId] = useState(null);
  const [cycleForm, setCycleForm] = useState({
    name: '',
    contribution_amount: '',
    currency: 'NGN',
    frequency: 'MONTHLY',
    start_date: getToday(),
    end_date: '',
    membership_ids: []
  });
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [groupData, memberData, identityData, cycleData, obligationData, payoutData, myObligationData] = await Promise.all([
        groupApi.get(groupId),
        groupApi.members(groupId),
        groupApi.paymentIdentities(groupId),
        groupApi.cycles(groupId),
        groupApi.obligations(groupId),
        groupApi.payouts(groupId),
        groupApi.myContributions(groupId)
      ]);
      setGroup(groupData);
      setMembers(memberData);
      setPaymentIdentities(identityData);
      setCycles(cycleData);
      setObligations(obligationData);
      setMyObligations(myObligationData);
      setPayouts(payoutData);
      const currentCycle = cycleData.find((cycle) => ['ACTIVE', 'COMPLETED'].includes(cycle.status));
      setEligibility(currentCycle ? await groupApi.payoutEligibility(groupId, currentCycle.id) : null);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load this Ajo.'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  usePaymentEvents(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    document.title = 'Pamoja | Ajo admin';
    load();
  }, [load]);

  useEffect(() => {
    if (members.length === 0) return;
    setCycleForm((current) => current.membership_ids.length === 0
      ? { ...current, membership_ids: members.map((member) => member.id) }
      : current);
  }, [members]);

  const createInvite = async () => {
    setCreatingInvite(true);
    setError('');
    setNotice('');

    try {
      setInvite(await groupApi.createInvitation(groupId));
      setNotice('Invite created. Share the code securely with the intended member.');
    } catch (inviteError) {
      setError(getApiError(inviteError, 'Unable to create an invite.'));
    } finally {
      setCreatingInvite(false);
    }
  };

  const copyInvite = async () => {
    if (!invite?.code || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(invite.code);
    setNotice('Invite code copied.');
  };

  const updateCycleField = (field) => (event) => {
    setCycleForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const toggleCycleMember = (membershipId) => {
    setCycleForm((current) => {
      const selected = current.membership_ids.map(String);
      const id = String(membershipId);
      const membershipIds = selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id];
      return { ...current, membership_ids: membershipIds };
    });
  };

  const createCycle = async (event) => {
    event.preventDefault();
    setCreatingCycle(true);
    setError('');
    setNotice('');

    if (cycleForm.membership_ids.length === 0) {
      setError('Select at least one eligible member for this cycle.');
      setCreatingCycle(false);
      return;
    }

    try {
      await groupApi.createCycle(groupId, {
        name: cycleForm.name.trim(),
        contribution_amount: cycleForm.contribution_amount,
        currency: cycleForm.currency,
        frequency: cycleForm.frequency,
        start_date: cycleForm.start_date,
        end_date: cycleForm.end_date || null,
        membership_ids: cycleForm.membership_ids
      });
      setCycleForm({
        name: '',
        contribution_amount: '',
        currency: 'NGN',
        frequency: 'MONTHLY',
        start_date: getToday(),
        end_date: '',
        membership_ids: members.map((member) => member.id)
      });
      setNotice('Draft cycle created. Start it to generate member obligations.');
      await load();
    } catch (cycleError) {
      setError(getApiError(cycleError, 'Unable to create the cycle.'));
    } finally {
      setCreatingCycle(false);
    }
  };

  const startCycle = async (cycleId) => {
    setStartingCycleId(cycleId);
    setError('');
    setNotice('');

    try {
      await groupApi.startCycle(groupId, cycleId);
      setNotice('Cycle started. Contribution obligations are now available.');
      await load();
    } catch (cycleError) {
      setError(getApiError(cycleError, 'Unable to start the cycle.'));
    } finally {
      setStartingCycleId(null);
    }
  };

  const createPayout = async () => {
    const cycleId = eligibility?.cycle?.id;
    if (!cycleId) return;
    setCreatingPayout(true);
    setError('');
    try {
      const payout = await groupApi.createPayout(groupId, cycleId);
      setPayouts((current) => [payout, ...current]);
      setNotice('Payout request submitted. Final status will appear after verification.');
      await load();
    } catch (payoutError) {
      setError(getApiError(payoutError, 'Unable to initiate payout.'));
    } finally {
      setCreatingPayout(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Ajo workspace..." />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-pamoja-forest p-5 text-white shadow-pamoja-deep sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status="success">Group admin</StatusBadge><StatusBadge status="neutral">Operational workspace</StatusBadge></div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{group?.name || 'Ajo workspace'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-sage-deep">{group?.description || 'Manage members and group records from this Ajo-specific workspace.'}</p>
          </div>
          <Link to="/cooperatives" className="pamoja-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10">All groups</Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Members</p><p className="mt-2 text-2xl font-bold tabular-nums">{members.length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Records in this Ajo</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Group admins</p><p className="mt-2 text-2xl font-bold tabular-nums">{members.filter((member) => member.role === 'GROUP_ADMIN').length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">People with management access</p></div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><MailPlus className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Invite members</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Create a secure invite</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">The code is generated securely and can be used once. It is not stored in plain text.</p></div></div>
          <Button type="button" loading={creatingInvite} onClick={createInvite} className="mt-5"><MailPlus className="h-4 w-4" aria-hidden="true" />Create invite</Button>
          {invite && <div className="mt-4 rounded-xl border border-pamoja-forest/10 bg-pamoja-sage/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-pamoja-muted">Share this code</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm font-bold text-pamoja-forest">{invite.code}</code><button type="button" onClick={copyInvite} className="pamoja-focus grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-pamoja-forest" aria-label="Copy invite code" title="Copy invite code"><Copy className="h-4 w-4" aria-hidden="true" /></button></div><p className="mt-2 text-xs text-pamoja-muted">Expires {formatDate(invite.expiresAt)}</p></div>}
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><WalletCards className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Contribution tracking</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Ajo cycles and obligations</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Track expected contributions, payments received, and outstanding balances for this group.</p></div></div><Link to={`/groups/${groupId}/manage/cycles`} className="pamoja-focus inline-flex shrink-0 items-center rounded-lg border border-pamoja-forest/12 px-3 py-2 text-xs font-semibold text-pamoja-forest">Open Cycles</Link></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Cycles</p><p className="mt-1 text-2xl font-bold text-pamoja-forest">{cycles.length}</p></div><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Expected</p><p className="mt-1 text-lg font-bold text-pamoja-forest">{formatCurrency(obligations.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0))}</p></div><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Outstanding</p><p className="mt-1 text-lg font-bold text-pamoja-ochre">{formatCurrency(obligations.reduce((sum, item) => sum + Number(item.amountOutstanding || 0), 0))}</p></div></div>
          <div className="mt-4 space-y-2">{obligations.slice(0, 4).map((obligation) => <div key={obligation.id} className="flex items-center justify-between gap-3 rounded-lg border border-pamoja-forest/8 px-3 py-3"><div><p className="text-sm font-semibold text-pamoja-ink">{obligation.memberName}</p><p className="text-xs text-pamoja-muted">{getObligationCycleLabel(obligation)}</p><p className="text-xs text-pamoja-muted">Paid {formatCurrency(obligation.amountPaid)} of {formatCurrency(obligation.expectedAmount)}</p></div><StatusBadge status={obligation.status === 'PAID' ? 'success' : obligation.status === 'EXCESS_PENDING_REVIEW' ? 'pending' : 'neutral'}>{obligation.status}</StatusBadge></div>)}</div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><CreditCard className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Personal financial view</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">My contribution</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Your administrator role does not remove your access to obligations where you are selected as a cycle member.</p></div></div><Link to={`/groups/${groupId}`} className="pamoja-focus inline-flex shrink-0 items-center rounded-lg border border-pamoja-forest/12 px-3 py-2 text-xs font-semibold text-pamoja-forest">View my contributions</Link></div>{myObligations.length === 0 ? <p className="mt-4 rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted">You are not selected in an active cycle.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-3">{myObligations.slice(0, 3).map((obligation) => <div key={obligation.id} className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-sm font-semibold text-pamoja-ink">{obligation.cycleName || 'Ajo cycle'}</p><p className="mt-1 text-xs text-pamoja-muted">{obligation.status} ? Due {obligation.dueAt ? formatDate(obligation.dueAt) : 'scheduled'}</p><p className="mt-2 text-sm font-semibold text-pamoja-forest">Paid {formatCurrency(obligation.amountPaid, obligation.currency)}</p><p className="text-xs text-pamoja-ochre">Outstanding {formatCurrency(obligation.amountOutstanding, obligation.currency)}</p></div>)}</div>}</Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><CalendarPlus className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Cycle setup</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Create a contribution cycle</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">Choose the members who should contribute. Starting the draft asks the backend to generate one obligation for each selected member.</p></div></div>
        <form className="mt-5 space-y-5" onSubmit={createCycle}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField id="cycle-name" label="Cycle name" value={cycleForm.name} onChange={updateCycleField('name')} placeholder="July savings cycle" required />
            <FormField id="cycle-amount" label="Contribution amount" type="number" value={cycleForm.contribution_amount} onChange={updateCycleField('contribution_amount')} placeholder="10000" required />
            <FormField id="cycle-currency" label="Currency" as="select" value={cycleForm.currency} onChange={updateCycleField('currency')} required><option value="NGN">NGN</option><option value="GHS">GHS</option><option value="KES">KES</option></FormField>
            <FormField id="cycle-frequency" label="Frequency" as="select" value={cycleForm.frequency} onChange={updateCycleField('frequency')} required><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="ONE_TIME">One time</option></FormField>
            <FormField id="cycle-start-date" label="Start date" type="date" value={cycleForm.start_date} onChange={updateCycleField('start_date')} required />
            <FormField id="cycle-end-date" label="End date" type="date" value={cycleForm.end_date} onChange={updateCycleField('end_date')} />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-pamoja-body">Eligible members</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => <label key={member.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-pamoja-forest/10 bg-pamoja-sage/40 p-3 text-sm"><input type="checkbox" checked={cycleForm.membership_ids.map(String).includes(String(member.id))} onChange={() => toggleCycleMember(member.id)} className="mt-1 h-4 w-4 accent-pamoja-forest" /><span><span className="block font-semibold text-pamoja-ink">{member.fullName}</span><span className="block text-xs text-pamoja-muted">{member.email}</span></span></label>)}
            </div>
            {members.length === 0 && <p className="mt-2 text-sm text-pamoja-muted">Add members before creating a cycle.</p>}
          </fieldset>
          <Button type="submit" loading={creatingCycle} disabled={members.length === 0}><CalendarPlus className="h-4 w-4" aria-hidden="true" />Create draft cycle</Button>
        </form>
      </Card>

      <section>
        <div className="flex items-center justify-between gap-3"><div><p className="pamoja-eyebrow">Cycle operations</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Cycles and obligations</h2><p className="mt-1 text-sm text-pamoja-muted">Each cycle keeps its own contribution schedule and financial history.</p></div><WalletCards className="h-5 w-5 text-pamoja-ochre" aria-hidden="true" /></div>
        <div className="mt-5 space-y-5">
          {cycles.length === 0 && <Card className="p-5"><EmptyState icon={CalendarPlus} title="No cycles yet" description="Create a draft cycle to define contribution obligations for this Ajo." /></Card>}
          {cycles.map((cycle) => {
            const cycleObligations = obligations.filter((obligation) => String(obligation.cycleId) === String(cycle.id));
            return (
              <Card key={cycle.id} className="overflow-hidden border border-pamoja-forest/10 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-pamoja-forest/10 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-pamoja-forest-deep">{cycle.name}</h3><StatusBadge status={cycle.status === 'ACTIVE' ? 'success' : cycle.status === 'DRAFT' ? 'pending' : 'neutral'}>{cycle.status}</StatusBadge></div>
                    <p className="mt-2 text-sm text-pamoja-muted">Cycle {cycle.cycleNumber} | {formatCurrency(cycle.contributionAmount, cycle.currency)} {cycle.currency} per member | {cycle.frequency}</p>
                    <p className="mt-1 text-xs text-pamoja-muted">Starts {formatDate(cycle.startDate)}{cycle.endDate ? ' - ' + formatDate(cycle.endDate) : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">{cycle.status === 'COMPLETED' && <Link to={`/groups/${groupId}/manage/cycles/${cycle.id}`} className="pamoja-focus inline-flex min-h-10 items-center gap-2 rounded-lg bg-pamoja-forest px-3 text-sm font-semibold text-white"><Banknote className="h-4 w-4" aria-hidden="true" />Review payout</Link>}{cycle.status === 'DRAFT' && <Button type="button" loading={startingCycleId === cycle.id} onClick={() => startCycle(cycle.id)}><Play className="h-4 w-4" aria-hidden="true" />Start cycle</Button>}</div>
                </div>
                {cycleObligations.length === 0 ? <p className="px-5 py-5 text-sm text-pamoja-muted">No contribution obligations have been generated for this cycle yet.</p> : <><div className="grid gap-3 border-b border-pamoja-forest/10 bg-pamoja-sage/35 px-5 py-4 text-sm sm:grid-cols-4"><div><p className="text-xs text-pamoja-muted">Expected</p><p className="mt-1 font-semibold text-pamoja-ink">{formatCurrency(cycleObligations.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0), cycle.currency)}</p></div><div><p className="text-xs text-pamoja-muted">Paid / allocated</p><p className="mt-1 font-semibold text-pamoja-forest">{formatCurrency(cycleObligations.reduce((sum, item) => sum + Number(item.amountPaid || 0), 0), cycle.currency)}</p></div><div><p className="text-xs text-pamoja-muted">Excess pending review</p><p className="mt-1 font-semibold text-pamoja-ochre">{formatCurrency(cycleObligations.reduce((sum, item) => sum + Number(item.amountExcess || 0), 0), cycle.currency)}</p></div><div><p className="text-xs text-pamoja-muted">Outstanding</p><p className="mt-1 font-semibold text-pamoja-ochre">{formatCurrency(cycleObligations.reduce((sum, item) => sum + Number(item.amountOutstanding || 0), 0), cycle.currency)}</p></div></div><div className="overflow-x-auto px-5 py-4"><table className="min-w-[720px] w-full text-left text-sm"><thead className="text-xs uppercase tracking-[0.08em] text-pamoja-muted"><tr><th className="pb-2 pr-4 font-semibold">Member</th><th className="pb-2 pr-4 font-semibold">Expected</th><th className="pb-2 pr-4 font-semibold">Paid / Allocated</th><th className="pb-2 pr-4 font-semibold">Outstanding</th><th className="pb-2 pr-4 font-semibold">Excess pending review</th><th className="pb-2 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-pamoja-forest/8">{cycleObligations.map((obligation) => <tr key={obligation.id}><td className="py-3 pr-4 font-semibold text-pamoja-ink">{obligation.memberName || 'Member'}</td><td className="py-3 pr-4 whitespace-nowrap">{formatCurrency(obligation.expectedAmount, obligation.currency)}</td><td className="py-3 pr-4 whitespace-nowrap">{formatCurrency(obligation.amountPaid, obligation.currency)}</td><td className="py-3 pr-4 whitespace-nowrap">{formatCurrency(obligation.amountOutstanding, obligation.currency)}</td><td className="py-3 pr-4 whitespace-nowrap text-pamoja-ochre">{formatCurrency(obligation.amountExcess, obligation.currency)}</td><td className="py-3"><StatusBadge status={obligation.status === 'PAID' ? 'success' : obligation.status === 'EXCESS_PENDING_REVIEW' ? 'pending' : obligation.status === 'OVERDUE' ? 'danger' : 'neutral'}>{obligation.status}</StatusBadge></td></tr>)}</tbody></table></div></>}
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><Banknote className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Payout control</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Recipient payout</h2><p className="mt-2 text-sm leading-6 text-pamoja-muted">One explicit recipient per cycle. The amount is derived from verified ledger credits after all obligations are satisfied.</p></div></div>{eligibility?.eligible && <Button type="button" loading={creatingPayout} onClick={createPayout}><Banknote className="h-4 w-4" aria-hidden="true" />Initiate payout</Button>}</div>
        {eligibility ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Cycle</p><p className="mt-1 font-semibold text-pamoja-forest">{eligibility.cycle.name}</p><p className="text-xs text-pamoja-muted">{eligibility.cycle.status}</p></div><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Available balance</p><p className="mt-1 text-lg font-bold text-pamoja-forest">{formatCurrency(eligibility.ledger.availableBalance)}</p><p className="text-xs text-pamoja-muted">{eligibility.ledger.currency}</p></div><div className="rounded-xl bg-pamoja-sage/60 p-3"><p className="text-xs text-pamoja-muted">Recipient</p><p className="mt-1 font-semibold text-pamoja-forest">{eligibility.recipient?.name || 'Not configured'}</p><p className="text-xs text-pamoja-muted">{eligibility.bankAccount?.accountNumberMasked || 'No verified account'}</p></div></div> : <p className="mt-4 rounded-lg bg-pamoja-sage/70 p-3 text-sm text-pamoja-muted">Configure an active cycle and recipient to see payout eligibility.</p>}
         {eligibility && !eligibility.eligible && <div className="mt-4 space-y-2">{eligibility.reasons.map((item, index) => <div key={`${item.code}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-pamoja-ochre/20 bg-pamoja-ochre/8 px-3 py-3 text-sm"><span className="text-pamoja-body">{getPayoutEligibilityMessage(item.code)}</span><StatusBadge status="pending">Action required</StatusBadge></div>)}</div>}
         <div className="mt-5 space-y-2">{payouts.slice(0, 5).map((payout) => { const display = getPayoutStatusDisplay(payout.status); return <div key={payout.id} className="flex items-center justify-between gap-3 rounded-lg border border-pamoja-forest/8 px-3 py-3"><div><p className="text-sm font-semibold text-pamoja-ink">{payout.cycleName || 'Ajo cycle'} ? {formatCurrency(payout.amount)}</p><p className="text-xs text-pamoja-muted">{payout.recipientName || 'Recipient'} ? {payout.accountNumberMasked || 'Verified account'}</p></div><StatusBadge status={display.tone}>{display.label}</StatusBadge></div>; })}</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-pamoja-forest/8 px-5 py-5"><div><p className="pamoja-eyebrow">Ajo directory</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Members</h2></div><Users className="h-5 w-5 text-pamoja-ochre" aria-hidden="true" /></div>
        {members.length === 0 ? <div className="p-5"><EmptyState icon={Users} title="No members yet" description="Create an invite to let authenticated users join this Ajo." /></div> : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{members.map((member) => <div key={member.id} className="rounded-xl bg-pamoja-sage/60 p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-pamoja-ink">{member.fullName}</p><StatusBadge status={member.role === 'GROUP_ADMIN' ? 'success' : 'neutral'}>{member.role === 'GROUP_ADMIN' ? 'Admin' : 'Member'}</StatusBadge></div><p className="mt-1 text-sm text-pamoja-muted">{member.email}</p><p className="mt-3 text-xs text-pamoja-muted">Authenticated group membership</p></div>)}</div>}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-pamoja-forest/8 px-5 py-5"><div><p className="pamoja-eyebrow">Payment identities</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Members in this Ajo</h2></div><WalletCards className="h-5 w-5 text-pamoja-ochre" aria-hidden="true" /></div>
         <div className="divide-y divide-pamoja-forest/8">{members.map((member) => { const identity = paymentIdentities.find((item) => String(item.userId) === String(member.userId)); const display = getPaymentIdentityDisplay(identity); return <div key={member.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-pamoja-ink">{member.fullName}</p><p className="text-sm text-pamoja-muted">{display.label === 'Ready' ? 'Payment account ready' : 'Payment account setup status'}</p></div><StatusBadge status={display.tone}>{display.label}</StatusBadge></div>; })}</div>
      </Card>
    </div>
  );
};

