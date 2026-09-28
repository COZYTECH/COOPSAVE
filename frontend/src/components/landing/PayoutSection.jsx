import { ArrowRight, Banknote, CheckCircle2, Landmark, RefreshCcw, ShieldCheck } from 'lucide-react';
import { SectionHeading, StatusPill } from './LandingPrimitives.jsx';

const banks = ['GTBank', 'Access', 'Zenith', 'FirstBank', 'UBA', 'OPay', 'Moniepoint', 'Kuda'];

export const PayoutSection = () => (
  <section className="pamoja-section" aria-labelledby="payout-heading">
    <SectionHeading id="payout-heading" eyebrow="Direct clearing and settlement" title="When it is your turn, the destination should be clear." description="The product is designed around verified member bank details and a visible payout trail. The live payout workflow will follow approved provider capabilities." />
    <div className="mt-10 rounded-2xl border border-pamoja-forest/8 bg-pamoja-sage p-5 sm:p-8">
      <div className="grid gap-4 md:grid-cols-4">
        <FlowNode icon={CheckCircle2} number="01" title="Cycle eligible" text="The group reaches its configured completion rule." />
        <FlowNode icon={ShieldCheck} number="02" title="Review recipient" text="The turn order and destination are visible." />
        <FlowNode icon={RefreshCcw} number="03" title="Transfer initiated" text="The approved payout provider receives a request." />
        <FlowNode icon={Landmark} number="04" title="Recipient bank" text="The member receives a provider-confirmed result." />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-pamoja-forest/10 pt-6">
        <span className="mr-2 text-xs font-semibold uppercase tracking-[0.14em] text-pamoja-muted">Designed for Nigerian banks</span>
        {banks.map((bank) => <span key={bank} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-pamoja-forest shadow-pamoja-soft">{bank}</span>)}
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-pamoja-ochre/15 text-pamoja-ochre"><Banknote className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-sm font-semibold text-pamoja-forest">Transparent fee design</p><p className="mt-1 text-xs text-pamoja-muted">Any future fees should be configurable and shown before a payout is approved.</p></div></div><StatusPill tone="ochre">No hidden percentage claim</StatusPill></div>
    </div>
    <p className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-center text-xs leading-5 text-pamoja-muted"><ArrowRight className="h-4 w-4 shrink-0 text-pamoja-ochre" aria-hidden="true" /> The page is a presentation layer; it does not initiate transfers or move money.</p>
  </section>
);

const FlowNode = ({ icon: Icon, number, title, text }) => <div className="relative rounded-xl border border-pamoja-forest/8 bg-white p-5 shadow-pamoja-soft"><div className="flex items-center justify-between"><span className="text-sm font-bold text-pamoja-ochre">{number}</span><Icon className="h-5 w-5 text-pamoja-forest" aria-hidden="true" /></div><h3 className="mt-6 text-base font-semibold text-pamoja-forest">{title}</h3><p className="mt-2 text-sm leading-6 text-pamoja-muted">{text}</p></div>;
