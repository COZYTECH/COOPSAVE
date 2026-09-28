import { useEffect } from 'react';
import { ArrowRight, Building2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card.jsx';

export const OnboardingPage = () => {
  useEffect(() => {
    document.title = 'Pamoja | Get started';
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <section>
        <p className="pamoja-eyebrow">Getting started</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-pamoja-forest-deep sm:text-4xl">Set up your first savings group.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-muted">Your account is ready. Create a group to begin organizing members and the operational records already supported by Pamoja.</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-pamoja-forest text-white"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-5 text-xl font-semibold text-pamoja-forest-deep">Create a group</h2>
          <p className="mt-2 text-sm leading-6 text-pamoja-muted">Become the group administrator and add the member records you manage.</p>
          <Link to="/cooperatives" className="pamoja-focus mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-pamoja-forest px-4 text-sm font-semibold text-white shadow-pamoja-soft hover:bg-pamoja-forest-deep">Create group <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </Card>
        <Card className="p-6 opacity-80">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><UserPlus className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-5 text-xl font-semibold text-pamoja-forest-deep">Join an existing group</h2>
          <p className="mt-2 text-sm leading-6 text-pamoja-muted">Invitations and self-service membership are not implemented in the current backend yet.</p>
          <Link to="/groups/join" className="pamoja-focus mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-pamoja-forest/12 bg-white px-4 text-sm font-semibold text-pamoja-forest">Join with invite <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </Card>
      </div>
    </div>
  );
};
