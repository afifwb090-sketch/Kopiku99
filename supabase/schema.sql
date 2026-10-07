-- ==============================================================================
-- K99 KEDAI POS & ONLINE ORDERING - SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create STORE_SETTINGS table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'K99 Kedai Kopi & Teh',
  is_open BOOLEAN NOT NULL DEFAULT false,
  address TEXT DEFAULT 'Jl. Raya K99, Indonesia',
  phone TEXT DEFAULT '0812-3456-7890',
  description TEXT DEFAULT 'Tempat ngopi santai dengan aneka kopi spesial, non-kopi, dan cemilan lezat.',
  qris_image_url TEXT,
  receipt_logo_url TEXT,
  receipt_show_logo BOOLEAN DEFAULT true,
  receipt_header_text TEXT,
  receipt_footer_text TEXT,
  available_addons JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create CATEGORIES table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  legacy_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create PRODUCTS table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  legacy_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create INGREDIENTS table (Inventory)
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'gram',
  current_stock NUMERIC(12,2) DEFAULT 0 NOT NULL,
  minimum_stock NUMERIC(12,2) DEFAULT 0 NOT NULL,
  cost_per_unit NUMERIC(12,2) DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  legacy_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create RECIPES table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Create RECIPE_ITEMS table
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL
);

-- 9. Create ORDERS table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('pos', 'online')),
  channel TEXT DEFAULT 'offline' CHECK (channel IN ('offline', 'shopeefood', 'grabfood', 'gofood')),
  online_order_reference TEXT,
  net_revenue NUMERIC(12,2),
  delivery_type TEXT DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'spx_instant')),
  delivery_address TEXT,
  customer_name TEXT NOT NULL DEFAULT 'Pelanggan',
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris', 'transfer', 'other')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0 NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_deducted BOOLEAN DEFAULT false NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  legacy_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Create ORDER_ITEMS table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  temperature TEXT DEFAULT 'normal' CHECK (temperature IN ('ice', 'hot', 'normal')),
  addons JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Create STOCK_MOVEMENTS table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'waste', 'return')),
  quantity NUMERIC(12,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Create PAYABLES table (Utang Piutang / Pesan Tempo Bahan)
CREATE TABLE IF NOT EXISTS public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: Users can view their own profile; admin/owner can view and manage all
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_auth_role() IN ('owner', 'admin'));

CREATE POLICY "Owner and admin manage profiles"
  ON public.profiles FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

-- Store Settings: Public can read, authenticated staff can update
CREATE POLICY "Anyone can view store settings"
  ON public.store_settings FOR SELECT
  USING (true);

CREATE POLICY "Staff can update store settings"
  ON public.store_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert store settings"
  ON public.store_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Categories: Public can read active categories, Staff can view all, Admin/Owner can manage
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage categories"
  ON public.categories FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

-- Products: Public can view active products, Admin/Owner can manage
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage products"
  ON public.products FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

-- Orders: Public can insert online orders, Staff can view and manage all orders
CREATE POLICY "Public can insert online orders"
  ON public.orders FOR INSERT
  WITH CHECK (order_type = 'online');

CREATE POLICY "Staff can view all orders"
  ON public.orders FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert pos orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Order Items: Public can insert for their order, Staff can view/manage
CREATE POLICY "Public can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can view order items"
  ON public.order_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inventory: Staff (cashier/admin/owner) can read, admin/owner can modify
CREATE POLICY "Staff can view ingredients"
  ON public.ingredients FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/owner can manage ingredients"
  ON public.ingredients FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

CREATE POLICY "Staff can view recipes"
  ON public.recipes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/owner can manage recipes"
  ON public.recipes FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

CREATE POLICY "Staff can view recipe items"
  ON public.recipe_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/owner can manage recipe items"
  ON public.recipe_items FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

CREATE POLICY "Staff can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/owner can manage payables"
  ON public.payables FOR ALL
  USING (public.get_auth_role() IN ('owner', 'admin'));

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS SETUP
-- ==============================================================================
-- Run these in Supabase SQL editor to enable Realtime:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ==============================================================================
-- SEED INITIAL DATA & REALTIME ACTIVATION
-- ==============================================================================
INSERT INTO public.store_settings (id, store_name, is_open, address, phone, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'K99 Kedai Kopi & Teh',
  true,
  'Jl. Pemuda No. 99, Indonesia',
  '0812-9900-1999',
  'Kedai kopi & teh santai dengan cita rasa otentik dan aneka cemilan lezat.'
)
ON CONFLICT (id) DO NOTHING;

-- AKTIFKAN REALTIME DI SUPABASE UNTUK STORE STATUS & ORDER
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- CATATAN UNTUK AKUN DEFAULT (APEP):
-- 1. Buat User di menu Supabase Dashboard: Authentication -> Users -> "Add user"
--    Email: apep@k99.id
--    Password: Delasika013
--    Auto Confirm User? [Centang / Yes]
-- 2. Jalankan query berikut di Supabase SQL Editor untuk menghubungkan role Owner:
--    INSERT INTO public.profiles (id, full_name, role)
--    SELECT id, 'Apep (Owner & Admin K99)', 'owner'
--    FROM auth.users WHERE email = 'apep@k99.id'
--    ON CONFLICT (id) DO UPDATE SET role = 'owner', full_name = 'Apep (Owner & Admin K99)';

