import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Logo = ({ inverse = false }) => (
  <Link
    to="/"
    className="pamoja-focus inline-flex items-center gap-2.5 rounded-lg"
    aria-label="Pamoja home"
  >
    <span
      className={[
        'relative grid h-8 w-8 place-items-center rounded-full',
        inverse ? 'bg-white text-pamoja-forest' : 'bg-pamoja-forest text-white'
      ].join(' ')}
      aria-hidden="true"
    >
      <span className="absolute h-3.5 w-3.5 rounded-full border-2 border-current" />
      <span className="absolute h-1.5 w-1.5 rounded-full bg-pamoja-ochre" />
    </span>
    <span className={inverse ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-pamoja-forest'}>
      Pamoja
    </span>
  </Link>
);

export const SectionHeading = ({ eyebrow, title, description, centered = true, id }) => (
  <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
    {eyebrow && <p className="pamoja-eyebrow">{eyebrow}</p>}
    <h2 id={id} className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em] text-pamoja-forest-deep sm:text-4xl lg:text-[2.75rem]">
      {title}
    </h2>
    {description && <p className="mt-4 text-base leading-7 text-pamoja-muted sm:text-lg">{description}</p>}
  </div>
);

export const PrimaryLink = ({ to, children, className = '', onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={[
      'pamoja-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-pamoja-forest px-5 py-3 text-sm font-semibold text-white shadow-pamoja-soft transition hover:bg-pamoja-forest-deep',
      className
    ].join(' ')}
  >
    {children}
    <ArrowRight className="h-4 w-4" aria-hidden="true" />
  </Link>
);

export const SecondaryLink = ({ to, children, className = '', onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={[
      'pamoja-focus inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-pamoja-forest/15 bg-white px-5 py-3 text-sm font-semibold text-pamoja-forest transition hover:bg-pamoja-sage',
      className
    ].join(' ')}
  >
    {children}
  </Link>
);

export const StatusPill = ({ children, tone = 'green' }) => {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800',
    ochre: 'bg-orange-100 text-orange-800',
    forest: 'bg-pamoja-sage text-pamoja-forest',
    white: 'bg-white/15 text-white'
  };

  return <span className={['inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', tones[tone]].join(' ')}>{children}</span>;
};

export const Avatar = ({ initials, className = '' }) => (
  <span className={['grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pamoja-sage text-xs font-bold text-pamoja-forest', className].join(' ')}>
    {initials}
  </span>
);

export const MiniCheck = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-pamoja-muted">
    {children}
  </span>
);
