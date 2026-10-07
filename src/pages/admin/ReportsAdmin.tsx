import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { reportService, SalesReport } from '../../services/reportService';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  PieChart,
  Calendar,
  RotateCw,
  Award,
} from 'lucide-react';

export const ReportsAdmin: React.FC = () => {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('all');

  const fetchReport = async () => {
    setLoading(true);
    let startDate: string | undefined;

    const now = new Date();
    if (timeRange === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate = todayStart.toISOString();
    } else if (timeRange === '7days') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString();
    } else if (timeRange === '30days') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString();
    }

    try {
      const rep = await reportService.getSalesReport(startDate ? { startDate } : undefined);
      setReport(rep);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeRange]);

  return (
    <AdminLayout currentTab="reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Laporan Keuangan &amp; Penjualan</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Analisis pendapatan omzet, estimasi HPP, margin laba bersih, dan tren produk terlaris K99.
            </p>
          </div>

          {/* Time range pills */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === 'today' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === '7days' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setTimeRange('30days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === '30days' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                timeRange === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Omzet</span>
            <p className="text-2xl font-black text-white mt-1">
              Rp {report ? report.totalRevenue.toLocaleString('id-ID') : '0'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Dari {report?.totalTransactions || 0} transaksi
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Estimasi HPP (Modal)</span>
            <p className="text-2xl font-black text-rose-300 mt-1">
              Rp {report ? report.totalCost.toLocaleString('id-ID') : '0'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Bahan baku &amp; kemasan</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Gross Profit (Laba)</span>
            <p className="text-2xl font-black text-amber-400 mt-1">
              Rp {report ? report.grossProfit.toLocaleString('id-ID') : '0'}
            </p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              Margin {report ? report.profitMarginPercent.toFixed(1) : 0}%
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <span className="text-xs text-slate-400 uppercase font-semibold">Order Selesai</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {report ? report.completedOrdersCount : 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Online: {report?.onlineOrdersCount || 0} • POS: {report?.posOrdersCount || 0}
            </p>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Award className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Peringkat Penjualan Produk</h3>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2">Peringkat</th>
                <th className="py-2">Nama Produk</th>
                <th className="py-2 text-right">Qty Terjual</th>
                <th className="py-2 text-right">Total Penjualan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {report?.topProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2.5 font-bold text-amber-400">#{idx + 1}</td>
                  <td className="py-2.5 font-semibold text-white">{p.name}</td>
                  <td className="py-2.5 text-right font-bold text-white">{p.quantity} cup/porsi</td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                    Rp {p.revenue.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
