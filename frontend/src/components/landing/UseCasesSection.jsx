import { BriefcaseBusiness, Church, GraduationCap, HeartHandshake, Laptop, Store } from 'lucide-react';
import { SectionHeading } from './LandingPrimitives.jsx';

const useCases = [
  [HeartHandshake, 'Friends and family', 'Plan milestones, travel, land purchases, or shared household goals with a visible turn schedule.'],
  [BriefcaseBusiness, 'Workplace circles', 'Help colleagues coordinate recurring savings alongside everyday work.'],
  [Laptop, 'Freelancers and creators', 'Turn irregular income into a more predictable shared savings rhythm.'],
  [GraduationCap, 'University and alumni', 'Support tuition, fellowship, and welfare goals with an orderly roster.'],
  [Store, 'Market cooperatives', 'Replace paper notebooks with a more durable record of member participation.'],
  [Church, 'Faith and welfare groups', 'Give community organizers a shared view for contributions and statements.']
];

export const UseCasesSection = () => (
  <section id="for-groups" className="scroll-mt-20 bg-pamoja-sage/70" aria-labelledby="use-cases-heading">
    <div className="pamoja-section">
      <SectionHeading id="use-cases-heading" eyebrow="Versatile social finance" title="Built for every African community." description="From workplace circles to market cooperatives, Pamoja gives groups a structured way to coordinate shared financial goals." />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map(([Icon, title, text]) => <article key={title} className="rounded-xl border border-pamoja-forest/8 bg-white p-5 shadow-pamoja-soft"><Icon className="h-5 w-5 text-pamoja-ochre" aria-hidden="true" /><h3 className="mt-5 text-base font-semibold text-pamoja-forest">{title}</h3><p className="mt-2 text-sm leading-6 text-pamoja-muted">{text}</p></article>)}
      </div>
    </div>
  </section>
);
