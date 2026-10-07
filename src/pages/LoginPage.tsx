import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { Coffee, Lock, User, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { user, login, logout } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(usernameOrEmail, password);
      if (res.success) {
        navigate('/pos');
      } else {
        setError(res.error || 'Username atau kata sandi tidak valid.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan login.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-4">
            <UserCheck className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-bold text-white">Anda Sudah Masuk</h2>
          <p className="text-sm font-semibold text-amber-400 mt-1">{user.profile.full_name}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Role: <span className="uppercase font-bold text-slate-200">{user.profile.role}</span></p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              <Coffee className="h-4 w-4" />
              <span>Buka Sistem POS</span>
            </button>

            {(user.profile.role === 'owner' || user.profile.role === 'admin') && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <span>Dashboard Admin</span>
              </button>
            )}

            <button
              onClick={async () => {
                await logout();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 py-2 transition"
            >
              Keluar Akun (Logout)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 mb-3">
            <Coffee className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">K99 KEDAI</h1>
          <p className="text-xs text-slate-400 mt-1">Portal Masuk Staf &amp; Kasir POS</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / Email Staf
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Apep atau username staf..."
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Akun default info notice */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-[11px] text-slate-400 border border-slate-700/50">
              <span>Akun Utama:</span>
              <code className="font-bold text-amber-400">Apep</code>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            &larr; Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
