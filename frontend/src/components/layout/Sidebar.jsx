import { NavLink } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  Users,
  X
} from 'lucide-react';
import { Logo } from '../landing/LandingPrimitives.jsx';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Groups', href: '/cooperatives', icon: Building2 },
  { label: 'Members', href: '/members', icon: Users }
];

const SidebarContent = ({ onClose }) => (
  <div className="flex h-full flex-col border-r border-ink/10 bg-white shadow-pamoja-soft">
      <div className="flex h-16 items-center justify-between px-5">
      <div>
        <Logo />
        <p className="mt-1 pl-10 text-xs text-ink/55">Community finance</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink/65 hover:bg-ink/5 lg:hidden"
        aria-label="Close sidebar"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                isActive
                  ? 'bg-mint text-moss'
                  : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>

    <div className="border-t border-ink/10 p-4">
      <div className="rounded-lg bg-paper p-3">
        <p className="text-xs font-semibold uppercase text-ink/45">Payment provider</p>
        <p className="mt-1 text-sm font-semibold text-ink">Flutterwave test mode</p>
      </div>
    </div>
  </div>
);

export const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation overlay"
        />
      )}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        ].join(' ')}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
};
