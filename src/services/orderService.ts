import { supabase } from './supabase';
import { Order, OrderItem, OrderStatus, PaymentMethod, OrderType, PosChannel, DeliveryType, SelectedAddon } from '../types/database';
import { INITIAL_ORDERS } from './mockData';
import { inventoryService } from './inventoryService';

const ORDERS_STORAGE_KEY = 'k99_orders';
const realtimeBus = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('k99_realtime_bus')
  : null;

export const getCachedOrders = (): Order[] => {
  if (typeof window === 'undefined') return INITIAL_ORDERS;
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading order cache:', e);
  }
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
  return INITIAL_ORDERS;
};

export interface CreateOrderInput {
  order_type: OrderType;
  channel?: PosChannel;
  online_order_reference?: string;
  net_revenue?: number;
  delivery_type?: DeliveryType;
  delivery_address?: string;
  customer_name: string;
  customer_phone?: string;
  payment_method: PaymentMethod;
  notes?: string;
  discount?: number;
  promo_code?: string;
  promo_discount_percent?: number;
  items: Array<{
    product_id?: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    temperature?: 'ice' | 'hot' | 'normal';
    addons?: SelectedAddon[];
    notes?: string;
  }>;
}

export const orderService = {
  async getOrders(filters?: { status?: OrderStatus; orderType?: OrderType; date?: string }): Promise<Order[]> {
    if (supabase) {
      try {
        let query = supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.orderType) query = query.eq('order_type', filters.orderType);

        const { data, error } = await query;
        if (!error && data) {
          const mapped: Order[] = data.map((o: any) => ({
            ...o,
            items: o.order_items || [],
          }));
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getOrders error:', err);
      }
    }

    let list = getCachedOrders();
    if (filters?.status) list = list.filter(o => o.status === filters.status);
    if (filters?.orderType) list = list.filter(o => o.order_type === filters.orderType);
    return list;
  },

  async createOrder(input: CreateOrderInput, createdBy?: string): Promise<Order> {
    const subtotal = input.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = input.discount || 0;
    const total = Math.max(0, subtotal - discount);
    const netRevenue = input.net_revenue !== undefined ? input.net_revenue : total;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `K99-${randomSuffix}`;
    const orderId = 'ord-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = input.items.map((item) => ({
      id: 'item-' + Math.random().toString(36).substring(2, 9),
      order_id: orderId,
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
      temperature: item.temperature || 'normal',
      addons: item.addons || [],
      notes: item.notes || null,
      created_at: now,
    }));

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      order_type: input.order_type,
      channel: input.channel || 'offline',
      online_order_reference: input.online_order_reference || null,
      net_revenue: netRevenue,
      delivery_type: input.delivery_type || 'pickup',
      delivery_address: input.delivery_address || null,
      customer_name: input.customer_name || 'Pelanggan',
      customer_phone: input.customer_phone || '',
      status: input.order_type === 'pos' ? 'completed' : 'pending',
      payment_method: input.payment_method,
      subtotal,
      discount,
      promo_code: input.promo_code || null,
      promo_discount_percent: input.promo_discount_percent || null,
      total,
      notes: input.notes || '',
      created_by: createdBy || null,
      created_at: now,
      updated_at: now,
      items: orderItems,
    };

    // Attempt Supabase insert
    if (supabase) {
      try {
        const { data: insertedOrder, error: orderErr } = await supabase
          .from('orders')
          .insert([{
            order_number: orderNumber,
            order_type: input.order_type,
            customer_name: input.customer_name || 'Pelanggan',
            customer_phone: input.customer_phone || null,
            status: newOrder.status,
            payment_method: input.payment_method,
            subtotal,
            discount,
            total,
            notes: input.notes || null,
            created_by: createdBy || null,
          }])
          .select()
          .single();

        if (!orderErr && insertedOrder) {
          const supabaseOrderItems = input.items.map(item => ({
            order_id: insertedOrder.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.unit_price * item.quantity,
            notes: item.notes || null,
          }));

          const { data: insertedItems } = await supabase
            .from('order_items')
            .insert(supabaseOrderItems)
            .select();

          const finalOrder: Order = {
            ...insertedOrder,
            items: insertedItems || orderItems,
          };

          // Update local cache
          const cached = getCachedOrders();
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([finalOrder, ...cached]));

          if (finalOrder.status === 'completed') {
            await inventoryService.deductStockForOrder(finalOrder);
          }

          if (realtimeBus) {
            realtimeBus.postMessage({ type: 'NEW_ORDER_CREATED', data: finalOrder });
          }
          return finalOrder;
        }
      } catch (err) {
        console.warn('Supabase createOrder error, using local fallback:', err);
      }
    }

    // Save to local cache
    const current = getCachedOrders();
    const updated = [newOrder, ...current];
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    if (newOrder.status === 'completed') {
      await inventoryService.deductStockForOrder(newOrder);
    }

    if (realtimeBus) {
      realtimeBus.postMessage({ type: 'NEW_ORDER_CREATED', data: newOrder });
    }

    return newOrder;
  },

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*, order_items(*)')
          .single();

        if (!error && data) {
          const updated: Order = { ...data, items: data.order_items };
          const cached = getCachedOrders();
          const idx = cached.findIndex(o => o.id === id);
          if (idx !== -1) {
            cached[idx] = updated;
            localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cached));
          }

          // Otomatis kelola stok bahan sesuai resep menu
          if (status === 'confirmed' || status === 'completed') {
            await inventoryService.deductStockForOrder(updated);
          } else if (status === 'cancelled') {
            await inventoryService.restoreStockForOrder(updated);
          }

          if (realtimeBus) {
            realtimeBus.postMessage({ type: 'ORDER_STATUS_CHANGED', data: updated });
          }
          return updated;
        }
      } catch (err) {
        console.warn('Supabase updateOrderStatus error:', err);
      }
    }

    const current = getCachedOrders();
    const idx = current.findIndex(o => o.id === id);
    if (idx !== -1) {
      current[idx].status = status;
      current[idx].updated_at = new Date().toISOString();
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(current));

      // Otomatis kelola stok bahan sesuai resep menu
      if (status === 'confirmed' || status === 'completed') {
        await inventoryService.deductStockForOrder(current[idx]);
      } else if (status === 'cancelled') {
        await inventoryService.restoreStockForOrder(current[idx]);
      }

      if (realtimeBus) {
        realtimeBus.postMessage({ type: 'ORDER_STATUS_CHANGED', data: current[idx] });
      }
      return current[idx];
    }
    return null;
  },

  async deleteOrder(id: string): Promise<boolean> {
    const current = getCachedOrders();
    const target = current.find(o => o.id === id);

    // Kembalikan stok bahan jika sebelumnya sudah terpotong
    if (target && target.stock_deducted) {
      await inventoryService.restoreStockForOrder(target);
    }

    if (supabase) {
      try {
        await supabase.from('order_items').delete().eq('order_id', id);
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) {
          console.warn('Supabase deleteOrder error:', error);
        }
      } catch (err) {
        console.warn('Supabase deleteOrder catch:', err);
      }
    }

    const updated = current.filter(o => o.id !== id);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));

    if (realtimeBus) {
      realtimeBus.postMessage({ type: 'ORDER_DELETED', data: { id } });
    }
    return true;
  },

  subscribe(callback: (event: { type: 'NEW_ORDER' | 'STATUS_CHANGE'; order: Order }) => void): () => void {
    let supabaseChannel: any = null;
    if (supabase) {
      try {
        supabaseChannel = supabase
          .channel('public:orders')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            async (payload) => {
              if (payload.new) {
                // Fetch full order with items
                const { data } = await supabase!
                  .from('orders')
                  .select('*, order_items(*)')
                  .eq('id', payload.new.id)
                  .single();

                const fullOrder: Order = data ? { ...data, items: data.order_items } : (payload.new as Order);
                callback({ type: 'NEW_ORDER', order: fullOrder });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            (payload) => {
              if (payload.new) {
                callback({ type: 'STATUS_CHANGE', order: payload.new as Order });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime orders subscription error:', err);
      }
    }

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_ORDER_CREATED' && event.data?.data) {
        callback({ type: 'NEW_ORDER', order: event.data.data });
      } else if (event.data?.type === 'ORDER_STATUS_CHANGED' && event.data?.data) {
        callback({ type: 'STATUS_CHANGE', order: event.data.data });
      }
    };

    if (realtimeBus) {
      realtimeBus.addEventListener('message', handleBroadcast);
    }

    // Polling fallback every 8s
    const interval = setInterval(async () => {
      const orders = await orderService.getOrders();
      // Keep storage in sync
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }, 8000);

    return () => {
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      if (realtimeBus) {
        realtimeBus.removeEventListener('message', handleBroadcast);
      }
      clearInterval(interval);
    };
  },
};
