import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { useStore } from '../../context/StoreContext';
import { inventoryService } from '../../services/inventoryService';
import { Ingredient, Recipe, StockMovement, MovementType } from '../../types/database';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ArrowDownUp,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  History,
  X,
} from 'lucide-react';

export const InventoryAdmin: React.FC = () => {
  const { products } = useStore();
  const [tab, setTab] = useState<'ingredients' | 'recipes' | 'movements'>('ingredients');

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Ingredient Modal
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingUnit, setIngUnit] = useState('gram');
  const [ingStock, setIngStock] = useState<number>(0);
  const [ingMinStock, setIngMinStock] = useState<number>(0);
  const [ingCost, setIngCost] = useState<number>(0);

  // Stock Adjustment Modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('purchase');
  const [movementQty, setMovementQty] = useState<number>(0);
  const [movementNotes, setMovementNotes] = useState('');

  // Recipe Modal
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeItems, setRecipeItems] = useState<Array<{ ingredient_id: string; quantity: number; unit: string }>>([]);

  const loadData = async () => {
    try {
      const [ings, recs, movs] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getRecipes(),
        inventoryService.getStockMovements(),
      ]);
      setIngredients(ings);
      setRecipes(recs);
      setMovements(movs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddIngredient = () => {
    setEditingIng(null);
    setIngName('');
    setIngUnit('gram');
    setIngStock(1000);
    setIngMinStock(200);
    setIngCost(150);
    setIsIngModalOpen(true);
  };

  const openEditIngredient = (ing: Ingredient) => {
    setEditingIng(ing);
    setIngName(ing.name);
    setIngUnit(ing.unit);
    setIngStock(ing.current_stock);
    setIngMinStock(ing.minimum_stock);
    setIngCost(ing.cost_per_unit);
    setIsIngModalOpen(true);
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;

    if (editingIng) {
      await inventoryService.updateIngredient(editingIng.id, {
        name: ingName.trim(),
        unit: ingUnit,
        current_stock: Number(ingStock),
        minimum_stock: Number(ingMinStock),
        cost_per_unit: Number(ingCost),
      });
    } else {
      await inventoryService.createIngredient({
        name: ingName.trim(),
        unit: ingUnit,
        current_stock: Number(ingStock),
        minimum_stock: Number(ingMinStock),
        cost_per_unit: Number(ingCost),
        is_active: true,
      });
    }

    setIsIngModalOpen(false);
    await loadData();
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngId || movementQty <= 0) return;

    await inventoryService.recordStockMovement({
      ingredient_id: selectedIngId,
      movement_type: movementType,
      quantity: Number(movementQty),
      notes: movementNotes.trim() || undefined,
    });

    setIsMovementModalOpen(false);
    await loadData();
  };

  const openEditRecipe = (prodId: string) => {
    setSelectedProductId(prodId);
    const existingRecipe = recipes.find(r => r.product_id === prodId);
    if (existingRecipe && existingRecipe.items) {
      setRecipeItems(existingRecipe.items.map(it => ({
        ingredient_id: it.ingredient_id,
        quantity: it.quantity,
        unit: it.unit,
      })));
    } else {
      setRecipeItems([]);
    }
    setIsRecipeModalOpen(true);
  };

  const handleSaveRecipe = async () => {
    if (!selectedProductId) return;
    await inventoryService.saveRecipe(selectedProductId, recipeItems);
    setIsRecipeModalOpen(false);
    await loadData();
  };

  return (
    <AdminLayout currentTab="inventory">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Inventaris &amp; Manajemen Resep</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pantau stok bahan baku kopi, sirup, kemasan, dan tentukan resep untuk penghitungan HPP otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedIngId(ingredients[0]?.id || '');
                setMovementQty(100);
                setMovementNotes('');
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span>Catat Stok Masuk/Keluar</span>
            </button>
            <button
              onClick={openAddIngredient}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Bahan</span>
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setTab('ingredients')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              tab === 'ingredients'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Stok Bahan Baku ({ingredients.length})
          </button>
          <button
            onClick={() => setTab('recipes')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              tab === 'recipes'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Resep Menu ({recipes.length})
          </button>
          <button
            onClick={() => setTab('movements')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              tab === 'movements'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Riwayat Pergerakan Stok ({movements.length})
          </button>
        </div>

        {/* Tab 1: Ingredients */}
        {tab === 'ingredients' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Nama Bahan</th>
                    <th className="py-3 px-4">Satuan</th>
                    <th className="py-3 px-4">Stok Saat Ini</th>
                    <th className="py-3 px-4">Batas Minimum</th>
                    <th className="py-3 px-4">Biaya / Satuan</th>
                    <th className="py-3 px-4">Estimasi Nilai Stok</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {ingredients.map((ing) => {
                    const isLow = ing.current_stock <= ing.minimum_stock;
                    const totalVal = ing.current_stock * ing.cost_per_unit;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">
                          {ing.name}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {ing.unit}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className={`font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {ing.current_stock.toLocaleString('id-ID')} {ing.unit}
                          </span>
                          {isLow && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="h-3 w-3" />
                              Menipis!
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {ing.minimum_stock.toLocaleString('id-ID')} {ing.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          Rp {ing.cost_per_unit.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-400 font-mono">
                          Rp {totalVal.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEditIngredient(ing)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Recipes */}
        {tab === 'recipes' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Resep digunakan untuk menghitung HPP (Harga Pokok Penjualan) secara akurat saat transaksi terjadi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => {
                const recipe = recipes.find(r => r.product_id === prod.id);

                return (
                  <div
                    key={prod.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-sm">{prod.name}</h4>
                          <span className="text-[11px] text-amber-400 font-bold">
                            Harga: Rp {prod.price.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          HPP: Rp {(prod.cost_price || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Recipe Items Preview */}
                      <div className="mt-3 space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                        {recipe && recipe.items && recipe.items.length > 0 ? (
                          recipe.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-slate-300">
                              <span>• {it.ingredient_name || 'Bahan'}</span>
                              <span className="font-mono text-slate-400">{it.quantity} {it.unit}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">
                            Belum ada resep bahan baku
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openEditRecipe(prod.id)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{recipe ? 'Edit Resep' : '+ Buat Resep'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Stock Movements */}
        {tab === 'movements' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Bahan</th>
                    <th className="py-3 px-4">Jenis Pergerakan</th>
                    <th className="py-3 px-4">Jumlah</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {movements.map((mov) => {
                    const isPositive = mov.movement_type === 'purchase' || mov.movement_type === 'return';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(mov.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {mov.ingredient_name || 'Bahan Baku'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`uppercase font-bold px-2 py-0.5 rounded text-[10px] ${
                            mov.movement_type === 'purchase'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : mov.movement_type === 'sale'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {mov.movement_type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? '+' : '-'}{mov.quantity}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {mov.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Ingredient */}
        {isIngModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">
                  {editingIng ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
                </h3>
                <button onClick={() => setIsIngModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveIngredient} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Bahan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Susu UHT Fresh"
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Satuan</label>
                    <select
                      value={ingUnit}
                      onChange={(e) => setIngUnit(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="gram">gram</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                      <option value="box">box</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Biaya / Satuan (Rp)</label>
                    <input
                      type="number"
                      value={ingCost}
                      onChange={(e) => setIngCost(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Stok Awal</label>
                    <input
                      type="number"
                      value={ingStock}
                      onChange={(e) => setIngStock(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Stok Minimum</label>
                    <input
                      type="number"
                      value={ingMinStock}
                      onChange={(e) => setIngMinStock(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Simpan Bahan Baku
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Stock Movement */}
        {isMovementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">Catat Pergerakan Stok</h3>
                <button onClick={() => setIsMovementModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMovement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Bahan</label>
                  <select
                    value={selectedIngId}
                    onChange={(e) => setSelectedIngId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Stok: {i.current_stock} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipe Mutasi</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="purchase">Pembelian / Kulakan Masuk</option>
                    <option value="adjustment">Penyesuaian Fisik (Opname)</option>
                    <option value="waste">Rusak / Basi / Tumpah (Waste)</option>
                    <option value="return">Retur ke Supplier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={movementQty || ''}
                    onChange={(e) => setMovementQty(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Keterangan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Beli di pasar..."
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Simpan Mutasi Stok
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Recipe */}
        {isRecipeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">Atur Komposisi Resep Produk</h3>
                <button onClick={() => setIsRecipeModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                <p className="text-xs text-slate-400">
                  Tambahkan bahan-bahan yang digunakan untuk membuat 1 porsi menu ini:
                </p>

                {recipeItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <select
                      value={item.ingredient_id}
                      onChange={(e) => {
                        const next = [...recipeItems];
                        next[idx].ingredient_id = e.target.value;
                        const ing = ingredients.find(i => i.id === e.target.value);
                        if (ing) next[idx].unit = ing.unit;
                        setRecipeItems(next);
                      }}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...recipeItems];
                        next[idx].quantity = Number(e.target.value) || 0;
                        setRecipeItems(next);
                      }}
                      className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none text-center"
                    />

                    <span className="text-xs text-slate-400 w-10">{item.unit}</span>

                    <button
                      onClick={() => setRecipeItems(recipeItems.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const first = ingredients[0];
                    if (first) {
                      setRecipeItems([...recipeItems, { ingredient_id: first.id, quantity: 10, unit: first.unit }]);
                    }
                  }}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-xs font-semibold text-amber-400 hover:bg-slate-800"
                >
                  + Tambah Komponen Bahan
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={handleSaveRecipe}
                  className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Simpan Resep
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
