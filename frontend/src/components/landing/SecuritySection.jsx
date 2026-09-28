import { FileClock, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { SectionHeading, StatusPill } from './LandingPrimitives.jsx';

const pillars = [
  { icon: Fingerprint, title: 'Verified identity', text: 'Keep member identity and payout details attached to the right person and group.' },
  { icon: FileClock, title: 'Auditable records', text: 'Preserve payment references, contribution history, and state changes for review.' },
  { icon: LockKeyhole, title: 'Protected actions', text: 'Make sensitive operations deliberate, authorized, and visible to the right people.' },
  { icon: ShieldCheck, title: 'Reconciliation ready', text: 'Separate provider events from the internal records that explain what they mean.' }
];

export const SecuritySection = () => (
  <section id="security" className="scroll-mt-20 bg-pamoja-sage" aria-labelledby="security-heading">
    <div className="pamoja-section">
      <SectionHeading id="security-heading" eyebrow="Institutional protection" title="Built with financial trust at the core." description="The product experience is designed around clear records, careful permissions, and a deliberate separation between provider events and Pamoja business rules." />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-pamoja-forest/8 bg-white p-5 shadow-pamoja-soft"><div className="grid h-10 w-10 place-items-center rounded-lg bg-pamoja-forest text-white"><Icon className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-5 text-base font-semibold text-pamoja-forest">{title}</h3><p className="mt-2 text-sm leading-6 text-pamoja-muted">{text}</p></article>)}
      </div>
      <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-3 text-center"><StatusPill>Designed for reviewable finance workflows</StatusPill><span className="text-xs text-pamoja-muted">Security details depend on the configured provider and deployment.</span></div>
    </div>
  </section>
);
