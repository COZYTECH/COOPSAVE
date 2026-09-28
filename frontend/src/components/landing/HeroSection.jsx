import { ArrowDown, CheckCircle2, Landmark, Zap } from 'lucide-react';
import { MiniCheck, PrimaryLink, SecondaryLink } from './LandingPrimitives.jsx';
import { ProductPreview } from './ProductPreview.jsx';

export const HeroSection = () => (
  <section className="mx-auto w-full max-w-pamoja px-5 pb-16 pt-12 md:px-8 md:pt-16 lg:pb-24 lg:pt-20">
    <div className="mx-auto max-w-4xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-pamoja-sage px-4 py-2 text-xs font-semibold text-pamoja-forest shadow-pamoja-soft">
        <span className="h-2 w-2 rounded-full bg-pamoja-ochre" aria-hidden="true" />
        Digital Ajo and Susu workspace for Africa
      </div>
      <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.05em] text-pamoja-forest-deep sm:text-6xl lg:text-7xl">
        Save together.<br />
        <span className="text-pamoja-forest">Grow together.</span>
      </h1>
      <p className="mt-5 text-lg font-semibold text-pamoja-ochre sm:text-xl">Your Ajo, redesigned for the way Africa saves today.</p>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-pamoja-muted sm:text-lg">
        Create a savings group, track every contribution, and keep the payout order visible in one calm, collaborative workspace.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <PrimaryLink to="/auth/register" className="w-full sm:w-auto">Start a group</PrimaryLink>
        <SecondaryLink to="#dashboard-view" className="w-full sm:w-auto">See the workspace <ArrowDown className="h-4 w-4" aria-hidden="true" /></SecondaryLink>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <MiniCheck><CheckCircle2 className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> No manual spreadsheets</MiniCheck>
        <MiniCheck><Zap className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Direct bank-transfer tracking</MiniCheck>
        <MiniCheck><Landmark className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Transparent records</MiniCheck>
      </div>
    </div>

    <div id="dashboard-view" className="mt-12 scroll-mt-24 lg:mt-16">
      <ProductPreview />
    </div>
  </section>
);
