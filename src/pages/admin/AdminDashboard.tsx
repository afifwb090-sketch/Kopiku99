import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { reportService, SalesReport } from '../../services/reportService';
import { orderService } from '../../services/orderService';
import { useStore } from '../../context/StoreContext';
import { useRouter } from '../../context/RouterContext';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Bell,
  Coffee,
  Boxes,
  ArrowUpRight,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const { storeSettings, toggleStoreStatus } = useStore();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const rep = await reportService.getSalesReport();
        setReport(rep);
      } catch (err) {
        console.error('Error fetching admin dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout currentTab="dashboard">
      <div className="space-y-6">
        {/* Top welcome & quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Dashboard K99</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Pantau performa penjualan, pesanan online, laba kotor, dan operasional kedai.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition"
            >
              <Coffee className="h-4 w-4" />
              <span>Buka Kasir POS</span>
            </button>
          </div>
        </div>

        {/* 6 Key Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Omzet Total */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Omzet</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-white">
                Rp {report ? report.totalRevenue.toLocaleString('id-ID') : '...'}
              </span>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                Dari {report?.totalTransactions || 0} transaksi
              </p>
            </div>
          </div>

          {/* 2. Gross Profit (Laba Kotor / Omzet - HPP) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Gross Profit (Laba)</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                Rp {report ? report.grossProfit.toLocaleString('id-ID') : '...'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Margin laba: {report ? report.profitMarginPercent.toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* 3. Total Transaksi */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Jumlah Transaksi</span>
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-white">
                {report ? report.totalTransactions : 0}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                POS: {report?.posOrdersCount || 0} • Online: {report?.onlineOrdersCount || 0}
              </p>
            </div>
          </div>

          {/* 4. Order Online Masuk */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Order Online</span>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-blue-400">
                {report ? report.onlineOrdersCount : 0}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Pesanan via /store</p>
            </div>
          </div>

          {/* 5. Total Modal / HPP */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Estimasi HPP (Modal)</span>
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-rose-300">
                Rp {report ? report.totalCost.toLocaleString('id-ID') : '...'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Berdasarkan data resep & modal</p>
            </div>
          </div>

          {/* 6. Status Toko Operasional */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Status Operasional</span>
              <div className={`rounded-lg p-2 ${storeSettings.is_open ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className={`text-lg sm:text-xl font-black ${storeSettings.is_open ? 'text-emerald-400' : 'text-rose-400'}`}>
                {storeSettings.is_open ? '🟢 TOKO BUKA' : '🔴 TOKO TUTUP'}
              </span>
              <div className="mt-2">
                <button
                  onClick={() => toggleStoreStatus(!storeSettings.is_open)}
                  className="text-xs underline text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Ganti Status Sekarang &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Top Selling Products & Payment Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Produk Terlaris K99</h3>
              </div>
              <button
                onClick={() => navigate('/admin/reports')}
                className="text-xs text-amber-400 hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="space-y-2">
              {report?.topProducts && report.topProducts.length > 0 ? (
                report.topProducts.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-white">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-400">{item.quantity} terjual</span>
                      <span className="text-[10px] text-slate-400 block">
                        Rp {item.revenue.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada data penjualan.</p>
              )}
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Metode Pembayaran</h3>
              <span className="text-xs text-slate-400">Total Transaksi</span>
            </div>

            <div className="space-y-3">
              {report?.paymentBreakdown && Object.entries(report.paymentBreakdown).map(([method, data]) => (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="uppercase text-slate-300">{method}</span>
                    <span className="text-white">
                      Rp {data.total.toLocaleString('id-ID')} ({data.count}x)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${report.totalRevenue > 0 ? Math.min(100, (data.total / report.totalRevenue) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
