import { ArrowUpRight, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './LandingPrimitives.jsx';

const productLinks = [['Digital Ajo', '#product'], ['How it works', '#how-it-works'], ['For groups', '#for-groups']];
const companyLinks = [['Security', '#security'], ['FAQs', '#faqs'], ['Log in', '/auth/login']];

export const LandingFooter = () => (
  <footer className="mt-8 bg-pamoja-sage/80" aria-label="Footer">
    <div className="mx-auto max-w-pamoja px-5 pb-8 pt-12 md:px-8 lg:pt-16">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5"><Logo /><p className="mt-5 max-w-sm text-sm leading-6 text-pamoja-muted">A clearer digital workspace for communal savings, contribution tracking, and shared financial goals.</p><div className="mt-5 flex items-center gap-2"><TrustIcon icon={LockKeyhole} label="Protected" /><TrustIcon icon={ShieldCheck} label="Reviewable" /><TrustIcon icon={FileText} label="Auditable" /></div></div>
        <FooterColumn title="Product" links={productLinks} />
        <FooterColumn title="Explore" links={companyLinks} />
        <div className="lg:col-span-3"><p className="text-sm font-semibold text-pamoja-forest">Built for shared progress</p><p className="mt-3 text-sm leading-6 text-pamoja-muted">Keep members, contribution records, and group decisions in one place.</p><div className="mt-5 rounded-xl bg-white p-4 shadow-pamoja-soft"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-pamoja-muted">Product preview</p><p className="mt-2 text-sm font-semibold text-pamoja-forest">Demo data stays separate from your live account.</p></div></div>
      </div>
      <div className="mt-12 flex flex-col justify-between gap-4 border-t border-pamoja-forest/8 pt-5 text-xs text-pamoja-muted sm:flex-row sm:items-center"><p>© {new Date().getFullYear()} Pamoja. Save together. Grow together.</p><div className="flex items-center gap-5"><Link to="/" className="pamoja-focus hover:text-pamoja-forest">Privacy</Link><Link to="/" className="pamoja-focus hover:text-pamoja-forest">Terms</Link><a href="#top" className="pamoja-focus inline-flex items-center gap-1 hover:text-pamoja-forest">Back to top <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a></div></div>
    </div>
  </footer>
);

const FooterColumn = ({ title, links }) => <div className="lg:col-span-2"><p className="text-sm font-semibold text-pamoja-forest">{title}</p><ul className="mt-4 space-y-3">{links.map(([label, href]) => <li key={label}>{href.startsWith('/') ? <Link to={href} className="pamoja-focus text-sm text-pamoja-muted hover:text-pamoja-forest">{label}</Link> : <a href={href} className="pamoja-focus text-sm text-pamoja-muted hover:text-pamoja-forest">{label}</a>}</li>)}</ul></div>;
const TrustIcon = ({ icon: Icon, label }) => <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-pamoja-forest shadow-pamoja-soft"><Icon className="h-3.5 w-3.5 text-pamoja-ochre" aria-hidden="true" /> {label}</span>;
