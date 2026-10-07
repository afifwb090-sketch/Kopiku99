import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useStore } from '../../context/StoreContext';
import { productService } from '../../services/productService';
import { Product } from '../../types/database';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Upload,
  Coffee,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ProductsAdmin: React.FC = () => {
  const { products, categories, refreshData } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setPrice(15000);
    setCostPrice(6000);
    setImageUrl('');
    setIsActive(true);
    setIsAvailable(true);
    setSortOrder(0);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.category_id || '');
    setDescription(prod.description || '');
    setPrice(prod.price);
    setCostPrice(prod.cost_price || 0);
    setImageUrl(prod.image_url || '');
    setIsActive(prod.is_active);
    setIsAvailable(prod.is_available);
    setSortOrder(prod.sort_order || 0);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await productService.uploadProductImage(file);
      if (url) {
        setImageUrl(url);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, {
          name: name.trim(),
          category_id: categoryId || null,
          description: description.trim() || null,
          price: Number(price),
          cost_price: Number(costPrice),
          image_url: imageUrl.trim() || null,
          is_active: isActive,
          is_available: isAvailable,
          sort_order: Number(sortOrder),
        });
      } else {
        await productService.createProduct({
          name: name.trim(),
          category_id: categoryId || null,
          description: description.trim() || null,
          price: Number(price),
          cost_price: Number(costPrice),
          image_url: imageUrl.trim() || null,
          is_active: isActive,
          is_available: isAvailable,
          sort_order: Number(sortOrder),
        });
      }

      await refreshData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Gagal menyimpan produk: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${prodName}"?`)) {
      await productService.deleteProduct(id);
      await refreshData();
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <AdminLayout currentTab="products">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Manajemen Produk &amp; Menu</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola menu makanan, minuman, harga jual, dan HPP (Harga Pokok Penjualan).
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Product Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Harga Jual</th>
                  <th className="py-3 px-4">HPP (Modal)</th>
                  <th className="py-3 px-4">Margin Laba</th>
                  <th className="py-3 px-4">Status Stok</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((prod) => {
                  const profit = prod.price - (prod.cost_price || 0);
                  const margin = prod.price > 0 ? ((profit / prod.price) * 100).toFixed(0) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-600">
                                <Coffee className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{prod.name}</span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {prod.description || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {prod.category_name || '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">
                        Rp {prod.price.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        Rp {(prod.cost_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        Rp {profit.toLocaleString('id-ID')} ({margin}%)
                      </td>
                      <td className="py-3 px-4">
                        {prod.is_available ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Tersedia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                            <XCircle className="h-3 w-3" />
                            <span>Habis</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id, prod.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Add/Edit Product Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-800/60">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Produk <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Susu Aren K99"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kategori
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Tanpa Kategori</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Urutan Tampil
                    </label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Harga Jual (Rp) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      HPP / Modal (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={costPrice || ''}
                      onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deskripsi Singkat
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Deskripsi racikan menu..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Image upload / URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Foto Produk (URL atau Upload)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                    <label className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading ? 'Upload...' : 'Pilih File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {imageUrl && (
                    <div className="h-20 w-32 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                      <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="flex gap-6 border-t border-slate-800 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="rounded accent-amber-500 h-4 w-4"
                    />
                    <span>Tersedia untuk Dijual</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded accent-amber-500 h-4 w-4"
                    />
                    <span>Aktif di Menu</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
