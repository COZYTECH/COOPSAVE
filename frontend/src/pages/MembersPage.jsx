import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { cooperativeApi } from '../services/cooperativeApi';
import { memberApi } from '../services/memberApi';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';

const emptyForm = {
  cooperative_id: '',
  full_name: '',
  email: '',
  phone: ''
};

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

  const cooperativeNames = useMemo(() => {
    return cooperatives.reduce((map, cooperative) => {
      map[String(cooperative.id)] = cooperative.name;
      return map;
    }, {});
  }, [cooperatives]);

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
        <div>
          <p className="font-semibold text-ink">{row.fullName}</p>
          <p className="text-xs text-ink/45">{row.email}</p>
        </div>
      )
    },
    {
      key: 'cooperativeId',
      label: 'Cooperative',
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
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink/10 text-ink/65 hover:text-moss"
            aria-label={`Edit ${row.fullName}`}
            title="Edit"
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => removeMember(row)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-clay/20 text-clay hover:bg-clay/10"
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
    <div>
      <PageHeader
        title="Members"
        description="Maintain member identity, cooperative assignment, and virtual account references."
        actions={
          <Button onClick={startCreate} disabled={cooperatives.length === 0}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New member
          </Button>
        }
      />

      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}

        {formOpen && (
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">{editing ? 'Edit member' : 'Create member'}</h2>
              <button
                type="button"
                onClick={resetForm}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/55 hover:bg-ink/5"
                aria-label="Close form"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submitForm}>
              <FormField
                id="member-cooperative"
                label="Cooperative"
                value={form.cooperative_id}
                onChange={updateField('cooperative_id')}
                as="select"
                required
              >
                <option value="">Select cooperative</option>
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
          <Card className="p-6 text-sm text-ink/55">Loading members...</Card>
        ) : cooperatives.length === 0 ? (
          <EmptyState
            title="Create a cooperative first"
            description="Members must belong to a cooperative before they can receive account references."
          />
        ) : members.length === 0 ? (
          <EmptyState
            title="No members yet"
            description="Add members and their account references to begin matching Nomba payments."
            action={<Button onClick={startCreate}>Create member</Button>}
          />
        ) : (
          <DataTable columns={columns} rows={members} />
        )}
      </div>
    </div>
  );
};
