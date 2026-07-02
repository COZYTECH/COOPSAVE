import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeDollarSign, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiError } from '../lib/api';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FormField } from '../components/ui/FormField.jsx';

const passwordRules = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number'
];

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (registerError) {
      setError(getApiError(registerError, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[1fr_560px]">
      <section className="hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-moss">
            <BadgeDollarSign className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase">CoopSave</p>
            <p className="text-sm text-white/55">Cooperative operations console</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <p className="text-4xl font-bold leading-tight tracking-normal">
            Start with an owner account, then create cooperatives and onboard members.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              'Protected admin workspace',
              'Realtime payment notifications',
              'Reconciliation-ready member accounts'
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                <CheckCircle2 className="h-5 w-5 text-mint" aria-hidden="true" />
                <p className="text-sm font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/45">Your account becomes the owner for new cooperative records.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-ink/10 bg-white p-6 shadow-panel">
          <div className="mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-mint text-moss">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-normal text-ink">Create account</h1>
            <p className="mt-1 text-sm text-ink/55">Set up your CoopSave owner profile.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <Alert>{error}</Alert>}
            <FormField
              id="register-name"
              label="Full name"
              value={form.name}
              onChange={updateField('name')}
              placeholder="Ada Lovelace"
              required
            />
            <FormField
              id="register-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="ada@example.com"
              required
            />
            <FormField
              id="register-password"
              label="Password"
              type="password"
              value={form.password}
              onChange={updateField('password')}
              placeholder="Password123"
              required
            />
            <div className="rounded-lg bg-paper p-3">
              <p className="text-xs font-semibold uppercase text-ink/45">Password requirements</p>
              <div className="mt-2 grid gap-1">
                {passwordRules.map((rule) => (
                  <p key={rule} className="text-xs text-ink/55">
                    {rule}
                  </p>
                ))}
              </div>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/55">
            Already have an account?{' '}
            <Link className="font-semibold text-moss hover:text-moss/80" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};
