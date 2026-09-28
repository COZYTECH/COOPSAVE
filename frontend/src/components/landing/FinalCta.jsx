import { CalendarDays, LockKeyhole } from 'lucide-react';
import { PrimaryLink, SecondaryLink } from './LandingPrimitives.jsx';

export const FinalCta = () => (
  <section id="start-group" className="pamoja-section scroll-mt-20 pt-8 lg:pt-12">
    <div className="relative overflow-hidden rounded-2xl bg-pamoja-forest p-6 text-white shadow-pamoja-deep sm:p-10 lg:p-14">
      <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-pamoja-ochre/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-pamoja-emerald/10 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-pamoja-sage-deep"><span className="h-2 w-2 rounded-full bg-pamoja-ochre" aria-hidden="true" /> Free to explore</div>
        <h2 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">Ready to start saving together?</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-pamoja-sage-deep">Create a cooperative workspace, bring your people together, and give every contribution a place everyone can understand.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><PrimaryLink to="/auth/register" className="bg-pamoja-ochre hover:bg-orange-700">Start a group</PrimaryLink><SecondaryLink to="/auth/login" className="border-white/15 bg-white/10 text-white hover:bg-white/15">Open the app <CalendarDays className="h-4 w-4" aria-hidden="true" /></SecondaryLink></div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-pamoja-sage-deep"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Built around reviewable actions</span><span>·</span><span>Setup starts with your group</span></div>
      </div>
    </div>
  </section>
);
