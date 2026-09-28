import { useEffect } from 'react';
import { ArrowRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getGroups } from '../lib/access';

export const GroupSelectionPage = () => {
  const { user } = useAuth();
  const groups = getGroups(user);

  useEffect(() => {
    document.title = 'Pamoja | Choose an Ajo';
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <section>
        <p className="pamoja-eyebrow">Choose a workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-pamoja-forest-deep sm:text-4xl">Which Ajo are you opening?</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pamoja-muted">Your permissions are evaluated separately for each group. Select the group you want to continue with.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const href = group.role === 'GROUP_ADMIN' ? `/groups/${group.id}/manage` : `/groups/${group.id}`;
          return <Link key={group.id} to={href} className="pamoja-focus"><Card className="flex h-full items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-pamoja-raised"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pamoja-sage text-pamoja-forest"><Building2 className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-base font-semibold text-pamoja-forest-deep">{group.name}</span><span className="mt-1 block text-sm text-pamoja-muted">{group.role === 'GROUP_ADMIN' ? 'Group admin workspace' : 'Member workspace'}</span></span><ArrowRight className="h-5 w-5 text-pamoja-muted" aria-hidden="true" /></Card></Link>;
        })}
      </div>
    </div>
  );
};
