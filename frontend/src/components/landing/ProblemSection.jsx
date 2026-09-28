import { CheckCircle2, CircleX, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { SectionHeading } from './LandingPrimitives.jsx';

const manualProblems = [
  'Receipts and screenshots disappear inside busy group chats.',
  'A spreadsheet edited by one administrator becomes the only source of truth.',
  'Due dates and payment follow-ups create avoidable social tension.',
  'Turn-order changes are hard to see and even harder to prove.'
];

const pamojaAnswers = [
  'Contribution records are visible and tied to the member who paid.',
  'Cycle progress shows what is collected and what remains outstanding.',
  'Turn-order queues keep the next recipient clear to the whole group.',
  'History stays organized for review, statements, and reconciliation.'
];

export const ProblemSection = () => (
  <section className="pamoja-section" aria-labelledby="problem-heading">
    <SectionHeading
      id="problem-heading"
      eyebrow="A calmer way to coordinate"
      title="Saving together should not be complicated."
      description="The old tools were built for messages and rows. Ajo groups need a shared view of money, members, and timing."
    />
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      <ComparisonCard
        title="The old way"
        subtitle="Manual WhatsApp and Excel Ajo"
        icon={CircleX}
        iconClass="bg-orange-100 text-orange-800"
        items={manualProblems}
        result="High friction, missed deadlines, and fragile trust."
        resultClass="text-orange-900"
        cardClass="bg-[#fff8f2]"
      />
      <ComparisonCard
        title="The Pamoja way"
        subtitle="A modernized savings circle"
        icon={ShieldCheck}
        iconClass="bg-emerald-100 text-emerald-800"
        items={pamojaAnswers}
        result="More visibility for every member and organizer."
        resultClass="text-pamoja-forest"
        cardClass="bg-pamoja-sage"
      />
    </div>
  </section>
);

const ComparisonCard = ({ title, subtitle, icon: Icon, iconClass, items, result, resultClass, cardClass }) => (
  <article className={['rounded-2xl border border-pamoja-forest/8 p-6 sm:p-8', cardClass].join(' ')}>
    <div className="flex items-start gap-4">
      <div className={['grid h-11 w-11 shrink-0 place-items-center rounded-lg', iconClass].join(' ')}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-muted">{title}</p>
        <h3 className="mt-1 text-xl font-semibold text-pamoja-forest-deep">{subtitle}</h3>
      </div>
    </div>
    <ul className="mt-6 space-y-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-pamoja-body">
          <span className="mt-1 shrink-0" aria-hidden="true">{title === 'The old way' ? <FileSpreadsheet className="h-4 w-4 text-orange-700" /> : <CheckCircle2 className="h-4 w-4 text-emerald-700" />}</span>
          {item}
        </li>
      ))}
    </ul>
    <p className={['mt-7 border-t border-pamoja-forest/10 pt-5 text-sm font-semibold', resultClass].join(' ')}>{result}</p>
  </article>
);
