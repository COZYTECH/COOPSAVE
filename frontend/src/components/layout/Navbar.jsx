import { Bell, ChevronDown, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getGroups, isGroupAdmin, isPlatformAdmin } from '../../lib/access';
import { Logo } from '../landing/LandingPrimitives.jsx';

const groupNavItems = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Groups', href: '/cooperatives' },
  { label: 'Members', href: '/members' }
];

export const Navbar = () => {
  const { user, logout } = useAuth();
  const platformAdmin = isPlatformAdmin(user);
  const groupAdmin = isGroupAdmin(user);
  const groups = getGroups(user);
  const navItems = platformAdmin
    ? [{ label: 'Platform', href: '/admin' }, { label: 'Financial Accounts', href: '/admin/financial-accounts' }, { label: 'Reconciliation', href: '/admin/reconciliation' }]
    : groupAdmin
      ? groupNavItems
      : [{ label: 'My dashboard', href: '/dashboard' }];

  return (
    <header className="sticky top-0 z-30 border-b border-pamoja-forest/8 bg-pamoja-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-pamoja items-center gap-5 px-4 sm:px-6 lg:px-12">
        <Logo />
        <div className="hidden h-10 w-px bg-pamoja-forest/10 lg:block" aria-hidden="true" />
        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <ShieldCheck className="h-4 w-4 text-pamoja-ochre" aria-hidden="true" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-pamoja-forest">{platformAdmin ? 'Platform workspace' : groupAdmin ? 'Group workspace' : groups.length ? 'Member workspace' : 'Getting started'}</p>
            <p className="text-[11px] text-pamoja-muted">Pamoja operations</p>
          </div>
        </div>

        <nav className="ml-2 hidden items-center gap-1 rounded-xl bg-pamoja-sage/70 p-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => [
                'pamoja-focus rounded-lg px-3 py-2 text-sm font-semibold transition',
                isActive ? 'bg-pamoja-forest text-white shadow-sm' : 'text-pamoja-body hover:bg-white/80 hover:text-pamoja-forest'
              ].join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {groupAdmin && <Link to="/cooperatives" className="pamoja-focus hidden min-h-11 items-center gap-2 rounded-lg bg-pamoja-forest px-4 text-sm font-semibold text-white shadow-pamoja-soft transition hover:bg-pamoja-forest-deep sm:inline-flex"><Plus className="h-4 w-4" aria-hidden="true" />New group</Link>}
          {groupAdmin && <Link to="/cooperatives" className="pamoja-focus hidden min-h-11 items-center gap-1 rounded-lg border border-pamoja-forest/12 bg-white px-3 text-sm font-semibold text-pamoja-forest sm:inline-flex">All groups<ChevronDown className="h-4 w-4" aria-hidden="true" /></Link>}
          <Link to="/notifications" className="pamoja-focus relative grid h-10 w-10 place-items-center rounded-lg text-pamoja-body" aria-label="Notifications" title="Notifications"><Bell className="h-5 w-5" aria-hidden="true" /><span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-pamoja-ochre" aria-hidden="true" /></Link>
          <div className="hidden text-right md:block"><p className="text-sm font-semibold text-pamoja-ink">{user?.name || 'User'}</p><p className="text-[11px] text-pamoja-muted">{user?.email}</p></div>
          <button type="button" onClick={logout} className="pamoja-focus inline-flex min-h-10 items-center gap-2 rounded-lg border border-pamoja-forest/12 bg-white px-3 text-sm font-semibold text-pamoja-forest transition hover:bg-pamoja-sage" aria-label="Logout" title="Logout"><LogOut className="h-4 w-4" aria-hidden="true" /><span>Logout</span></button>
        </div>
      </div>
    </header>
  );
};
