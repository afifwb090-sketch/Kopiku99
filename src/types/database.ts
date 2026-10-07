export type UserRole = 'owner' | 'admin' | 'cashier';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export interface StoreSetting {
  id: string;
  store_name: string;
  is_open: boolean;
  address?: string;
  phone?: string;
  description?: string;
  qris_image_url?: string;
  receipt_logo_url?: string;
  receipt_show_logo?: boolean;
  receipt_header_text?: string;
  receipt_footer_text?: string;
  available_addons?: ProductAddon[];
  updated_at: string;
  updated_by?: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  legacy_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  category_id?: string | null;
  category_name?: string;
  name: string;
  description?: string | null;
  price: number;
  cost_price: number;
  image_url?: string | null;
  is_active: boolean;
  is_available: boolean;
  sort_order: number;
  legacy_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_per_unit: number;
  is_active: boolean;
  legacy_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  created_at?: string;
  updated_at?: string;
  items?: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit: string;
}

export type OrderType = 'pos' | 'online';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'other';
export type PosChannel = 'offline' | 'shopeefood' | 'grabfood' | 'gofood';
export type DeliveryType = 'pickup' | 'spx_instant';

export interface SelectedAddon {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  temperature?: 'ice' | 'hot' | 'normal';
  addons?: SelectedAddon[];
  notes?: string | null;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: OrderType;
  channel?: PosChannel;
  online_order_reference?: string | null; // Nomor order ShopeeFood, GrabFood, GoFood
  net_revenue?: number | null; // Harga bersih setelah potongan komisi (masuk ke laporan profit)
  delivery_type?: DeliveryType | null; // 'pickup' | 'spx_instant'
  delivery_address?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  legacy_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  stock_deducted?: boolean;
}

export interface Payable {
  id: string;
  supplier_name: string;
  ingredient_name: string;
  ingredient_id?: string | null;
  order_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'waste' | 'return';

export interface StockMovement {
  id: string;
  ingredient_id: string;
  ingredient_name?: string;
  movement_type: MovementType;
  quantity: number;
  reference_type?: string | null;
  reference_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface MigrationSummary {
  entity: string;
  imported: number;
  duplicates: number;
  invalid: number;
  details?: string[];
}
