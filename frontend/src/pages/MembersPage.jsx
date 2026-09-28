import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, Users, WalletCards, X } from 'lucide-react';
import { cooperativeApi } from '../services/cooperativeApi';
import { memberApi } from '../services/memberApi';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';

const emptyForm = {
  cooperative_id: '',
  full_name: '',
  email: '',
  phone: ''
};

const getInitials = (name) => String(name || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

export const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');

  useEffect(() => {
    document.title = 'Pamoja | Members';
  }, []);

  const cooperativeNames = useMemo(() => {
    return cooperatives.reduce((map, cooperative) => {
      map[String(cooperative.id)] = cooperative.name;
      return map;
    }, {});
  }, [cooperatives]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return members;
    }

    return members.filter((member) => {
      const matchesFilter = memberFilter === 'all'
        || (memberFilter === 'assigned' && (member.accountRef || member.accountNumber))
        || (memberFilter === 'pending' && !(member.accountRef || member.accountNumber));

      return matchesFilter && [
      member.fullName,
      member.email,
      member.phone,
      member.accountRef,
      member.accountNumber,
      cooperativeNames[String(member.cooperativeId)]
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [cooperativeNames, memberFilter, members, search]);

  const assignedMemberCount = useMemo(
    () => members.filter((member) => member.accountRef || member.accountNumber).length,
    [members]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [memberList, cooperativeList] = await Promise.all([
        memberApi.list(),
        cooperativeApi.list()
      ]);
      setMembers(memberList);
      setCooperatives(cooperativeList);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load members.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setFormOpen(false);
  };

  const startCreate = () => {
    setNotice('');
    setError('');
    setEditing(null);
    setForm({
      ...emptyForm,
      cooperative_id: cooperatives[0]?.id || ''
    });
    setFormOpen(true);
  };

  const startEdit = (member) => {
    setNotice('');
    setError('');
    setEditing(member);
    setForm({
      cooperative_id: member.cooperativeId,
      full_name: member.fullName,
      email: member.email,
      phone: member.phone
    });
    setFormOpen(true);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      cooperative_id: Number(form.cooperative_id),
      full_name: form.full_name,
      email: form.email,
      phone: form.phone
    };

    try {
      if (editing) {
        await memberApi.update(editing.id, payload);
        setNotice('Member updated.');
      } else {
        await memberApi.create(payload);
        setNotice('Member created.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      setError(getApiError(saveError, 'Unable to save member.'));
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Delete ${member.fullName}?`)) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await memberApi.remove(member.id);
      setNotice('Member deleted.');
      await loadData();
    } catch (deleteError) {
      setError(getApiError(deleteError, 'Unable to delete member.'));
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Member',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-moss" aria-hidden="true">
            {getInitials(row.fullName)}
          </span>
          <div>
            <p className="font-semibold text-ink">{row.fullName}</p>
            <p className="text-xs text-ink/45">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'cooperativeId',
      label: 'Group',
      render: (row) => cooperativeNames[String(row.cooperativeId)] || row.cooperativeId
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'virtualAccount',
      label: 'Virtual account',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.accountNumber || '-'}</p>
          <p className="text-xs text-ink/45">{row.accountName || row.accountRef || '-'}</p>
          <div className="mt-1">
            <StatusBadge status={row.accountRef || row.accountNumber ? 'success' : 'neutral'}>
              {row.accountRef || row.accountNumber ? 'Assigned' : 'Not assigned'}
            </StatusBadge>
          </div>
        </div>
      )
    },
    { key: 'accountRef', label: 'Account ref', render: (row) => row.accountRef || '-' },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="pamoja-focus grid h-10 w-10 place-items-center rounded-lg border border-ink/10 text-ink/65 hover:text-moss"
            aria-label={`Edit ${row.fullName}`}
            title="Edit"
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => removeMember(row)}
            className="pamoja-focus grid h-10 w-10 place-items-center rounded-lg border border-clay/20 text-clay hover:bg-clay/10"
            aria-label={`Delete ${row.fullName}`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-pamoja-forest p-5 text-white shadow-pamoja-deep sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="success">Member directory</StatusBadge>
              <StatusBadge status="neutral">{members.length} total</StatusBadge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Members & account roster</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-sage-deep">Manage the people in your groups. Membership-scoped payment accounts are shown in each Ajo workspace.</p>
          </div>
          <Button onClick={startCreate} disabled={cooperatives.length === 0} className="bg-white text-pamoja-forest hover:bg-pamoja-sage">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New member
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Registered members</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : members.length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Across your groups</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Legacy links</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : assignedMemberCount}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Historical member records</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Groups represented</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : cooperatives.length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Managed workspace</p></div>
        </div>
      </section>

      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}

        {formOpen && (
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">{editing ? 'Edit member' : 'Create member'}</h2>
              <button
                type="button"
                onClick={resetForm}
                className="pamoja-focus grid h-10 w-10 place-items-center rounded-lg text-ink/55 hover:bg-ink/5"
                aria-label="Close form"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submitForm}>
              <FormField
                id="member-cooperative"
                label="Group"
                value={form.cooperative_id}
                onChange={updateField('cooperative_id')}
                as="select"
                required
              >
                <option value="">Select group</option>
                {cooperatives.map((cooperative) => (
                  <option key={cooperative.id} value={cooperative.id}>
                    {cooperative.name}
                  </option>
                ))}
              </FormField>
              <FormField id="member-name" label="Full name" value={form.full_name} onChange={updateField('full_name')} required />
              <FormField id="member-email" label="Email" type="email" value={form.email} onChange={updateField('email')} required />
              <FormField id="member-phone" label="Phone" value={form.phone} onChange={updateField('phone')} required />
              <div className="flex items-end">
                <Button type="submit" loading={saving} className="w-full">
                  {editing ? 'Save changes' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <LoadingState label="Loading members..." />
        ) : cooperatives.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Create a group first"
            description="Members must belong to a group before they can receive account references."
          />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Add members to maintain the legacy directory. Payment identities are managed from each Ajo workspace."
            action={<Button onClick={startCreate}>Create member</Button>}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-xl border border-pamoja-forest/8 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
                <label className="sr-only" htmlFor="member-search">Search members</label>
                <input
                  id="member-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search members or accounts"
                  className="pamoja-focus h-11 w-full rounded-lg border border-ink/15 bg-white pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-moss focus:ring-2 focus:ring-moss/15"
                />
              </div>
              <Tabs
                items={[{ key: 'all', label: 'All' }, { key: 'assigned', label: 'Assigned' }, { key: 'pending', label: 'Pending' }]}
                activeKey={memberFilter}
                onChange={setMemberFilter}
              />
            </div>
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-pamoja-forest/8 px-5 py-4"><div><p className="pamoja-eyebrow">Circle ledger</p><h2 className="mt-1 text-lg font-semibold text-pamoja-forest-deep">Member details</h2></div><p className="text-sm text-pamoja-muted">{filteredMembers.length} of {members.length} shown</p></div>
              <div className="space-y-2 p-4 md:hidden">
                {filteredMembers.length === 0 ? <p className="py-6 text-center text-sm text-pamoja-muted">No members match this view.</p> : filteredMembers.map((member) => <div key={member.id} className="rounded-xl bg-pamoja-sage/60 p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-pamoja-forest">{getInitials(member.fullName)}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-pamoja-ink">{member.fullName}</p><p className="truncate text-xs text-pamoja-muted">{member.email}</p><p className="mt-2 text-xs text-pamoja-muted">{cooperativeNames[String(member.cooperativeId)] || 'Unassigned group'}</p></div><StatusBadge status={member.accountRef || member.accountNumber ? 'success' : 'neutral'}>{member.accountRef || member.accountNumber ? 'Assigned' : 'Pending'}</StatusBadge></div><div className="mt-3 flex items-center justify-between border-t border-pamoja-forest/8 pt-3 text-xs"><span className="text-pamoja-muted">{member.accountNumber || member.accountRef || 'No account reference'}</span><div className="flex gap-1"><button type="button" onClick={() => startEdit(member)} className="pamoja-focus rounded-lg px-2 py-1 font-semibold text-pamoja-forest" aria-label={`Edit ${member.fullName}`}>Edit</button><button type="button" onClick={() => removeMember(member)} className="pamoja-focus rounded-lg px-2 py-1 font-semibold text-red-800" aria-label={`Delete ${member.fullName}`}>Delete</button></div></div></div>)}
              </div>
              <div className="hidden md:block"><DataTable plain columns={columns} rows={filteredMembers} emptyMessage="No members match this view." /></div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
