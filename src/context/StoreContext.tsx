import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StoreSetting, Category, Product, Order, SelectedAddon } from '../types/database';
import { storeService } from '../services/storeService';
import { categoryService } from '../services/categoryService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { INITIAL_STORE_SETTING } from '../services/mockData';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  temperature?: 'ice' | 'hot' | 'normal';
  addons?: SelectedAddon[];
  notes?: string;
}

interface StoreContextType {
  storeSettings: StoreSetting;
  categories: Category[];
  products: Product[];
  isLoading: boolean;
  onlineCart: CartItem[];
  addToOnlineCart: (product: Product, quantity?: number, notes?: string, temperature?: 'ice' | 'hot' | 'normal', addons?: SelectedAddon[]) => void;
  updateOnlineCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromOnlineCart: (cartItemId: string) => void;
  clearOnlineCart: () => void;
  toggleStoreStatus: (isOpen: boolean, updatedBy?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  latestIncomingOrder: Order | null;
  clearLatestIncomingOrder: () => void;
}

const StoreContext = createContext<StoreContextType>({
  storeSettings: INITIAL_STORE_SETTING,
  categories: [],
  products: [],
  isLoading: true,
  onlineCart: [],
  addToOnlineCart: () => {},
  updateOnlineCartQuantity: () => {},
  removeFromOnlineCart: () => {},
  clearOnlineCart: () => {},
  toggleStoreStatus: async () => {},
  refreshData: async () => {},
  latestIncomingOrder: null,
  clearLatestIncomingOrder: () => {},
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeSettings, setStoreSettings] = useState<StoreSetting>(INITIAL_STORE_SETTING);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestIncomingOrder, setLatestIncomingOrder] = useState<Order | null>(null);

  // Online customer cart (persisted in localStorage as temporary cart)
  const [onlineCart, setOnlineCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('k99_online_cart');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('k99_online_cart', JSON.stringify(onlineCart));
    } catch (e) {}
  }, [onlineCart]);

  const refreshData = useCallback(async () => {
    try {
      const [settings, cats, prods] = await Promise.all([
        storeService.getSettings(),
        categoryService.getCategories(),
        productService.getProducts(),
      ]);
      setStoreSettings(settings);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Error refreshing store data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Subscribe to Realtime store status
    const unsubStore = storeService.subscribe((updated) => {
      setStoreSettings(updated);
    });

    // Subscribe to Realtime orders for sound/alert notification
    const unsubOrders = orderService.subscribe((event) => {
      if (event.type === 'NEW_ORDER' && event.order.order_type === 'online') {
        setLatestIncomingOrder(event.order);
        // Play gentle audio beep if supported
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) {}
      }
    });

    return () => {
      unsubStore();
      unsubOrders();
    };
  }, [refreshData]);

  const toggleStoreStatus = async (isOpen: boolean, updatedBy?: string) => {
    const updated = await storeService.updateStatus(isOpen, updatedBy);
    setStoreSettings(updated);
  };

  const addToOnlineCart = (
    product: Product,
    quantity = 1,
    notes = '',
    temperature: 'ice' | 'hot' | 'normal' = 'ice',
    addons: SelectedAddon[] = []
  ) => {
    setOnlineCart((prev) => {
      // Find exact item match with same temp & addons
      const addonsKey = addons.map(a => `${a.name}:${a.price}`).sort().join('|');
      const existingIdx = prev.findIndex(item => {
        const itemAddonsKey = (item.addons || []).map(a => `${a.name}:${a.price}`).sort().join('|');
        return item.product.id === product.id && item.temperature === temperature && itemAddonsKey === addonsKey;
      });

      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        if (notes) next[existingIdx].notes = notes;
        return next;
      }

      const cartItemId = 'citem-' + Math.random().toString(36).substring(2, 9);
      return [...prev, { id: cartItemId, product, quantity, notes, temperature, addons }];
    });
  };

  const updateOnlineCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOnlineCart(cartItemId);
      return;
    }
    setOnlineCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
  };

  const removeFromOnlineCart = (cartItemId: string) => {
    setOnlineCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const clearOnlineCart = () => {
    setOnlineCart([]);
  };

  const clearLatestIncomingOrder = () => {
    setLatestIncomingOrder(null);
  };

  return (
    <StoreContext.Provider
      value={{
        storeSettings,
        categories,
        products,
        isLoading,
        onlineCart,
        addToOnlineCart,
        updateOnlineCartQuantity,
        removeFromOnlineCart,
        clearOnlineCart,
        toggleStoreStatus,
        refreshData,
        latestIncomingOrder,
        clearLatestIncomingOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
