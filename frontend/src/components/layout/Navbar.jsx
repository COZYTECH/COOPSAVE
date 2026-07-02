import { Menu, Search, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-10 w-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/75 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative hidden flex-1 sm:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
            aria-hidden="true"
          />
          <input
            className="h-10 w-full max-w-md rounded-lg border border-ink/10 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
            placeholder="Search members, accounts, cooperatives"
            type="search"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-ink">{user?.name || 'Admin'}</p>
            <p className="text-xs text-ink/50">{user?.email}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-mint text-sm font-bold text-moss">
            {(user?.name || 'A').slice(0, 1).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={logout}
            className="grid h-10 w-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/70 hover:text-clay"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};
