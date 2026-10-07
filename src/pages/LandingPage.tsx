import React from 'react';
import { useRouter } from '../context/RouterContext';
import { useStore } from '../context/StoreContext';
import { StoreStatusBadge } from '../components/StoreStatusBadge';
import {
  Coffee,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Heart,
  ShieldCheck,
} from 'lucide-react';

export const LandingPage: React.FC<{ onOpenCart: () => void }> = ({ onOpenCart }) => {
  const { navigate } = useRouter();
  const { storeSettings, products, addToOnlineCart } = useStore();

  const featuredProducts = products.filter(p => p.is_active).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 py-16 sm:py-24">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Realtime Status Banner */}
          <div className="mb-6 flex justify-center">
            <StoreStatusBadge isOpen={storeSettings.is_open} size="lg" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4">
            Selamat Datang di <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">K99 KEDAI</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 mb-8 leading-relaxed">
            {storeSettings.description ||
              'Kedai kopi & teh favorit dengan racikan biji kopi pilihan, bahan berkualitas, dan suasana hangat untuk santai maupun produktif.'}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {storeSettings.is_open ? (
              <button
                onClick={() => navigate('/store')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-4 text-base font-extrabold text-slate-950 shadow-xl shadow-amber-500/25 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingBag className="h-5 w-5" />
                <span>PESAN SEKARANG</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => navigate('/store')}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-8 py-4 text-base font-bold text-slate-300 transition hover:bg-slate-800"
                >
                  <span>Lihat Daftar Menu</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-rose-400">
                  Kedai saat ini sedang tutup. Pemesanan online akan diproses saat kedai buka kembali.
                </span>
              </div>
            )}

            <a
              href="#lokasi"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-4 text-sm font-semibold text-slate-200 backdrop-blur-sm transition hover:bg-slate-800 hover:text-white"
            >
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>Lokasi & Kontak</span>
            </a>
          </div>

          {/* Fast badges */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
              <Coffee className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-200">Biji Kopi Segar</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
              <Sparkles className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-200">Resep Racikan K99</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-200">Dine-in & Takeaway</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
              <ShieldCheck className="h-5 w-5 text-sky-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-slate-200">Pembayaran QRIS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Menu Preview */}
      <section className="py-16 bg-slate-950 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Favorit Pelanggan</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Menu Populer K99</h2>
            </div>
            <button
              onClick={() => navigate('/store')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              <span>Lihat Semua Menu Online</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((prod) => (
              <div
                key={prod.id}
                className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden transition-all duration-200 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Coffee className="h-10 w-10 text-slate-700" />
                    </div>
                  )}
                  {prod.category_name && (
                    <span className="absolute top-2 left-2 rounded-lg bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                      {prod.category_name}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                    {prod.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400 flex-1">
                    {prod.description || 'Racikan istimewa dari barista K99.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-base font-extrabold text-amber-400">
                      Rp {prod.price.toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => {
                        addToOnlineCart(prod, 1);
                        navigate('/store');
                        onOpenCart();
                      }}
                      className="rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition"
                    >
                      Pesan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info, Location & Hours Section */}
      <section id="lokasi" className="py-16 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Opening Hours */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Jam Operasional</h3>
                  <p className="text-xs text-slate-400">Buka Setiap Hari</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-300 flex-1">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Senin - Jumat</span>
                  <span className="font-semibold text-white">09:00 - 22:00 WIB</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span>Sabtu - Minggu</span>
                  <span className="font-semibold text-white">08:00 - 23:00 WIB</span>
                </div>
                <div className="mt-3 pt-2">
                  <StoreStatusBadge isOpen={storeSettings.is_open} size="sm" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Lokasi Kedai</h3>
                  <p className="text-xs text-slate-400">Tempat Santai & Cozy</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed flex-1">
                {storeSettings.address || 'Jl. Pemuda No. 99, Kawasan Kuliner K99'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Tersedia area indoor ber-AC dan outdoor smoking area dengan Wi-Fi kencang.
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-400">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Kontak & Reservasi</h3>
                  <p className="text-xs text-slate-400">WhatsApp Pelanggan</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 flex-1">
                Butuh pesanan dalam jumlah banyak, acara gathering, atau tanya menu?
              </p>
              <a
                href={`https://wa.me/${(storeSettings.phone || '081299001999').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition"
              >
                <Phone className="h-4 w-4" />
                <span>Hubungi {storeSettings.phone || '0812-9900-1999'}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-slate-300">K99 KEDAI</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/store')}
              className="hover:text-slate-300 transition"
            >
              Order Online
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-amber-400/80 hover:text-amber-400 font-semibold transition"
            >
              Portal Staf &amp; POS
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
