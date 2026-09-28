import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/landing/LandingPrimitives.jsx';
import { getApiError } from '../lib/api';
import { getGroups } from '../lib/access';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { FormField } from '../components/ui/FormField.jsx';

const passwordRules = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number'
];

const getInitialIntent = (searchParams) => (
  searchParams.get('intent') === 'JOIN_AJO' ? 'JOIN_AJO' : ''
);

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [intent, setIntent] = useState(() => getInitialIntent(searchParams));
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    group_name: '',
    group_description: '',
    invite_code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Pamoja | Create account';
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const chooseIntent = (nextIntent) => {
    setError('');
    setIntent(nextIntent);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        intent,
        ...(intent === 'CREATE_AJO'
          ? { group_name: form.group_name, group_description: form.group_description }
          : { invite_code: form.invite_code })
      });
      const group = getGroups(user)[0];

      if (!group) {
        navigate('/groups/onboarding', { replace: true });
      } else {
        navigate(group.role === 'GROUP_ADMIN' ? `/groups/${group.id}/manage` : `/groups/${group.id}`, { replace: true });
      }
    } catch (registerError) {
      setError(getApiError(registerError, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[1fr_560px]">
      <section className="hidden bg-pamoja-forest-deep p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div><Logo inverse /><p className="mt-2 text-sm text-white/55">Community finance workspace</p></div>
        <div className="max-w-2xl"><p className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">Start with the Pamoja path that fits your Ajo journey.</p><div className="mt-8 grid gap-3">{['Your platform role stays USER', 'Group access is membership-scoped', 'Secure invitations for joining'].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><CheckCircle2 className="h-5 w-5 text-mint" aria-hidden="true" /><p className="text-sm font-semibold">{item}</p></div>)}</div></div>
        <p className="text-sm text-white/45">Create an Ajo or join one with a secure invitation.</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-pamoja-deep sm:p-8">
          <div className="mb-8 flex items-center justify-between"><Logo /><span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-moss">Get started</span></div>

          {!intent ? (
            <>
              <div className="mb-6"><p className="pamoja-eyebrow">Step 1</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">How will you use Pamoja?</h1><p className="mt-1 text-sm text-ink/55">Choose an onboarding path. This does not assign a privileged platform role.</p></div>
              <div className="grid gap-3">
                <button type="button" onClick={() => chooseIntent('CREATE_AJO')} className="pamoja-focus flex items-start gap-4 rounded-xl border border-pamoja-forest/12 bg-pamoja-sage/50 p-4 text-left transition hover:border-pamoja-forest hover:bg-pamoja-sage"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pamoja-forest text-white"><Building2 className="h-5 w-5" aria-hidden="true" /></span><span><span className="block font-semibold text-pamoja-forest-deep">Create an Ajo</span><span className="mt-1 block text-sm text-pamoja-muted">Create and manage your own savings group.</span></span><ArrowRight className="ml-auto mt-1 h-4 w-4 text-pamoja-forest" aria-hidden="true" /></button>
                <button type="button" onClick={() => chooseIntent('JOIN_AJO')} className="pamoja-focus flex items-start gap-4 rounded-xl border border-pamoja-forest/12 bg-white p-4 text-left transition hover:border-pamoja-forest hover:bg-pamoja-sage"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pamoja-sage text-pamoja-forest"><UserPlus className="h-5 w-5" aria-hidden="true" /></span><span><span className="block font-semibold text-pamoja-forest-deep">Join an Ajo</span><span className="mt-1 block text-sm text-pamoja-muted">Join an existing group with an invitation code.</span></span><ArrowRight className="ml-auto mt-1 h-4 w-4 text-pamoja-forest" aria-hidden="true" /></button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6"><button type="button" onClick={() => chooseIntent('')} className="pamoja-focus text-sm font-semibold text-pamoja-forest">Back to paths</button><p className="pamoja-eyebrow mt-5">Step 2</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{intent === 'CREATE_AJO' ? 'Create your Ajo' : 'Join an Ajo'}</h1><p className="mt-1 text-sm text-ink/55">{intent === 'CREATE_AJO' ? 'Your account will become a group administrator for this Ajo.' : 'Use the secure invitation code shared by the group administrator.'}</p></div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && <Alert>{error}</Alert>}
                <FormField id="register-name" label="Full name" value={form.name} onChange={updateField('name')} placeholder="Ada Lovelace" required />
                <FormField id="register-email" label="Email" type="email" value={form.email} onChange={updateField('email')} placeholder="ada@example.com" required />
                <FormField id="register-password" label="Password" type="password" value={form.password} onChange={updateField('password')} placeholder="Password123" required />
                {intent === 'CREATE_AJO' ? <><FormField id="group-name" label="Ajo name" value={form.group_name} onChange={updateField('group_name')} placeholder="Community savings circle" required /><FormField id="group-description" label="Description" as="textarea" value={form.group_description} onChange={updateField('group_description')} placeholder="What is this Ajo for?" /></> : <FormField id="invite-code" label="Invitation code" value={form.invite_code} onChange={updateField('invite_code')} placeholder="PAMOJA-7X4K9" required />}
                <div className="rounded-xl bg-paper p-4"><p className="text-xs font-semibold uppercase text-ink/45">Password requirements</p><div className="mt-2 grid gap-1">{passwordRules.map((rule) => <p key={rule} className="text-xs text-ink/55">{rule}</p>)}</div></div>
                <Button type="submit" loading={loading} className="w-full">{intent === 'CREATE_AJO' ? 'Create Ajo and account' : 'Join Ajo and create account'}</Button>
              </form>
            </>
          )}

          <p className="mt-5 text-center text-sm text-ink/55">Already have an account? <Link className="font-semibold text-moss hover:text-moss/80" to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
};
