import { NavLink } from 'react-router-dom';
import {
  BadgeDollarSign,
  Building2,
  LayoutDashboard,
  RefreshCcw,
  Users,
  X
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Cooperatives', href: '/cooperatives', icon: Building2 },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Reconciliation', href: '/reconciliation', icon: RefreshCcw }
];

const SidebarContent = ({ onClose }) => (
  <div className="flex h-full flex-col border-r border-ink/10 bg-white">
    <div className="flex h-16 items-center justify-between px-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-moss text-white">
          <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold uppercase text-moss">CoopSave</p>
          <p className="text-xs text-ink/55">Cooperative banking</p>
        </div>
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
        <p className="text-xs font-semibold uppercase text-ink/45">Settlement</p>
        <p className="mt-1 text-sm font-semibold text-ink">Nomba connected</p>
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
