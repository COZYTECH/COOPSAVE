import { useEffect } from 'react';
import { FaqSection } from '../components/landing/FaqSection.jsx';
import { ExperiencesSection } from '../components/landing/ExperiencesSection.jsx';
import { FinalCta } from '../components/landing/FinalCta.jsx';
import { HeritageSection } from '../components/landing/HeritageSection.jsx';
import { HeroSection } from '../components/landing/HeroSection.jsx';
import { HowItWorksSection } from '../components/landing/HowItWorksSection.jsx';
import { LandingFooter } from '../components/landing/LandingFooter.jsx';
import { LandingNavbar } from '../components/landing/LandingNavbar.jsx';
import { PayoutSection } from '../components/landing/PayoutSection.jsx';
import { ProblemSection } from '../components/landing/ProblemSection.jsx';
import { SecuritySection } from '../components/landing/SecuritySection.jsx';
import { ShowcaseSection } from '../components/landing/ShowcaseSection.jsx';
import { TrustSection } from '../components/landing/TrustSection.jsx';
import { UseCasesSection } from '../components/landing/UseCasesSection.jsx';

export const LandingPage = () => {
  useEffect(() => {
    document.title = 'Pamoja | Save together. Grow together.';
  }, []);

  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-pamoja-canvas font-sans text-pamoja-ink">
      <LandingNavbar />
      <main className="pt-20">
        <HeroSection />
        <TrustSection />
        <ProblemSection />
        <HowItWorksSection />
        <ShowcaseSection />
        <ExperiencesSection />
        <PayoutSection />
        <SecuritySection />
        <UseCasesSection />
        <HeritageSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
};
