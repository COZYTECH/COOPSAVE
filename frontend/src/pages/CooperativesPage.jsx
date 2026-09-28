import { useCallback, useEffect, useState } from 'react';
import { Building2, Edit2, Plus, Trash2, Users, WalletCards, X } from 'lucide-react';
import { cooperativeApi } from '../services/cooperativeApi';
import { memberApi } from '../services/memberApi';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { LoadingState } from '../components/ui/LoadingState.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { formatDate } from '../lib/format';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { name: '', description: '' };

export const CooperativesPage = () => {
  const { refreshCurrentUser } = useAuth();
  const [cooperatives, setCooperatives] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Pamoja | Groups';
  }, []);

  const loadCooperatives = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [cooperativeList, memberList] = await Promise.all([
        cooperativeApi.list(),
        memberApi.list()
      ]);
      setCooperatives(cooperativeList);
      setMembers(memberList);
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load groups.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCooperatives();
  }, [loadCooperatives]);

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
    setForm(emptyForm);
    setEditing(null);
    setFormOpen(true);
  };

  const startEdit = (cooperative) => {
    setNotice('');
    setError('');
    setEditing(cooperative);
    setForm({
      name: cooperative.name,
      description: cooperative.description || ''
    });
    setFormOpen(true);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (editing) {
        await cooperativeApi.update(editing.id, form);
        setNotice('Group updated.');
      } else {
        await cooperativeApi.create(form);
        setNotice('Group created.');
        try {
          await refreshCurrentUser();
        } catch {
          // The group has already been created; a later auth refresh can recover access metadata.
        }
      }

      resetForm();
      await loadCooperatives();
    } catch (saveError) {
      setError(getApiError(saveError, 'Unable to save group.'));
    } finally {
      setSaving(false);
    }
  };

  const removeCooperative = async (cooperative) => {
    if (!window.confirm(`Delete ${cooperative.name}?`)) {
      return;
    }

    setError('');
    setNotice('');

    try {
      await cooperativeApi.remove(cooperative.id);
      setNotice('Group deleted.');
      await loadCooperatives();
    } catch (deleteError) {
      setError(getApiError(deleteError, 'Unable to delete group.'));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-pamoja-forest p-5 text-white shadow-pamoja-deep sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status="success">Groups workspace</StatusBadge><StatusBadge status="neutral">Group admin view</StatusBadge></div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your savings groups</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-sage-deep">Create and manage the communities where members, account references, and payment records come together.</p>
          </div>
          <Button onClick={startCreate} className="bg-white text-pamoja-forest hover:bg-pamoja-sage"><Plus className="h-4 w-4" aria-hidden="true" /> New group</Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Groups</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : cooperatives.length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Owned in this workspace</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Members</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : members.length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Across all groups</p></div>
          <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-pamoja-sage-deep">Assigned accounts</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? '-' : members.filter((member) => member.accountRef).length}</p><p className="mt-1 text-xs text-pamoja-sage-deep">Provider references</p></div>
        </div>
      </section>

      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}

        {formOpen && (
          <Card className="p-4 shadow-pamoja-raised sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">
                {editing ? 'Edit group' : 'Create group'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="pamoja-focus grid h-10 w-10 place-items-center rounded-lg text-ink/55 hover:bg-ink/5"
                aria-label="Close form"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]" onSubmit={submitForm}>
              <FormField
                id="cooperative-name"
                label="Group name"
                value={form.name}
                onChange={updateField('name')}
                placeholder="Main Street Savings Group"
                required
              />
              <FormField
                id="cooperative-description"
                label="Description"
                value={form.description}
                onChange={updateField('description')}
                placeholder="Savings group description"
              />
              <div className="flex items-end">
                <Button type="submit" loading={saving} className="w-full lg:w-auto">
                  {editing ? 'Save changes' : 'Create group'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <LoadingState label="Loading groups..." />
        ) : cooperatives.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No groups yet"
            description="Create your first savings group before adding members."
            action={<Button onClick={startCreate}>Create group</Button>}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {cooperatives.map((cooperative) => (
              <Card key={cooperative.id} className="flex min-h-[290px] flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pamoja-raised">
                <div className="bg-pamoja-forest p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <StatusBadge status="success">Active group</StatusBadge>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">{cooperative.name}</h2>
                  <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-pamoja-sage-deep">
                    {cooperative.description || 'A shared workspace for members, contributions, and payment records.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 p-5 pb-3">
                  <div className="rounded-lg bg-pamoja-sage/70 p-3"><div className="flex items-center gap-2 text-pamoja-muted"><Users className="h-4 w-4" aria-hidden="true" /><span className="text-xs font-semibold uppercase tracking-[0.08em]">Members</span></div><p className="mt-2 text-lg font-bold tabular-nums text-pamoja-forest">{members.filter((member) => String(member.cooperativeId) === String(cooperative.id)).length}</p></div>
                  <div className="rounded-lg bg-pamoja-sage/70 p-3"><div className="flex items-center gap-2 text-pamoja-muted"><WalletCards className="h-4 w-4" aria-hidden="true" /><span className="text-xs font-semibold uppercase tracking-[0.08em]">Assigned</span></div><p className="mt-2 text-lg font-bold tabular-nums text-pamoja-forest">{members.filter((member) => String(member.cooperativeId) === String(cooperative.id) && member.accountRef).length}</p></div>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 border-t border-pamoja-forest/8 px-5 pb-5 pt-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pamoja-muted">Created</p>
                    <p className="mt-1 text-sm font-medium text-pamoja-ink">{formatDate(cooperative.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(cooperative)}
                      className="pamoja-focus grid h-10 w-10 place-items-center rounded-lg border border-ink/10 text-ink/65 hover:text-moss"
                      aria-label={`Edit ${cooperative.name}`}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCooperative(cooperative)}
                      className="pamoja-focus grid h-10 w-10 place-items-center rounded-lg border border-clay/20 text-clay hover:bg-clay/10"
                      aria-label={`Delete ${cooperative.name}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
