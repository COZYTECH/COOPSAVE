import { BellRing, LockKeyhole, MoveHorizontal, Smartphone, Sparkles, TimerReset } from 'lucide-react';
import { SectionHeading, StatusPill } from './LandingPrimitives.jsx';

export const ExperiencesSection = () => (
  <section className="bg-pamoja-sage/70" aria-labelledby="experiences-heading">
    <div className="pamoja-section">
      <SectionHeading id="experiences-heading" eyebrow="Two specialized interfaces" title="Designed for members and circle organizers alike." description="Whether you are tracking your personal turn or coordinating a larger welfare pool, the same shared record stays at the center." />
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-pamoja-forest/8 bg-white p-5 shadow-pamoja-soft sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-muted">Member experience</p><h3 className="mt-1 text-2xl font-semibold text-pamoja-forest">Your next turn, at a glance.</h3></div><Smartphone className="h-6 w-6 text-pamoja-ochre" aria-hidden="true" /></div>
          <div className="mx-auto mt-7 max-w-[290px] rounded-[2rem] border-[7px] border-pamoja-forest-deep bg-pamoja-canvas p-3 shadow-pamoja-deep">
            <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-pamoja-forest-deep/30" />
            <div className="rounded-xl bg-pamoja-forest p-4 text-white"><p className="text-[10px] text-pamoja-sage-deep">Good morning, Samuel</p><p className="mt-3 text-xs font-semibold">Current contribution</p><p className="mt-1 text-2xl font-bold">₦50,000</p><StatusPill tone="white">Paid ✓</StatusPill></div>
            <div className="mt-3 rounded-xl bg-white p-4 shadow-pamoja-soft"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pamoja-muted">Next payout</p><p className="mt-2 text-base font-bold text-pamoja-forest">Your turn in 3 cycles</p><div className="mt-4 flex items-center gap-2 text-xs text-pamoja-muted"><LockKeyhole className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Access Bank ·••449</div></div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-pamoja-sage p-3 text-xs font-semibold text-pamoja-forest"><Sparkles className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Statement ready</div>
          </div>
          <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-6 text-pamoja-muted">Clear personal milestones, contribution status, and a record you can review when you need it.</p>
        </article>
        <article className="rounded-2xl border border-pamoja-forest/8 bg-pamoja-forest p-5 text-white shadow-pamoja-soft sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-sage-deep">Admin command hub</p><h3 className="mt-1 text-2xl font-semibold">Organize the circle with confidence.</h3></div><BellRing className="h-6 w-6 text-pamoja-ochre" aria-hidden="true" /></div>
          <div className="mt-7 rounded-2xl bg-white/10 p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-pamoja-sage-deep">Active circle health</p><p className="mt-2 text-3xl font-bold">86%</p></div><span className="grid h-12 w-12 place-items-center rounded-full border-4 border-pamoja-ochre text-xs font-bold text-pamoja-ochre">86</span></div><div className="mt-5 h-2 rounded-full bg-white/15"><div className="h-2 w-[86%] rounded-full bg-pamoja-ochre" /></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><AdminAction icon={BellRing} title="1-click nudges" description="Remind pending contributors." /><AdminAction icon={MoveHorizontal} title="Turn swaps" description="Keep mutual changes visible." /><AdminAction icon={TimerReset} title="Cycle timing" description="See every important date." /><AdminAction icon={LockKeyhole} title="Review gates" description="Keep sensitive actions deliberate." /></div>
          <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-pamoja-sage-deep"><LockKeyhole className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Sensitive actions stay reviewable.</div>
        </article>
      </div>
    </div>
  </section>
);

const AdminAction = ({ icon: Icon, title, description }) => <div className="rounded-xl border border-white/10 bg-white/5 p-4"><Icon className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-pamoja-sage-deep">{description}</p></div>;
