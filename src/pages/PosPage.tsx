import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { Product, Order, PaymentMethod, OrderStatus, PosChannel, SelectedAddon, ProductAddon } from '../types/database';
import { orderService } from '../services/orderService';
import { DEFAULT_ADDONS } from '../services/mockData';
import { StoreStatusBadge } from '../components/StoreStatusBadge';
import { IncomingOrderModal } from '../components/IncomingOrderModal';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  Coffee,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  QrCode,
  CreditCard,
  CheckCircle2,
  Bell,
  Clock,
  Printer,
  ShoppingBag,
  Power,
  RotateCw,
  LayoutDashboard,
  User,
  ArrowRight,
  X,
  Flame,
  Snowflake,
  Smartphone,
  Store,
} from 'lucide-react';

interface PosCartItem {
  id: string;
  product: Product;
  quantity: number;
  temperature?: 'ice' | 'hot' | 'normal';
  addons?: SelectedAddon[];
  notes?: string;
}

export const PosPage: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const {
    storeSettings,
    categories,
    products,
    toggleStoreStatus,
    refreshData,
    latestIncomingOrder,
    clearLatestIncomingOrder,
  } = useStore();

  // Authentication check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // POS State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Dine-in');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Requirement 2: Order Channel (Offline / ShopeeFood / GrabFood / GoFood)
  const [orderChannel, setOrderChannel] = useState<PosChannel>('offline');
  const [onlineOrderRef, setOnlineOrderRef] = useState<string>('');
  const [netRevenueInput, setNetRevenueInput] = useState<number | ''>('');

  // Item customization modal (Ice/Hot + Addons)
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [modalTemp, setModalTemp] = useState<'ice' | 'hot' | 'normal'>('ice');
  const [modalAddons, setModalAddons] = useState<SelectedAddon[]>([]);
  const [manualAddonName, setManualAddonName] = useState<string>('');
  const [manualAddonPrice, setManualAddonPrice] = useState<number>(0);
  const [modalItemNotes, setModalItemNotes] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);

  // Incoming online orders panel & modal
  const [onlineOrders, setOnlineOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'orders'>('pos');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [orderToDeleteInPos, setOrderToDeleteInPos] = useState<Order | null>(null);
  const [isDeletingInPos, setIsDeletingInPos] = useState(false);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  const availableAddonsList: ProductAddon[] = useMemo(() => {
    return storeSettings.available_addons && storeSettings.available_addons.length > 0
      ? storeSettings.available_addons
      : DEFAULT_ADDONS;
  }, [storeSettings.available_addons]);

  // Load online orders for POS cashier to manage
  const loadOrders = async () => {
    try {
      const orders = await orderService.getOrders();
      setOnlineOrders(orders);
    } catch (err) {
      console.error('Error fetching orders in POS:', err);
    }
  };

  useEffect(() => {
    loadOrders();
    const unsub = orderService.subscribe(() => {
      loadOrders();
    });
    return () => unsub();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (!prod.is_active) return false;
      const matchesCat = selectedCategory === 'all' || prod.category_id === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart totals
  const calculateCartItemUnitPrice = (item: PosCartItem) => {
    const addonsSum = (item.addons || []).reduce((s, a) => s + Number(a.price), 0);
    return item.product.price + addonsSum;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + calculateCartItemUnitPrice(item) * item.quantity,
    0
  );
  const total = Math.max(0, subtotal - discountAmount);

  // Auto-fill default net revenue when channel is online (e.g. 80% default payout estimate)
  useEffect(() => {
    if (orderChannel !== 'offline') {
      if (netRevenueInput === '' || netRevenueInput === 0) {
        setNetRevenueInput(Math.round(total * 0.8));
      }
    } else {
      setNetRevenueInput('');
    }
  }, [orderChannel, total]);

  // Cart operations
  const openProductCustomization = (product: Product) => {
    if (!product.is_available) return;
    setCustomizingProduct(product);
    setModalTemp('ice');
    setModalAddons([]);
    setManualAddonName('');
    setManualAddonPrice(0);
    setModalItemNotes('');
    setModalQty(1);
  };

  const handleToggleAddon = (addon: ProductAddon) => {
    const exists = modalAddons.some(a => a.name === addon.name);
    if (exists) {
      setModalAddons(modalAddons.filter(a => a.name !== addon.name));
    } else {
      setModalAddons([...modalAddons, { name: addon.name, price: addon.price }]);
    }
  };

  const handleAddManualAddon = () => {
    if (!manualAddonName.trim()) return;
    setModalAddons([
      ...modalAddons,
      { name: manualAddonName.trim(), price: Math.max(0, Number(manualAddonPrice) || 0) },
    ]);
    setManualAddonName('');
    setManualAddonPrice(0);
  };

  const handleConfirmAddToCart = () => {
    if (!customizingProduct) return;
    const cartItemId = 'pos-item-' + Math.random().toString(36).substring(2, 9);
    const newItem: PosCartItem = {
      id: cartItemId,
      product: customizingProduct,
      quantity: modalQty,
      temperature: modalTemp,
      addons: modalAddons,
      notes: modalItemNotes || undefined,
    };
    setCart(prev => [...prev, newItem]);
    setCustomizingProduct(null);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== cartItemId));
      return;
    }
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
  };

  const updateNotes = (cartItemId: string, notes: string) => {
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, notes } : item));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('Dine-in');
    setDiscountAmount(0);
    setCashTendered(0);
    setOrderChannel('offline');
    setOnlineOrderRef('');
    setNetRevenueInput('');
  };

  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setCashTendered(total);
    // If online channel, set default payment method to 'other' or 'transfer'
    if (orderChannel !== 'offline') {
      setPaymentMethod('other');
    } else {
      setPaymentMethod('cash');
    }
    setIsPaymentModalOpen(true);
  };

  const handleCompleteTransaction = async () => {
    if (cart.length === 0) return;
    setIsProcessingPayment(true);

    try {
      const effectiveNetRevenue =
        orderChannel !== 'offline' && netRevenueInput !== ''
          ? Number(netRevenueInput)
          : total;

      const order = await orderService.createOrder(
        {
          order_type: 'pos',
          channel: orderChannel,
          online_order_reference: orderChannel !== 'offline' ? onlineOrderRef.trim() || undefined : undefined,
          net_revenue: effectiveNetRevenue,
          customer_name: customerName.trim() || (orderChannel !== 'offline' ? `Order ${orderChannel}` : 'Pelanggan POS'),
          payment_method: paymentMethod,
          discount: discountAmount,
          items: cart.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: calculateCartItemUnitPrice(item),
            temperature: item.temperature,
            addons: item.addons,
            notes: item.notes,
          })),
        },
        user?.id
      );

      setIsPaymentModalOpen(false);
      clearCart();
      setSelectedOrderForReceipt(order);
      await loadOrders();
    } catch (err: any) {
      alert('Gagal menyelesaikan transaksi: ' + (err.message || 'Error'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await orderService.updateOrderStatus(orderId, nextStatus);
      await loadOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const handleConfirmDeleteInPos = async () => {
    if (!orderToDeleteInPos) return;
    setIsDeletingInPos(true);
    try {
      await orderService.deleteOrder(orderToDeleteInPos.id);
      setOrderToDeleteInPos(null);
      await loadOrders();
    } catch (err) {
      console.error('Error deleting order in POS:', err);
    } finally {
      setIsDeletingInPos(false);
    }
  };

  const pendingOnlineOrdersCount = onlineOrders.filter(
    o => o.order_type === 'online' && (o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing')
  ).length;

  if (!user) return null;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top POS Control Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        {/* Left: Brand & Staff Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-amber-400">K99 POS</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 uppercase">
                {user.profile.role}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block -mt-0.5">
              Kasir: {user.profile.full_name}
            </span>
          </div>
        </div>

        {/* Center: Realtime Store Open/Close Toggle Button */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <StoreStatusBadge isOpen={storeSettings.is_open} size="sm" />

          {storeSettings.is_open ? (
            <button
              onClick={() => toggleStoreStatus(false, user.id)}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500 hover:text-white transition"
              title="Klik untuk menutup kedai"
            >
              <Power className="h-3.5 w-3.5" />
              <span>TUTUP TOKO</span>
            </button>
          ) : (
            <button
              onClick={() => toggleStoreStatus(true, user.id)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 transition"
              title="Klik untuk membuka kedai"
            >
              <Power className="h-3.5 w-3.5" />
              <span>BUKA TOKO</span>
            </button>
          )}
        </div>

        {/* Right: Tabs & Navigation */}
        <div className="flex items-center gap-2">
          {/* Tab Selector: POS Kasir vs Antrian Pesanan Online */}
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === 'pos'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>Kasir POS</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Order Online</span>
              {pendingOnlineOrdersCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {pendingOnlineOrdersCount}
                </span>
              )}
            </button>
          </div>

          {(user.profile.role === 'owner' || user.profile.role === 'admin') && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="rounded-xl border border-slate-700 p-1.5 text-slate-400 hover:text-white transition"
            title="Lihat Landing Page"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'pos' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left / Middle: Catalog View */}
          <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-800 bg-slate-950">
            {/* Filter & Search Bar */}
            <div className="p-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900/60">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari produk kasir..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={refreshData}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Refresh Menu"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-slate-800/80 bg-slate-900/40 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Semua
              </button>
              {categories.filter(c => c.is_active).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {filteredProducts.map((prod) => {
                  const isAvailable = prod.is_available;

                  return (
                    <button
                      key={prod.id}
                      disabled={!isAvailable}
                      onClick={() => openProductCustomization(prod)}
                      className={`relative flex flex-col rounded-xl border text-left p-2.5 transition-all ${
                        isAvailable
                          ? 'border-slate-800 bg-slate-900 hover:border-amber-500/50 hover:bg-slate-850 active:scale-[0.98]'
                          : 'border-slate-800/40 bg-slate-900/40 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="aspect-video w-full rounded-lg bg-slate-800 overflow-hidden mb-2">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-700">
                            <Coffee className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      <span className="font-bold text-xs text-white line-clamp-1">
                        {prod.name}
                      </span>
                      <span className="text-xs font-black text-amber-400 mt-1">
                        Rp {prod.price.toLocaleString('id-ID')}
                      </span>

                      {!isAvailable && (
                        <span className="mt-1 text-[10px] font-bold text-rose-400">
                          HABIS
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Active POS Cart & Bill */}
          <div className="w-80 md:w-96 flex flex-col bg-slate-900 border-l border-slate-800">
            {/* Cart Header with Channel Selector */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Pesanan Kasir
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Batal Semua
                  </button>
                )}
              </div>

              {/* Requirement 2: Opsi Order Offline / Online (Shopee Food, Grab Food, Go Food) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Channel Penjualan:
                </label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setOrderChannel('offline')}
                    className={`py-1 px-1 rounded-lg text-[10px] font-extrabold uppercase transition ${
                      orderChannel === 'offline'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Offline
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderChannel('shopeefood')}
                    className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition ${
                      orderChannel === 'shopeefood'
                        ? 'bg-orange-500 text-white shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Shopee
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderChannel('grabfood')}
                    className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition ${
                      orderChannel === 'grabfood'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Grab
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderChannel('gofood')}
                    className={`py-1 px-1 rounded-lg text-[10px] font-extrabold transition ${
                      orderChannel === 'gofood'
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    GoFood
                  </button>
                </div>
              </div>

              {/* Additional Inputs when Online Channel selected */}
              {orderChannel !== 'offline' ? (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                      Nomor Orderan {orderChannel.toUpperCase()} *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: GF-10294 atau ORD-8812"
                      value={onlineOrderRef}
                      onChange={(e) => setOnlineOrderRef(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-emerald-400 mb-0.5">
                      Harga Bersih Kedai (Net Revenue / Payout) *
                    </label>
                    <input
                      type="number"
                      placeholder="Angka bersih setelah komisi"
                      value={netRevenueInput}
                      onChange={(e) => setNetRevenueInput(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-emerald-500/40 bg-slate-800 px-2.5 py-1 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      *Angka ini yang terhubung ke laporan laba &amp; profit omzet bersih kedai.
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Nama Pelanggan / No. Meja"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center p-4">
                  <ShoppingBag className="h-10 w-10 mb-2 text-slate-700" />
                  <p className="text-xs font-semibold">Keranjang Masih Kosong</p>
                  <p className="text-[11px] text-slate-500 mt-1">Pilih menu dari katalog di sebelah kiri.</p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemUnitPrice = calculateCartItemUnitPrice(item);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <span className="font-bold text-white block">
                            {item.product.name}
                          </span>
                          <span className={`inline-block text-[10px] font-extrabold uppercase rounded px-1 py-0.2 mt-0.5 ${
                            item.temperature === 'ice'
                              ? 'bg-sky-500/20 text-sky-300'
                              : item.temperature === 'hot'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {item.temperature === 'ice' ? '🧊 Ice' : item.temperature === 'hot' ? '♨️ Hot' : 'Normal'}
                          </span>
                        </div>
                        <span className="font-extrabold text-amber-400 shrink-0">
                          Rp {(itemUnitPrice * item.quantity).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[10px] text-amber-400 font-medium">
                          + {item.addons.map(a => `${a.name} (+Rp ${a.price.toLocaleString('id-ID')})`).join(', ')}
                        </p>
                      )}

                      {/* Quantity controls & delete */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-bold text-white text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={item.notes || ''}
                          onChange={(e) => updateNotes(item.id, e.target.value)}
                          className="w-32 rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-amber-500"
                        />

                        <button
                          onClick={() => updateQuantity(item.id, 0)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Billing Breakdown & Payment trigger */}
            <div className="border-t border-slate-800 bg-slate-950 p-3 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal Menu:</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Diskon (Rp):</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-24 text-right rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-slate-800">
                <span>TOTAL:</span>
                <span className="text-emerald-400">Rp {total.toLocaleString('id-ID')}</span>
              </div>

              {orderChannel !== 'offline' && netRevenueInput !== '' && (
                <div className="flex justify-between text-xs font-bold text-amber-400 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                  <span>Harga Bersih Diterima:</span>
                  <span>Rp {Number(netRevenueInput).toLocaleString('id-ID')}</span>
                </div>
              )}

              <button
                disabled={cart.length === 0}
                onClick={openPaymentModal}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <DollarSign className="h-4 w-4" />
                <span>BAYAR SEKARANG • Rp {total.toLocaleString('id-ID')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tab: Online Orders Pipeline */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Antrean Pesanan Masuk (Online &amp; POS)</h2>
                <p className="text-xs text-slate-400">
                  Pesanan dari customer di halaman online (/store) akan muncul secara realtime di sini.
                </p>
              </div>
              <button
                onClick={loadOrders}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Refresh Antrean</span>
              </button>
            </div>

            {onlineOrders.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 text-slate-500">
                <Bell className="h-10 w-10 mx-auto mb-2 text-slate-700" />
                <p className="font-semibold text-sm">Belum ada transaksi</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {onlineOrders.map((ord) => {
                  const isOnline = ord.order_type === 'online';

                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-amber-400 font-mono text-sm">
                              {ord.order_number}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isOnline ? 'bg-sky-500/20 text-sky-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {ord.channel || ord.order_type}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-white block mt-0.5">
                            {ord.customer_name} {ord.customer_phone ? `(${ord.customer_phone})` : ''}
                          </span>
                          {ord.online_order_reference && (
                            <span className="text-[10px] text-amber-400 font-mono block">
                              Ref: {ord.online_order_reference}
                            </span>
                          )}
                          {ord.delivery_type && (
                            <span className="text-[10px] text-sky-400 font-semibold block">
                              {ord.delivery_type === 'spx_instant' ? '🚚 SPX Instant' : '🏪 Ambil di Kedai'}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          ord.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : ord.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                            : ord.status === 'preparing'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ord.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 text-xs text-slate-300">
                        {ord.items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <div>
                              <span>{it.quantity}× {it.product_name}</span>
                              {it.temperature && (
                                <span className="ml-1 text-[10px] text-slate-400 uppercase">
                                  [{it.temperature}]
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-slate-400">
                              Rp {(it.subtotal || it.unit_price * it.quantity).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {ord.delivery_address && (
                        <p className="text-[11px] text-sky-300 bg-sky-500/10 p-2 rounded-lg">
                          Alamat Kirim: {ord.delivery_address}
                        </p>
                      )}

                      {ord.notes && (
                        <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg italic">
                          Catatan: {ord.notes}
                        </p>
                      )}

                      {/* Total & Pipeline Actions */}
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 uppercase">{ord.payment_method}</span>
                          <span className="font-black text-emerald-400 text-sm">
                            Rp {ord.total.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedOrderForReceipt(ord)}
                            className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                            title="Cetak Struk"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          {(user.profile.role === 'owner' || user.profile.role === 'admin') && (
                            <button
                              onClick={() => setOrderToDeleteInPos(ord)}
                              className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                              title="Hapus Transaksi (Owner & Admin)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {ord.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'confirmed')}
                              className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                            >
                              TERIMA PESANAN
                            </button>
                          )}

                          {ord.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'preparing')}
                              className="flex-1 rounded-xl bg-blue-500 py-2 text-xs font-bold text-white hover:bg-blue-400"
                            >
                              PROSES / BIKIN
                            </button>
                          )}

                          {ord.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'ready')}
                              className="flex-1 rounded-xl bg-purple-500 py-2 text-xs font-bold text-white hover:bg-purple-400"
                            >
                              SIAP DISAJIKAN
                            </button>
                          )}

                          {ord.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'completed')}
                              className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                            >
                              SELESAI (SUDAH DIAMBIL)
                            </button>
                          )}

                          {ord.status === 'completed' && (
                            <span className="flex-1 text-center py-2 text-xs font-semibold text-emerald-400">
                              ✓ Transaksi Selesai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* POS Item Customization Modal (Ice/Hot + Addons) */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-800/60">
              <div>
                <h3 className="font-extrabold text-sm text-white">{customizingProduct.name}</h3>
                <span className="text-xs text-amber-400 font-bold">
                  Rp {customizingProduct.price.toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Opsi Suhu */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Varian Suhu (Ice / Hot / Normal)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTemp('ice')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      modalTemp === 'ice'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <Snowflake className="h-3.5 w-3.5" />
                    <span>Ice (Dingin)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTemp('hot')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      modalTemp === 'hot'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Hot (Panas)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTemp('normal')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      modalTemp === 'normal'
                        ? 'border-slate-400 bg-slate-700/60 text-white'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <span>Normal</span>
                  </button>
                </div>
              </div>

              {/* Add-ons List */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pilih Add-on
                </label>
                <div className="space-y-1.5">
                  {availableAddonsList.map((addon) => {
                    const isSelected = modalAddons.some(a => a.name === addon.name);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => handleToggleAddon(addon)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                          isSelected
                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                            : 'border-slate-800 bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <span>{addon.name}</span>
                        <span className="font-bold text-amber-400">
                          +Rp {addon.price.toLocaleString('id-ID')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Input Manual Add-on di POS */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Tambah Add-on / Tambahan Manual:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Add-on"
                      value={manualAddonName}
                      onChange={(e) => setManualAddonName(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="+Harga"
                      value={manualAddonPrice || ''}
                      onChange={(e) => setManualAddonPrice(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualAddon}
                      className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950"
                    >
                      + Add
                    </button>
                  </div>

                  {modalAddons.filter(a => !availableAddonsList.some(d => d.name === a.name)).length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {modalAddons
                        .filter(a => !availableAddonsList.some(d => d.name === a.name))
                        .map((ca, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-semibold"
                          >
                            {ca.name} (+Rp {ca.price})
                            <button
                              type="button"
                              onClick={() => setModalAddons(modalAddons.filter(a => a.name !== ca.name))}
                              className="text-slate-400 hover:text-rose-400"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between border-y border-slate-800 py-2.5">
                <span className="text-xs font-semibold text-slate-300">Jumlah</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-white text-sm w-6 text-center">{modalQty}</span>
                  <button
                    onClick={() => setModalQty(q => q + 1)}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Catatan Item */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Item (Less sugar / ice dll)
                </label>
                <input
                  type="text"
                  placeholder="Catatan untuk barista..."
                  value={modalItemNotes}
                  onChange={(e) => setModalItemNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                onClick={handleConfirmAddToCart}
                className="w-full rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                Masukkan ke Pesanan Kasir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-800/60">
              <div>
                <h3 className="font-extrabold text-base text-white">Pembayaran Kasir</h3>
                <span className="text-[11px] text-amber-400 uppercase font-bold">
                  Channel: {orderChannel}
                </span>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Total Display */}
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-widest block">Total Tagihan</span>
                <span className="text-3xl font-black text-emerald-400 block mt-1">
                  Rp {total.toLocaleString('id-ID')}
                </span>
                {orderChannel !== 'offline' && netRevenueInput !== '' && (
                  <span className="text-xs text-amber-400 font-bold mt-1 block">
                    Harga Bersih Kedai (Net Payout): Rp {Number(netRevenueInput).toLocaleString('id-ID')}
                  </span>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      paymentMethod === 'cash'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      paymentMethod === 'qris'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    QRIS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      paymentMethod === 'transfer'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('other')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                      paymentMethod === 'other'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Aplikasi / Lainnya
                  </button>
                </div>
              </div>

              {/* Cash Denominations and Change calculation */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nominal Uang Diterima
                    </label>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Fast denomination buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashTendered(total)}
                      className="py-1.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTendered(20000)}
                      className="py-1.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      20.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTendered(50000)}
                      className="py-1.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTendered(100000)}
                      className="py-1.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      100.000
                    </button>
                  </div>

                  {/* Change calculation */}
                  <div className="flex justify-between items-center rounded-xl bg-slate-950 p-3 border border-slate-800">
                    <span className="text-xs text-slate-400">Kembalian:</span>
                    <span className={`text-base font-black ${
                      cashTendered >= total ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      Rp {Math.max(0, cashTendered - total).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'qris' && (
                <div className="text-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-28 h-28 mx-auto bg-white p-1 rounded-lg">
                    <img
                      src={
                        storeSettings.qris_image_url ||
                        'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=K99-QRIS-DYNAMIC'
                      }
                      alt="QRIS"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Pastikan pelanggan sudah scan dan berhasil transfer QRIS.</p>
                </div>
              )}

              {/* Complete button */}
              <button
                disabled={isProcessingPayment || (paymentMethod === 'cash' && cashTendered < total)}
                onClick={handleCompleteTransaction}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {isProcessingPayment ? (
                  <span>Menyimpan Transaksi...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>SELESAIKAN TRANSAKSI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Alert Modal when a new online order arrives */}
      <IncomingOrderModal
        order={latestIncomingOrder}
        onClose={clearLatestIncomingOrder}
        onAccepted={(accepted) => {
          clearLatestIncomingOrder();
          loadOrders();
        }}
      />

      {/* Delete Order Confirmation Modal (Owner/Admin) */}
      {orderToDeleteInPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Hapus Transaksi?</h3>
                <p className="text-[11px] text-slate-400">Khusus Owner &amp; Admin</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">No. Order:</span>
                <span className="font-mono font-bold text-amber-400">{orderToDeleteInPos.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pelanggan:</span>
                <span className="font-semibold text-white">{orderToDeleteInPos.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="font-mono font-bold text-emerald-400">Rp {orderToDeleteInPos.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-300 leading-relaxed">
              ℹ️ Stok bahan baku yang terkait dengan pesanan ini akan <strong>otomatis dikembalikan</strong> ke stok inventaris.
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOrderToDeleteInPos(null)}
                disabled={isDeletingInPos}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInPos}
                disabled={isDeletingInPos}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20"
              >
                {isDeletingInPos ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Struk / Receipt Modal */}
      <ReceiptModal
        order={selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
      />
    </div>
  );
};
