import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo, PrimaryLink } from './LandingPrimitives.jsx';

const links = [
  ['Product', '#product'],
  ['How it works', '#how-it-works'],
  ['For groups', '#for-groups'],
  ['Security', '#security'],
  ['FAQs', '#faqs']
];

export const LandingNavbar = () => {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-pamoja-forest/5 bg-pamoja-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-pamoja items-center justify-between gap-4 px-5 md:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {links.map(([label, href], index) => (
            <a
              key={href}
              href={href}
              className={[
                'pamoja-focus rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:text-pamoja-ochre',
                index === 0 ? 'bg-pamoja-sage text-pamoja-forest' : 'text-pamoja-muted'
              ].join(' ')}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link to="/auth/login" className="pamoja-focus rounded-lg px-3 py-2 text-sm font-semibold text-pamoja-forest transition hover:text-pamoja-ochre">
            Log in
          </Link>
          <PrimaryLink to="/auth/register" className="min-h-11 px-4 py-2">
            Start a group
          </PrimaryLink>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-pamoja-forest text-xs font-semibold text-white" aria-hidden="true">P</span>
        </div>

        <button
          type="button"
          className="pamoja-focus grid h-11 w-11 place-items-center rounded-lg border border-pamoja-forest/10 bg-white text-pamoja-forest sm:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="border-t border-pamoja-forest/8 bg-pamoja-canvas px-5 py-4 sm:hidden">
          <nav className="mx-auto grid max-w-pamoja gap-1" aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <a key={href} href={href} onClick={closeMenu} className="pamoja-focus rounded-lg px-3 py-3 text-sm font-semibold text-pamoja-forest hover:bg-pamoja-sage">
                {label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-pamoja-forest/8 pt-3">
              <Link to="/auth/login" onClick={closeMenu} className="pamoja-focus rounded-lg border border-pamoja-forest/12 px-3 py-3 text-center text-sm font-semibold text-pamoja-forest">Log in</Link>
              <PrimaryLink to="/auth/register" onClick={closeMenu} className="min-h-11 px-3 py-2">Start a group</PrimaryLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
