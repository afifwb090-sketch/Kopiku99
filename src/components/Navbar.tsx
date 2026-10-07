import React from 'react';
import { useRouter } from '../context/RouterContext';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { StoreStatusBadge } from './StoreStatusBadge';
import { ShoppingBag, Coffee, LayoutDashboard, Store, LogIn, LogOut } from 'lucide-react';

interface Props {
  onOpenCart?: () => void;
}

export const Navbar: React.FC<Props> = ({ onOpenCart }) => {
  const { path, navigate } = useRouter();
  const { storeSettings, onlineCart } = useStore();
  const { user, logout } = useAuth();

  const totalCartCount = onlineCart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-left text-white transition hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-extrabold text-slate-950 shadow-md shadow-amber-500/20">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-lg font-black tracking-wider text-amber-400">K99</span>
              <span className="block -mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Kedai Kopi & Teh
              </span>
            </div>
          </button>

          {/* Realtime Status Badge in Navbar */}
          <div className="hidden sm:block ml-2">
            <StoreStatusBadge isOpen={storeSettings.is_open} size="sm" />
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => navigate('/')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              path === '/'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => navigate('/store')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              path === '/store'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Menu Online
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart Button (Always accessible or active on /store) */}
          <button
            onClick={() => {
              if (path !== '/store') {
                navigate('/store');
              }
              if (onOpenCart) onOpenCart();
            }}
            className="relative flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-500/50 hover:bg-slate-800"
            title="Keranjang Belanja"
          >
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Keranjang</span>
            {totalCartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Staff Auth Links */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/pos')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  path.startsWith('/pos')
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-amber-500/10'
                }`}
              >
                <Coffee className="h-3.5 w-3.5" />
                <span>POS</span>
              </button>

              {(user.profile.role === 'owner' || user.profile.role === 'admin') && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    path.startsWith('/admin')
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </button>
              )}

              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              <LogIn className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Staf Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
