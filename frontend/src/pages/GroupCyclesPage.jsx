import { useCallback, useEffect, useState } from 'react';
import { Banknote, CalendarPlus, Eye, Play, Trash2, XCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { getApiError } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { groupApi } from '../services/groupApi';

const today = () => new Date().toISOString().slice(0, 10);

export const GroupCyclesPage = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [form, setForm] = useState({ name: '', contribution_amount: '', currency: 'NGN', frequency: 'MONTHLY', interval_days: '', start_date: today(), end_date: '', grace_period_days: 0, membership_ids: [] });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [groupData, memberData, cycleData] = await Promise.all([groupApi.get(groupId), groupApi.members(groupId), groupApi.cycles(groupId)]);
      setGroup(groupData); setMembers(memberData); setCycles(cycleData);
      setForm((current) => ({ ...current, membership_ids: current.membership_ids.length ? current.membership_ids : memberData.map((member) => member.id) }));
    } catch (loadError) { setError(getApiError(loadError, 'Unable to load cycles.')); } finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { document.title = 'Pamoja | Ajo cycles'; load(); }, [load]);
  const setField = (field) => (event) => { setForm((current) => ({ ...current, [field]: event.target.value })); setPreview(null); };
  const toggleMember = (id) => setForm((current) => ({ ...current, membership_ids: current.membership_ids.map(String).includes(String(id)) ? current.membership_ids.filter((item) => String(item) !== String(id)) : [...current.membership_ids, id] }));
  const payload = { ...form, interval_days: form.frequency === 'CUSTOM' ? form.interval_days : null, grace_period_days: Number(form.grace_period_days || 0), end_date: form.end_date || null };
  const previewSchedule = async () => { setError(''); try { setPreview(await groupApi.previewCycle(groupId, payload)); } catch (previewError) { setError(getApiError(previewError, 'Unable to preview this schedule.')); } };
  const create = async (event) => { event.preventDefault(); setBusy(true); setError(''); setNotice(''); try { await groupApi.createCycle(groupId, payload); setNotice('Draft cycle created. Start it when the member schedule is ready.'); setPreview(null); await load(); } catch (createError) { setError(getApiError(createError, 'Unable to create the cycle.')); } finally { setBusy(false); } };
  const start = async (cycleId) => { setStarting(cycleId); setError(''); try { await groupApi.startCycle(groupId, cycleId); setNotice('Cycle started and obligations generated.'); await load(); } catch (startError) { setError(getApiError(startError, 'Unable to start the cycle.')); } finally { setStarting(null); } };
  const remove = async (cycle) => { if (!window.confirm('Delete this draft cycle?\n\nThis action permanently removes the cycle because it has no financial activity.')) return; setBusy(true); setError(''); try { await groupApi.deleteCycle(groupId, cycle.id); setNotice('Draft cycle deleted.'); await load(); } catch (deleteError) { setError(getApiError(deleteError, 'Unable to delete the cycle.')); } finally { setBusy(false); } };
  const cancel = async (cycle) => { if (!window.confirm('Cancel this cycle?\n\nIts financial history will be preserved.')) return; setBusy(true); setError(''); try { await groupApi.cancelCycle(groupId, cycle.id); setNotice('Cycle cancelled.'); await load(); } catch (cancelError) { setError(getApiError(cancelError, 'Unable to cancel the cycle.')); } finally { setBusy(false); } };

  if (loading) return <LoadingState label="Loading cycles..." />;
  return <div className="space-y-5"><PageHeader eyebrow="Group administration" title="Ajo cycles" description={`${group?.name || 'Group'} | each cycle keeps its own obligations and financial history.`} actions={<Link to={`/groups/${groupId}/manage`} className="pamoja-focus inline-flex min-h-11 items-center rounded-lg border border-pamoja-forest/12 bg-white px-4 text-sm font-semibold text-pamoja-forest">Back to overview</Link>} />
    {error && <Alert>{error}</Alert>}{notice && <Alert type="success">{notice}</Alert>}
    <Card className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><CalendarPlus className="h-5 w-5" aria-hidden="true" /></span><div><p className="pamoja-eyebrow">Cycle setup</p><h2 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">Create a contribution cycle</h2><p className="mt-2 text-sm text-pamoja-muted">Preview periods using the same server-side schedule rules used for obligation generation.</p></div></div>
      <form className="mt-5 space-y-5" onSubmit={create}><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><FormField id="cycle-name" label="Cycle name" value={form.name} onChange={setField('name')} required /><FormField id="cycle-amount" label="Contribution amount" type="number" value={form.contribution_amount} onChange={setField('contribution_amount')} required /><FormField id="cycle-currency" label="Currency" as="select" value={form.currency} onChange={setField('currency')}><option>NGN</option><option>GHS</option><option>KES</option></FormField><FormField id="cycle-frequency" label="Frequency" as="select" value={form.frequency} onChange={setField('frequency')}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="MONTHLY">Monthly</option><option value="CUSTOM">Custom interval</option><option value="ONE_TIME">One time</option></FormField><FormField id="cycle-start" label="Start date" type="date" value={form.start_date} onChange={setField('start_date')} required /><FormField id="cycle-end" label="End date" type="date" value={form.end_date} onChange={setField('end_date')} /><FormField id="cycle-grace" label="Grace period (days)" type="number" min="0" value={form.grace_period_days} onChange={setField('grace_period_days')} /><>{form.frequency === 'CUSTOM' && <FormField id="cycle-interval" label="Interval (days)" type="number" min="1" value={form.interval_days} onChange={setField('interval_days')} required />}</></div>
        <fieldset><legend className="text-sm font-semibold text-pamoja-body">Eligible members</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{members.map((member) => <label key={member.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-pamoja-forest/10 bg-pamoja-sage/40 p-3 text-sm"><input type="checkbox" checked={form.membership_ids.map(String).includes(String(member.id))} onChange={() => toggleMember(member.id)} className="mt-1 h-4 w-4 accent-pamoja-forest" /><span><span className="block font-semibold text-pamoja-ink">{member.fullName}</span><span className="block text-xs text-pamoja-muted">{member.email}</span></span></label>)}</div></fieldset>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={previewSchedule}><Eye className="h-4 w-4" aria-hidden="true" />Preview schedule</Button><Button type="submit" loading={busy} disabled={!members.length}><CalendarPlus className="h-4 w-4" aria-hidden="true" />Create draft</Button></div>
      </form>{preview && <div className="mt-5 grid gap-3 rounded-xl bg-pamoja-sage/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-pamoja-muted">Frequency</p><p className="mt-1 font-semibold">{preview.frequency}</p></div><div><p className="text-xs text-pamoja-muted">Periods</p><p className="mt-1 font-semibold">{preview.periodCount}</p></div><div><p className="text-xs text-pamoja-muted">Per member</p><p className="mt-1 font-semibold">{formatCurrency(preview.contributionAmount, form.currency)} x {preview.periodCount}</p></div><div><p className="text-xs text-pamoja-muted">Members</p><p className="mt-1 font-semibold">{preview.memberCount}</p></div><div><p className="text-xs text-pamoja-muted">Expected total</p><p className="mt-1 font-semibold">{formatCurrency(preview.expectedCycleAmount, form.currency)}</p></div></div>}</Card>
    <div className="grid gap-5 lg:grid-cols-2">{cycles.map((cycle) => <Card key={cycle.id} className="border border-pamoja-forest/10 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold text-pamoja-forest-deep">{cycle.name}</p><p className="mt-1 text-sm text-pamoja-muted">Cycle {cycle.cycleNumber} | {cycle.frequency} | {formatCurrency(cycle.contributionAmount, cycle.currency)}</p><p className="mt-1 text-xs text-pamoja-muted">{formatDate(cycle.startDate)}{cycle.endDate ? ` - ${formatDate(cycle.endDate)}` : ''} | {cycle.gracePeriodDays || 0} grace days</p></div><StatusBadge status={cycle.status === 'ACTIVE' ? 'success' : cycle.status === 'DRAFT' ? 'pending' : 'neutral'}>{cycle.status}</StatusBadge></div><div className="mt-5 flex flex-wrap gap-2 border-t border-pamoja-forest/10 pt-4"><Link to={`/groups/${groupId}/manage/cycles/${cycle.id}`} className="pamoja-focus inline-flex min-h-10 items-center gap-2 rounded-lg border border-pamoja-forest/12 px-3 text-sm font-semibold text-pamoja-forest"><Eye className="h-4 w-4" aria-hidden="true" />View cycle</Link>{cycle.status === 'COMPLETED' && <Link to={`/groups/${groupId}/manage/cycles/${cycle.id}`} className="pamoja-focus inline-flex min-h-10 items-center gap-2 rounded-lg bg-pamoja-forest px-3 text-sm font-semibold text-white"><Banknote className="h-4 w-4" aria-hidden="true" />Review payout</Link>}{cycle.status === 'DRAFT' && <Button type="button" loading={starting === cycle.id} onClick={() => start(cycle.id)}><Play className="h-4 w-4" aria-hidden="true" />Start</Button>}{cycle.status === 'DRAFT' && !cycle.hasFinancialActivity && <Button type="button" variant="secondary" disabled={busy} onClick={() => remove(cycle)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</Button>}{['DRAFT', 'ACTIVE'].includes(cycle.status) && cycle.hasFinancialActivity && <Button type="button" variant="secondary" disabled={busy} onClick={() => cancel(cycle)}><XCircle className="h-4 w-4" aria-hidden="true" />Cancel</Button>}</div></Card>)}{cycles.length === 0 && <Card className="p-5 text-sm text-pamoja-muted">No cycles yet.</Card>}</div>
  </div>;
};









