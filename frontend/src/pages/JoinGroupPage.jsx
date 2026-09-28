import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { FormField } from '../components/ui/FormField.jsx';
import { getApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext.jsx';
import { invitationApi } from '../services/invitationApi';

export const JoinGroupPage = () => {
  const { refreshCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Pamoja | Join an Ajo';
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cooperative = await invitationApi.join(inviteCode);
      await refreshCurrentUser();
      navigate(`/groups/${cooperative.id}`, { replace: true });
    } catch (joinError) {
      setError(getApiError(joinError, 'Unable to join this Ajo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <Link to="/groups/onboarding" className="pamoja-focus inline-flex items-center gap-2 text-sm font-semibold text-pamoja-forest"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to onboarding</Link>
      <Card className="p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><UserPlus className="h-5 w-5" aria-hidden="true" /></span>
        <p className="pamoja-eyebrow mt-5">Join an Ajo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-pamoja-forest-deep">Enter your invitation code.</h1>
        <p className="mt-2 text-sm leading-6 text-pamoja-muted">The code is validated by Pamoja before your membership is created.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && <Alert>{error}</Alert>}
          <FormField id="join-invite-code" label="Invitation code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="PAMOJA-7X4K9" required />
          <Button type="submit" loading={loading} className="w-full">Join Ajo <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </form>
      </Card>
    </div>
  );
};
