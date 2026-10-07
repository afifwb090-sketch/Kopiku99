import React from 'react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { StoreStatusBadge } from '../../components/StoreStatusBadge';
import {
  Coffee,
  LayoutDashboard,
  UtensilsCrossed,
  Tags,
  Boxes,
  Receipt,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  Power,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode; currentTab: string }> = ({
  children,
  currentTab,
}) => {
  const { navigate } = useRouter();
  const { user, logout } = useAuth();
  const { storeSettings, toggleStoreStatus } = useStore();

  if (!user) {
    navigate('/login');
    return null;
  }

  // Cashier cannot access admin
  if (user.profile.role !== 'owner' && user.profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-6 text-center">
          <ShieldAlert className="h-12 w-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Akses Ditolak</h2>
          <p className="text-xs text-slate-400 mt-1">
            Akun kasir tidak memiliki izin untuk mengakses area administrasi K99.
          </p>
          <button
            onClick={() => navigate('/pos')}
            className="mt-6 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950"
          >
            Kembali ke POS Kasir
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { id: 'products', label: 'Produk & Menu', path: '/admin/products', icon: UtensilsCrossed },
    { id: 'categories', label: 'Kategori', path: '/admin/categories', icon: Tags },
    { id: 'inventory', label: 'Inventaris & Resep', path: '/admin/inventory', icon: Boxes },
    { id: 'payables', label: 'Utang Piutang Tempo', path: '/admin/payables', icon: CreditCard },
    { id: 'orders', label: 'Transaksi & Order', path: '/admin/orders', icon: Receipt },
    { id: 'reports', label: 'Laporan & Profit', path: '/admin/reports', icon: BarChart3 },
    ...(user.profile.role === 'owner'
      ? [{ id: 'settings', label: 'Pengaturan & Staf', path: '/admin/settings', icon: Settings }]
      : []),
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col justify-between hidden md:flex">
        {/* Top brand */}
        <div>
          <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-wide text-white">K99 ADMIN</span>
              <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                Panel Manajemen
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-2">
          {/* Store status pill */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 flex items-center justify-between">
            <StoreStatusBadge isOpen={storeSettings.is_open} size="sm" />
            <button
              onClick={() => toggleStoreStatus(!storeSettings.is_open, user.id)}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                storeSettings.is_open
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950'
              }`}
              title="Ubah Status Buka/Tutup Toko"
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => navigate('/pos')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition"
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>Buka Kasir POS</span>
          </button>

          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <div className="truncate pr-2">
              <p className="font-semibold text-slate-200 truncate">{user.profile.full_name}</p>
              <p className="text-[10px] uppercase font-bold text-amber-400/80">{user.profile.role}</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-slate-800 transition"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900 flex md:hidden items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pos')}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="font-black text-sm text-white">K99 Admin</span>
          </div>

          {/* Quick mobile horizontal tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navItems.slice(0, 4).map((it) => (
              <button
                key={it.id}
                onClick={() => navigate(it.path)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                  currentTab === it.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                {it.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
