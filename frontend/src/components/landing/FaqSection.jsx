import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { SectionHeading } from './LandingPrimitives.jsx';

const faqs = [
  ['What is Pamoja?', 'Pamoja is a digital workspace for Ajo, Esusu, Susu, and other community savings circles. It helps groups organize members, contribution records, timing, and shared visibility.'],
  ['How does an Ajo group work on Pamoja?', 'A group organizer sets the contribution amount, cadence, and turn order. Members contribute through the configured payment flow, and the group can see progress toward the current cycle.'],
  ['How do members contribute?', 'The product is designed to connect contributions to provider payment events and member identities. The exact payment methods depend on the provider configuration and approved account capabilities.'],
  ['Can members use different Nigerian banks?', 'The member experience is designed around each person’s existing bank account and verified payout details. Bank coverage depends on the configured provider and its supported rails.'],
  ['How are payouts handled when it is my turn?', 'A payout should only be initiated after the cycle is eligible, the recipient is confirmed, and the provider has verified the destination. The landing page does not initiate a transfer.'],
  ['Can I create a private, invite-only group?', 'Private groups are part of the intended product direction. The current application provides cooperative management, while invite and membership rules are planned for the Ajo layer.'],
  ['What happens if someone does not pay on time?', 'The product should show the outstanding obligation clearly. Grace periods, reminders, and late-payment rules must be configured by the group rather than assumed by the platform.'],
  ['Can I leave or swap turn positions?', 'Turn changes should be deliberate, recorded, and authorized by the affected members and group rules. This is part of the planned cycle-management workflow.'],
  ['Is transaction history recorded?', 'The current application records successful webhook payments and contribution totals. The planned ledger will make provider references and internal financial meaning auditable together.'],
  ['How are fees calculated?', 'Fees should be configurable and shown before an action is approved. The product does not hard-code a fee promise in this landing page.']
];

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faqs" className="scroll-mt-20 pamoja-section" aria-labelledby="faq-heading">
      <SectionHeading id="faq-heading" eyebrow="Got questions?" title="Frequently asked questions." description="A few useful starting points for members and group organizers." />
      <div className="mx-auto mt-10 max-w-3xl space-y-2">
        {faqs.map(([question, answer], index) => {
          const isOpen = openIndex === index;
          return <div key={question} className="overflow-hidden rounded-xl border border-pamoja-forest/8 bg-pamoja-sage"><button type="button" className="pamoja-focus flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold text-pamoja-forest" onClick={() => setOpenIndex(isOpen ? -1 : index)} aria-expanded={isOpen}><span>{question}</span><ChevronDown className={['h-4 w-4 shrink-0 text-pamoja-ochre transition-transform', isOpen ? 'rotate-180' : ''].join(' ')} aria-hidden="true" /></button>{isOpen && <div className="px-4 pb-5 text-sm leading-6 text-pamoja-muted">{answer}</div>}</div>;
        })}
      </div>
    </section>
  );
};
