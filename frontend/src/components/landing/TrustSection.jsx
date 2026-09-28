import { Building2, CircleDollarSign, Globe2, HandHeart, Landmark, UsersRound } from 'lucide-react';
import { SectionHeading } from './LandingPrimitives.jsx';

const traditions = [
  { icon: HandHeart, title: 'Yoruba tradition', label: 'Ajo', description: 'Structured rotating communal credit and mutual support.' },
  { icon: UsersRound, title: 'Igbo heritage', label: 'Esusu / Isusu', description: 'Collaborative pooling built on participation and trust.' },
  { icon: CircleDollarSign, title: 'Northern Nigeria', label: 'Adashi', description: 'Periodic communal lump-sum savings circles.' },
  { icon: Globe2, title: 'Ghana and West Africa', label: 'Susu', description: 'Micro-contribution thrift collecting with social accountability.' },
  { icon: Landmark, title: 'East Africa', label: 'Chama', description: 'Investment and mutual wealth circles for shared goals.' },
  { icon: Building2, title: 'Institutions', label: 'Cooperatives', description: 'Organized employee, alumni, and community savings.' }
];

export const TrustSection = () => (
  <section className="bg-pamoja-sage/70" aria-labelledby="trust-heading">
    <div className="pamoja-section">
      <SectionHeading
        id="trust-heading"
        eyebrow="The context"
        title="Built for the way Africa saves together."
        description="Pamoja gives familiar community saving structures a clearer digital workspace without taking the trust out of the circle."
      />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {traditions.map(({ icon: Icon, title, label, description }) => (
          <article key={label} className="rounded-xl border border-pamoja-forest/8 bg-white p-5 shadow-pamoja-soft">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-pamoja-sage text-pamoja-forest">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-pamoja-muted">{title}</p>
            <h3 className="mt-1 text-lg font-semibold text-pamoja-forest">{label}</h3>
            <p className="mt-2 text-sm leading-6 text-pamoja-muted">{description}</p>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-pamoja-muted">
        Thoughtful technology for real communal habits, without unsupported financial promises or unnecessary complexity.
      </p>
    </div>
  </section>
);
