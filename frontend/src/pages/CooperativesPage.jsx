import { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import { cooperativeApi } from '../services/cooperativeApi';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { formatDate } from '../lib/format';

const emptyForm = { name: '', description: '' };

export const CooperativesPage = () => {
  const [cooperatives, setCooperatives] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCooperatives = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setCooperatives(await cooperativeApi.list());
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load cooperatives.'));
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
        setNotice('Cooperative updated.');
      } else {
        await cooperativeApi.create(form);
        setNotice('Cooperative created.');
      }

      resetForm();
      await loadCooperatives();
    } catch (saveError) {
      setError(getApiError(saveError, 'Unable to save cooperative.'));
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
      setNotice('Cooperative deleted.');
      await loadCooperatives();
    } catch (deleteError) {
      setError(getApiError(deleteError, 'Unable to delete cooperative.'));
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
    { key: 'description', label: 'Description', render: (row) => row.description || '-' },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink/10 text-ink/65 hover:text-moss"
            aria-label={`Edit ${row.name}`}
            title="Edit"
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => removeCooperative(row)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-clay/20 text-clay hover:bg-clay/10"
            aria-label={`Delete ${row.name}`}
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
        title="Cooperatives"
        description="Create and manage the cooperative groups owned by your account."
        actions={
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New cooperative
          </Button>
        }
      />

      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}

        {formOpen && (
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">
                {editing ? 'Edit cooperative' : 'Create cooperative'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink/55 hover:bg-ink/5"
                aria-label="Close form"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]" onSubmit={submitForm}>
              <FormField
                id="cooperative-name"
                label="Name"
                value={form.name}
                onChange={updateField('name')}
                placeholder="Main Street Cooperative"
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
                  {editing ? 'Save changes' : 'Create'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <Card className="p-6 text-sm text-ink/55">Loading cooperatives...</Card>
        ) : cooperatives.length === 0 ? (
          <EmptyState
            title="No cooperatives yet"
            description="Create your first cooperative group before adding members."
            action={<Button onClick={startCreate}>Create cooperative</Button>}
          />
        ) : (
          <DataTable columns={columns} rows={cooperatives} />
        )}
      </div>
    </div>
  );
};
