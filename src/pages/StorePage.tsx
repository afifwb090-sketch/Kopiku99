import React, { useState, useMemo } from 'react';
import { useStore, CartItem } from '../context/StoreContext';
import { useRouter } from '../context/RouterContext';
import { StoreStatusBadge } from '../components/StoreStatusBadge';
import { Product, PaymentMethod, DeliveryType, SelectedAddon, ProductAddon } from '../types/database';
import { orderService } from '../services/orderService';
import { DEFAULT_ADDONS } from '../services/mockData';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  QrCode,
  Coffee,
  AlertCircle,
  Truck,
  MapPin,
  Flame,
  Snowflake,
  Send,
  MessageCircle,
  Share2,
} from 'lucide-react';

interface Props {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

export const StorePage: React.FC<Props> = ({ isCartOpen, setIsCartOpen }) => {
  const { navigate } = useRouter();
  const {
    storeSettings,
    categories,
    products,
    onlineCart,
    addToOnlineCart,
    updateOnlineCartQuantity,
    removeFromOnlineCart,
    clearOnlineCart,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Product detail / add modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalTemperature, setModalTemperature] = useState<'ice' | 'hot' | 'normal'>('ice');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [modalNotes, setModalNotes] = useState<string>('');

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    total: number;
    whatsappUrl: string;
  } | null>(null);

  const availableAddonsList: ProductAddon[] = useMemo(() => {
    return storeSettings.available_addons && storeSettings.available_addons.length > 0
      ? storeSettings.available_addons
      : DEFAULT_ADDONS;
  }, [storeSettings.available_addons]);

  // Filter products
  const activeCategories = useMemo(() => {
    return categories.filter(c => c.is_active);
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (!prod.is_active) return false;
      const matchesCat = selectedCategory === 'all' || prod.category_id === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart totals: item base price + addons
  const calculateItemUnitPrice = (item: CartItem) => {
    const addonsTotal = (item.addons || []).reduce((sum, a) => sum + Number(a.price), 0);
    return item.product.price + addonsTotal;
  };

  const cartSubtotal = onlineCart.reduce(
    (sum, item) => sum + calculateItemUnitPrice(item) * item.quantity,
    0
  );
  const totalItemCount = onlineCart.reduce((sum, item) => sum + item.quantity, 0);

  const openAddToCart = (prod: Product) => {
    setSelectedProduct(prod);
    setModalQuantity(1);
    setModalTemperature('ice');
    setSelectedAddons([]);
    setModalNotes('');
  };

  const handleToggleAddon = (addon: ProductAddon) => {
    const exists = selectedAddons.some(a => a.name === addon.name);
    if (exists) {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, { name: addon.name, price: addon.price }]);
    }
  };

  const handleConfirmAddToCart = () => {
    if (selectedProduct) {
      addToOnlineCart(
        selectedProduct,
        modalQuantity,
        modalNotes,
        modalTemperature,
        selectedAddons
      );
      setSelectedProduct(null);
    }
  };

  // Generate WhatsApp notification link
  const createWhatsAppUrl = (orderNumber: string, total: number, items: CartItem[]) => {
    const rawPhone = storeSettings.phone || '081299001999';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }

    const itemsSummary = items
      .map(
        (it) =>
          `• ${it.product.name} [${it.temperature === 'ice' ? 'ICE' : it.temperature === 'hot' ? 'HOT' : 'NORMAL'}] x${it.quantity} = Rp ${(calculateItemUnitPrice(it) * it.quantity).toLocaleString('id-ID')}` +
          (it.addons && it.addons.length > 0 ? `\n   ↳ Add-on: ${it.addons.map(a => `${a.name} (+Rp ${a.price.toLocaleString('id-ID')})`).join(', ')}` : '') +
          (it.notes ? `\n   ↳ Catatan: ${it.notes}` : '')
      )
      .join('\n');

    const deliveryText =
      deliveryType === 'spx_instant'
        ? `🚚 Jasa Kirim: SPX Instant\n📍 Alamat Antar: ${deliveryAddress}`
        : `🏪 Pengambilan: Ambil Sendiri (Pickup di Kedai)`;

    const text =
      `*PESANAN ONLINE BARU - K99 KEDAI*\n` +
      `No. Order: *${orderNumber}*\n` +
      `Nama: *${customerName.trim()}*\n` +
      (customerPhone ? `No. WhatsApp: ${customerPhone.trim()}\n` : '') +
      `${deliveryText}\n\n` +
      `*Detail Pesanan:*\n${itemsSummary}\n\n` +
      `*Total Tagihan:* *Rp ${total.toLocaleString('id-ID')}*\n` +
      `*Metode Pembayaran:* QRIS\n` +
      (orderNotes ? `*Catatan Khusus:* ${orderNotes}\n` : '') +
      `\n_Pesanan telah tersimpan di sistem kasir POS K99. Mohon segera diproses ya kak! Terima kasih._`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Silakan masukkan nama pemesan.');
      return;
    }
    if (deliveryType === 'spx_instant' && !deliveryAddress.trim()) {
      alert('Silakan masukkan alamat pengiriman untuk kurir SPX Instant.');
      return;
    }
    if (onlineCart.length === 0) return;

    if (!storeSettings.is_open) {
      alert('Maaf, kedai sedang tutup saat ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await orderService.createOrder({
        order_type: 'online',
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        payment_method: 'qris', // Requirement 1: strictly QRIS
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'spx_instant' ? deliveryAddress.trim() : undefined,
        notes: orderNotes.trim() || undefined,
        items: onlineCart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: calculateItemUnitPrice(item),
          temperature: item.temperature,
          addons: item.addons,
          notes: item.notes || undefined,
        })),
      });

      const waUrl = createWhatsAppUrl(created.order_number, created.total, onlineCart);

      setOrderSuccess({
        orderNumber: created.order_number,
        total: created.total,
        whatsappUrl: waUrl,
      });

      // Clear cart
      clearOnlineCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

      // Requirement 7: Sambungkan ke pesan WhatsApp agar lebih mudah ternotice
      try {
        window.open(waUrl, '_blank');
      } catch (e) {}
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentModalItemPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const addonsSum = selectedAddons.reduce((s, a) => s + Number(a.price), 0);
    return (selectedProduct.price + addonsSum) * modalQuantity;
  }, [selectedProduct, selectedAddons, modalQuantity]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Banner with Realtime Store Status */}
      <div className={`w-full border-b py-3 px-4 sm:px-6 transition-colors ${
        storeSettings.is_open
          ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
          : 'bg-rose-950/50 border-rose-800/40 text-rose-300'
      }`}>
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <StoreStatusBadge isOpen={storeSettings.is_open} size="sm" />
            <span className="text-xs sm:text-sm font-medium">
              {storeSettings.is_open
                ? 'Kedai sedang beroperasi. Pesanan online Anda langsung diproses ke barista POS & ternotice via WhatsApp!'
                : 'Kedai saat ini tutup. Anda tetap dapat menjelajahi menu.'}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {storeSettings.phone && `WA Kedai: ${storeSettings.phone}`}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header title & search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Menu Online K99</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Pilih menu favorit Anda, pilih varian Ice / Hot &amp; Add-on, bayar mudah dengan QRIS.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kopi, snack, matcha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-slate-800/80 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            Semua Menu
          </button>
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
            <Coffee className="h-12 w-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">Tidak ada menu yang sesuai kriteria.</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="mt-3 text-xs text-amber-400 font-semibold hover:underline"
            >
              Reset filter pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const isAvailable = product.is_available;

              return (
                <div
                  key={product.id}
                  className={`group flex flex-col rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden transition-all duration-200 hover:border-slate-700 ${
                    !isAvailable ? 'opacity-60' : 'hover:shadow-lg hover:shadow-black/40'
                  }`}
                >
                  {/* Image container */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-700">
                        <Coffee className="h-12 w-12" />
                      </div>
                    )}

                    {!isAvailable && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                        <span className="rounded-lg bg-rose-500/90 px-3 py-1 text-xs font-black uppercase text-white shadow">
                          Habis
                        </span>
                      </div>
                    )}

                    {product.category_name && (
                      <span className="absolute top-2 left-2 rounded-lg bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
                        {product.category_name}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                    <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {product.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] sm:text-xs text-slate-400 flex-1 leading-relaxed">
                      {product.description || 'Pilihan nikmat dari K99 Kedai.'}
                    </p>

                    <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-sm sm:text-base font-extrabold text-amber-400">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>

                      {isAvailable ? (
                        <button
                          onClick={() => openAddToCart(product)}
                          className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Pilih</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-400">Stok Kosong</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {onlineCart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 animate-in slide-in-from-bottom-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between rounded-2xl bg-amber-500 px-5 py-3.5 text-slate-950 font-bold shadow-xl shadow-amber-500/30 hover:bg-amber-400 active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-amber-400">
                {totalItemCount}
              </span>
              <span className="text-sm font-extrabold">Lihat Pesanan ({totalItemCount} item)</span>
            </div>
            <span className="text-sm font-mono font-black">
              Rp {cartSubtotal.toLocaleString('id-ID')}
            </span>
          </button>
        </div>
      )}

      {/* Product Detail / Varian & Add-on Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative aspect-video w-full bg-slate-800 overflow-hidden shrink-0">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-700">
                  <Coffee className="h-12 w-12" />
                </div>
              )}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 rounded-full bg-slate-950/70 p-1.5 text-white hover:bg-slate-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {selectedProduct.description || 'Pilihan racikan nikmat dari K99.'}
                </p>
                <p className="text-base font-extrabold text-amber-400 mt-2">
                  Rp {selectedProduct.price.toLocaleString('id-ID')} / porsi
                </p>
              </div>

              {/* Requirement 4: Opsi Suhu (Ice / Hot / Normal) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Pilihan Varian Suhu Penyajian
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTemperature('ice')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      modalTemperature === 'ice'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Snowflake className="h-3.5 w-3.5" />
                    <span>Dingin (Ice)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTemperature('hot')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      modalTemperature === 'hot'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Panas (Hot)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTemperature('normal')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      modalTemperature === 'normal'
                        ? 'border-slate-400 bg-slate-700/60 text-white shadow'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>Normal</span>
                  </button>
                </div>
              </div>

              {/* Requirement 4: Add-On & Edit Manual Add-On */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Pilihan Add-on / Topping Tambahan
                </label>
                <div className="space-y-1.5">
                  {availableAddonsList.map((addon) => {
                    const isSelected = selectedAddons.some(a => a.name === addon.name);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => handleToggleAddon(addon)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                          isSelected
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                            : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="font-semibold">{addon.name}</span>
                        <span className="font-mono font-bold text-amber-400">
                          +Rp {addon.price.toLocaleString('id-ID')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Picker */}
              <div className="flex items-center justify-between border-y border-slate-800 py-3">
                <span className="text-xs font-semibold text-slate-300">Jumlah Pesanan</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-white text-base">
                    {modalQuantity}
                  </span>
                  <button
                    onClick={() => setModalQuantity(q => q + 1)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Less ice, less sugar, pisah sambal..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Confirm */}
              <button
                onClick={handleConfirmAddToCart}
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
              >
                Tambah ke Keranjang • Rp {currentModalItemPrice.toLocaleString('id-ID')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
                <h2 className="font-extrabold text-base text-white">Keranjang Pesanan ({totalItemCount})</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {onlineCart.length === 0 ? (
                <div className="py-20 text-center text-slate-500 space-y-2">
                  <ShoppingBag className="h-12 w-12 mx-auto text-slate-700" />
                  <p className="font-semibold text-sm">Keranjang Anda masih kosong</p>
                  <p className="text-xs">Silakan pilih menu minuman atau makanan K99</p>
                </div>
              ) : (
                onlineCart.map((item) => {
                  const unitPrice = calculateItemUnitPrice(item);
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3"
                    >
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-lg object-cover bg-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          <Coffee className="h-6 w-6 text-slate-600" />
                        </div>
                      )}

                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                              {item.product.name}
                            </h4>
                            <span className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-extrabold uppercase ${
                              item.temperature === 'ice'
                                ? 'bg-sky-500/20 text-sky-300'
                                : item.temperature === 'hot'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {item.temperature === 'ice' ? '🧊 Ice' : item.temperature === 'hot' ? '♨️ Hot' : 'Normal'}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromOnlineCart(item.id)}
                            className="text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {item.addons && item.addons.length > 0 && (
                          <p className="text-[10px] text-amber-400 font-medium mt-1">
                            Add-on: {item.addons.map(a => a.name).join(', ')}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5">
                            Catatan: {item.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold text-amber-400">
                            Rp {(unitPrice * item.quantity).toLocaleString('id-ID')}
                          </span>

                          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                            <button
                              onClick={() => updateOnlineCartQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-slate-300 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateOnlineCartQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-slate-300 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Checkout trigger */}
            {onlineCart.length > 0 && (
              <div className="border-t border-slate-800 p-5 bg-slate-900 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="font-bold text-white">
                    Rp {cartSubtotal.toLocaleString('id-ID')}
                  </span>
                </div>

                {!storeSettings.is_open && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Kedai sedang tutup. Pemesanan tidak dapat diproses saat ini.</span>
                  </div>
                )}

                <button
                  disabled={!storeSettings.is_open}
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="h-4 w-4" />
                  <span>Lanjut Checkout • Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-800/60">
              <h3 className="font-extrabold text-sm sm:text-base text-white">Konfirmasi Pemesanan Online</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Requirement 6: Opsi Diambil atau Jasa Kirim SPX Instant */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Metode Pengambilan Pesanan <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
                      deliveryType === 'pickup'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Coffee className="h-4 w-4" />
                    <span>Ambil di Kedai (Pick Up)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('spx_instant')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
                      deliveryType === 'spx_instant'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Truck className="h-4 w-4" />
                    <span>SPX Instant (Kirim Kurir)</span>
                  </button>
                </div>
              </div>

              {/* Alamat jika SPX Instant */}
              {deliveryType === 'spx_instant' && (
                <div className="space-y-1 rounded-xl bg-slate-950 p-3 border border-amber-500/30 animate-in fade-in">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Alamat Lengkap Pengiriman SPX Instant *</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Jl. Anggrek No. 12, RT 02/04, pagar hitam sebelah minimarket..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    *Ongkos kirim kurir SPX Instant dibayarkan langsung saat pesanan diantar.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pemesan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Anda..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor WhatsApp Pemesan <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0812xxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Requirement 1: Metode pembayaran cukup QRIS saja */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Metode Pembayaran (Hanya QRIS)
                </label>
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Scan QRIS Resmi K99</span>
                  </div>

                  {/* QRIS Image display from storeSettings or default */}
                  <div className="mx-auto w-48 h-48 bg-white p-2 rounded-2xl flex items-center justify-center shadow-md">
                    <img
                      src={
                        storeSettings.qris_image_url ||
                        'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226500016ID.CO.QRIS.WWW011893600999000000000102159360099900000005204581253033605802ID5909K99KEDAI6007JAKARTA6304ABCD'
                      }
                      alt="QRIS K99 Kedai"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Mendukung semua e-wallet &amp; mobile banking (BCA, Mandiri, BRI, GoPay, ShopeePay, OVO, Dana).
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Tambahan untuk Kasir / Barista
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Tolong pisahkan es batunya..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Order summary box */}
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Total Item:</span>
                  <span>{totalItemCount} item</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Total Tagihan:</span>
                  <span>Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <span>Mengirim Pesanan...</span>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    <span>KIRIM PESANAN KE KASIR &amp; WHATSAPP</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-black text-white">Pesanan Berhasil Masuk!</h3>
            <p className="text-xs text-slate-400">
              Pesanan Anda telah diterima oleh sistem kasir POS K99.
            </p>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 uppercase tracking-widest block">Nomor Pesanan</span>
              <span className="text-2xl font-black text-amber-400 font-mono tracking-wider block mt-1">
                {orderSuccess.orderNumber}
              </span>
              <span className="text-xs text-slate-300 font-semibold block mt-1.5">
                Total Tagihan: Rp {orderSuccess.total.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Direct WhatsApp button as requested in Requirement 7 */}
            <a
              href={orderSuccess.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Kirim Konfirmasi ke WhatsApp Kedai</span>
            </a>

            <button
              onClick={() => {
                setOrderSuccess(null);
                navigate('/store');
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Selesai &amp; Kembali ke Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
