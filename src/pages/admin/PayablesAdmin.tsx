import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { payableService } from '../../services/payableService';
import { Payable } from '../../types/database';
import {
  CreditCard,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Calendar,
  X,
  Trash2,
  Edit2,
  ArrowUpRight,
} from 'lucide-react';

export const PayablesAdmin: React.FC = () => {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0]
  );
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payment Modal
  const [paymentModalPayable, setPaymentModalPayable] = useState<Payable | null>(null);
  const [additionalPayment, setAdditionalPayment] = useState<number>(0);

  const fetchPayables = async () => {
    try {
      const data = await payableService.getPayables();
      setPayables(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const openAddModal = () => {
    setEditingPayable(null);
    setSupplierName('');
    setIngredientName('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0]);
    setTotalAmount(1000000);
    setPaidAmount(0);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Payable) => {
    setEditingPayable(p);
    setSupplierName(p.supplier_name);
    setIngredientName(p.ingredient_name);
    setOrderDate(p.order_date);
    setDueDate(p.due_date);
    setTotalAmount(p.total_amount);
    setPaidAmount(p.paid_amount);
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSavePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !ingredientName.trim() || totalAmount <= 0) return;

    let computedStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (paidAmount >= totalAmount) {
      computedStatus = 'paid';
    } else if (paidAmount > 0) {
      computedStatus = 'partial';
    }

    if (editingPayable) {
      await payableService.updatePayable(editingPayable.id, {
        supplier_name: supplierName.trim(),
        ingredient_name: ingredientName.trim(),
        order_date: orderDate,
        due_date: dueDate,
        total_amount: Number(totalAmount),
        paid_amount: Number(paidAmount),
        status: computedStatus,
        notes: notes.trim() || undefined,
      });
    } else {
      await payableService.createPayable({
        supplier_name: supplierName.trim(),
        ingredient_name: ingredientName.trim(),
        order_date: orderDate,
        due_date: dueDate,
        total_amount: Number(totalAmount),
        paid_amount: Number(paidAmount),
        status: computedStatus,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
    await fetchPayables();
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalPayable || additionalPayment <= 0) return;

    await payableService.recordPayment(paymentModalPayable.id, additionalPayment);
    setPaymentModalPayable(null);
    setAdditionalPayment(0);
    await fetchPayables();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Hapus catatan utang tempo untuk "${name}"?`)) {
      await payableService.deletePayable(id);
      await fetchPayables();
    }
  };

  const filteredPayables = useMemo(() => {
    return payables.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSearch =
        !search.trim() ||
        p.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
        p.ingredient_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [payables, statusFilter, search]);

  // Statistics
  const totalOutstanding = payables
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);

  const totalPaid = payables.reduce((sum, p) => sum + p.paid_amount, 0);
  const activeCount = payables.filter(p => p.status !== 'paid').length;

  return (
    <AdminLayout currentTab="payables">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Utang Piutang &amp; Pesan Tempo Bahan</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pencatatan pembelian stok bahan baku kopi dan operasional dengan sistem pesan tempo / pembayaran bertahap.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Pesan Tempo Baru</span>
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Total Sisa Utang Tempo</span>
              <AlertCircle className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400">
              Rp {totalOutstanding.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeCount} transaksi pesan tempo belum lunas
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Total Sudah Terbayar</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">
              Rp {totalPaid.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Uang keluar untuk supplier</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase">Total Tagihan Keseluruhan</span>
              <CreditCard className="h-4 w-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-white">
              Rp {(totalOutstanding + totalPaid).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Histori seluruh faktur supplier</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama supplier atau bahan baku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Dibayar</option>
            <option value="partial">Sebagian (Dicicil)</option>
            <option value="paid">Sudah Lunas</option>
          </select>
        </div>

        {/* Payables Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Supplier &amp; Bahan</th>
                  <th className="py-3 px-4">Tgl Pesan</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4">Total Tagihan</th>
                  <th className="py-3 px-4">Terbayar</th>
                  <th className="py-3 px-4">Sisa Utang</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPayables.map((item) => {
                  const remaining = Math.max(0, item.total_amount - item.paid_amount);
                  const isOverdue = new Date(item.due_date) < new Date() && item.status !== 'paid';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{item.supplier_name}</span>
                        <span className="text-[11px] text-amber-400 block">{item.ingredient_name}</span>
                        {item.notes && <span className="text-[10px] text-slate-400 italic block">{item.notes}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {item.order_date}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {item.due_date}
                        </span>
                        {isOverdue && (
                          <span className="block text-[10px] text-rose-400 font-bold">Lewat Tempo!</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        Rp {item.total_amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        Rp {item.paid_amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-400">
                        Rp {remaining.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {item.status === 'paid' ? 'Lunas' : item.status === 'partial' ? 'Dicicil' : 'Belum Lunas'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== 'paid' && (
                            <button
                              onClick={() => {
                                setPaymentModalPayable(item);
                                setAdditionalPayment(remaining);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[10px] hover:bg-emerald-500 hover:text-slate-950 transition"
                            >
                              Bayar / Cicil
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.supplier_name)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add / Edit Payable */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">
                  {editingPayable ? 'Edit Utang Tempo' : 'Catat Pesan Tempo Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSavePayable} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Supplier / Pemasok *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: CV Biji Kopi Nusantara"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Bahan Baku / Stok yang Dipesan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Biji Kopi House Blend 20kg"
                    value={ingredientName}
                    onChange={(e) => setIngredientName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tgl Pemesanan</label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Jatuh Tempo</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Total Tagihan (Rp) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={totalAmount || ''}
                      onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sudah Dibayar (DP)</label>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan / Rekening Supplier</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: No faktur F-1029, transfer via BCA 1234..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 mt-2"
                >
                  Simpan Pesan Tempo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Process Payment */}
        {paymentModalPayable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">Bayar / Cicil Tagihan</h3>
                <button onClick={() => setPaymentModalPayable(null)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="font-bold text-white">{paymentModalPayable.supplier_name}</p>
                <p className="text-slate-400">{paymentModalPayable.ingredient_name}</p>
                <p className="text-rose-400 font-bold pt-1">
                  Sisa Tagihan: Rp {(paymentModalPayable.total_amount - paymentModalPayable.paid_amount).toLocaleString('id-ID')}
                </p>
              </div>

              <form onSubmit={handleProcessPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nominal Pembayaran (Rp)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={paymentModalPayable.total_amount - paymentModalPayable.paid_amount}
                    value={additionalPayment || ''}
                    onChange={(e) => setAdditionalPayment(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Konfirmasi Pembayaran
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
