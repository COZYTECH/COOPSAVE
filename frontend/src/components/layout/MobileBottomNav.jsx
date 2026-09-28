import { NavLink, useLocation } from 'react-router-dom';
import { Activity, Building2, Home, Plus, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { isGroupAdmin, isPlatformAdmin } from '../../lib/access';

const groupItems = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Groups', href: '/cooperatives', icon: Building2 },
  { label: 'Add member', href: '/members', icon: Plus, primary: true },
  { label: 'Members', href: '/members', icon: Users }
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const items = isPlatformAdmin(user)
    ? [{ label: 'Platform', href: '/admin', icon: ShieldCheck }, { label: 'Accounts', href: '/admin/financial-accounts', icon: Building2 }, { label: 'Reconciliation', href: '/admin/reconciliation', icon: Activity }]
    : isGroupAdmin(user)
      ? groupItems
      : [{ label: 'Home', href: '/dashboard', icon: Home }];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-pamoja-forest/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-pamoja-deep backdrop-blur lg:hidden" aria-label="Mobile navigation">
      <div className="mx-auto flex max-w-md items-end justify-between">
        {items.map(({ label, href, icon: Icon, primary }) => {
          const active = location.pathname === href || (href === '/members' && location.pathname.startsWith('/members'));

          return <NavLink key={label} to={href} className={['pamoja-focus flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition', primary ? 'text-pamoja-forest' : active ? 'text-pamoja-forest' : 'text-pamoja-muted'].join(' ')} aria-label={label}><span className={['grid h-9 w-9 place-items-center rounded-full', primary ? 'h-12 w-12 -translate-y-3 bg-pamoja-forest text-white shadow-pamoja-raised ring-4 ring-pamoja-surface' : active ? 'bg-pamoja-sage text-pamoja-forest' : ''].join(' ')}><Icon className={primary ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" /></span><span className={primary ? '-mt-3' : ''}>{label}</span></NavLink>;
        })}
      </div>
    </nav>
  );
};
