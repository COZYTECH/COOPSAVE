import { ArrowUpRight, CircleDollarSign } from 'lucide-react';

const communityImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgaeYAJKwNCTUQglt3nW8T1F9ot-dIW0hc5BRmBTs3LPhSsQ-jUFZ58D0AwnR3gcJ15EFKg3GH93EhKFqlWm-1XrvHZ_GSSxD0GXn_g-WubteOXLFpNEiNEeCz4O_uwPVpX9Lh_T4pXFN8PW53Vi-_XU-qs87FeWzcEbsmp3DYqdd9PqkKB9MF6gs1lZS1tEX6WEKep3JigXnhm2mtrt7aeZMp4c3pMda4T9Vg25dRBO-A3YyWvfk';

export const HeritageSection = () => (
  <section className="bg-pamoja-sage" aria-labelledby="heritage-heading">
    <div className="pamoja-section grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
      <div className="relative overflow-hidden rounded-2xl bg-pamoja-forest p-2 shadow-pamoja-deep">
        <img src={communityImage} alt="Community members collaborating around a shared savings goal" loading="lazy" className="h-[320px] w-full rounded-xl object-cover sm:h-[420px]" />
        <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-pamoja-forest/90 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><CircleDollarSign className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" /> Ubuntu economics</div>
      </div>
      <div>
        <p className="pamoja-eyebrow">Our heritage</p>
        <h2 id="heritage-heading" className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em] text-pamoja-forest-deep sm:text-4xl">An old idea. A better experience.</h2>
        <p className="mt-5 text-lg font-semibold text-pamoja-forest">“I am because we are. We thrive because we build together.”</p>
        <div className="mt-5 space-y-4 text-sm leading-7 text-pamoja-muted"><p>Across Africa, people have always found ways to save together: Ajo, Susu, Chama, and Esusu.</p><p>Pamoja respects the human trust at the heart of those circles and gives it a clearer place to live: visible contributions, shared timing, and records that are easier to understand.</p></div>
        <div className="mt-7 grid grid-cols-3 gap-2 text-center"><HeritageStat value="100%" label="African roots" /><HeritageStat value="₦0" label="Hidden percentage cut" /><HeritageStat value="0" label="Crypto friction" /></div>
        <a href="#faqs" className="pamoja-focus mt-7 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-pamoja-forest hover:text-pamoja-ochre">Learn how it works <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    </div>
  </section>
);

const HeritageStat = ({ value, label }) => <div className="rounded-xl bg-white p-3 shadow-pamoja-soft"><p className="text-lg font-bold text-pamoja-forest">{value}</p><p className="mt-1 text-[10px] leading-4 text-pamoja-muted">{label}</p></div>;
