import { ArrowRight, Banknote, ClipboardList, UserPlus, UsersRound } from 'lucide-react';
import { SectionHeading } from './LandingPrimitives.jsx';

const steps = [
  { number: '01', icon: UsersRound, title: 'Create your group', description: 'Set a contribution amount, choose a cadence, and invite the people you trust.', note: 'Quick setup' },
  { number: '02', icon: UserPlus, title: 'Members contribute', description: 'Members get a clear place to pay and a shared view of their contribution status.', note: 'Payment visibility' },
  { number: '03', icon: ClipboardList, title: 'Track everything', description: 'See who has paid, what is outstanding, and how the current turn is progressing.', note: 'Group visibility' },
  { number: '04', icon: Banknote, title: 'Prepare the payout', description: 'When a cycle is eligible, the recipient and payout destination are ready for review.', note: 'Clear next steps' }
];

export const HowItWorksSection = () => (
  <section id="how-it-works" className="scroll-mt-20 bg-pamoja-sage" aria-labelledby="how-heading">
    <div className="pamoja-section">
      <SectionHeading
        id="how-heading"
        eyebrow="How it works"
        title="A simple rhythm for every circle."
        description="Pamoja keeps the familiar Ajo sequence intact and gives each step a shared digital record."
      />
      <div className="relative mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ number, icon: Icon, title, description, note }, index) => (
          <article key={number} className="relative rounded-xl border border-pamoja-forest/8 bg-white p-5 shadow-pamoja-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-pamoja-ochre">{number}</span>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-pamoja-sage text-pamoja-forest">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <h3 className="mt-7 text-lg font-semibold text-pamoja-forest-deep">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-pamoja-muted">{description}</p>
            <p className="mt-5 text-xs font-semibold text-pamoja-forest">{note}</p>
            {index < steps.length - 1 && <ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-pamoja-ochre lg:block" aria-hidden="true" />}
          </article>
        ))}
      </div>
    </div>
  </section>
);
