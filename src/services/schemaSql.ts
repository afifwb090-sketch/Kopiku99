export const SCHEMA_SQL = `-- ==============================================================================
-- K99 KEDAI KOPI & TEH - SUPABASE PRODUCTION DATABASE SCHEMA
-- Compatible with Cloudflare Pages, Mobile Devices, POS Cashier & Online Store
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Convert existing UUID columns to TEXT (agar menerima ID format 'cat-xxx', 'prod-xxx')
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
  ALTER TABLE IF EXISTS public.recipe_items DROP CONSTRAINT IF EXISTS recipe_items_recipe_id_fkey;
  ALTER TABLE IF EXISTS public.recipe_items DROP CONSTRAINT IF EXISTS recipe_items_ingredient_id_fkey;
  ALTER TABLE IF EXISTS public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

  ALTER TABLE IF EXISTS public.categories ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.products ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.products ALTER COLUMN category_id TYPE TEXT;
  ALTER TABLE IF EXISTS public.store_settings ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.orders ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.order_items ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.order_items ALTER COLUMN order_id TYPE TEXT;
  ALTER TABLE IF EXISTS public.order_items ALTER COLUMN product_id TYPE TEXT;
  ALTER TABLE IF EXISTS public.profiles ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.ingredients ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.recipes ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.recipes ALTER COLUMN product_id TYPE TEXT;
  ALTER TABLE IF EXISTS public.recipe_items ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.recipe_items ALTER COLUMN recipe_id TYPE TEXT;
  ALTER TABLE IF EXISTS public.recipe_items ALTER COLUMN ingredient_id TYPE TEXT;
  ALTER TABLE IF EXISTS public.stock_movements ALTER COLUMN id TYPE TEXT;
  ALTER TABLE IF EXISTS public.payables ALTER COLUMN id TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
  -- Lanjut jika tabel belum dibuat sebelumnya
END $$;

-- 2. Create PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'cashier')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create STORE_SETTINGS table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  store_name TEXT NOT NULL DEFAULT 'K99 Kedai Kopi & Teh',
  is_open BOOLEAN NOT NULL DEFAULT true,
  address TEXT DEFAULT 'Jl. Pemuda No. 99, Indonesia',
  phone TEXT DEFAULT '0812-9900-1999',
  description TEXT DEFAULT 'Kedai kopi & teh santai dengan cita rasa otentik dan aneka cemilan lezat.',
  qris_image_url TEXT,
  receipt_logo_url TEXT,
  receipt_show_logo BOOLEAN DEFAULT true,
  receipt_header_text TEXT,
  receipt_footer_text TEXT,
  available_addons JSONB DEFAULT '[]'::jsonb,
  promo_codes JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create CATEGORIES table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create PRODUCTS table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create INGREDIENTS table (Inventory)
CREATE TABLE IF NOT EXISTS public.ingredients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'gram',
  current_stock NUMERIC(12,2) DEFAULT 0 NOT NULL,
  minimum_stock NUMERIC(12,2) DEFAULT 0 NOT NULL,
  cost_per_unit NUMERIC(12,2) DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create RECIPES table
CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Create RECIPE_ITEMS table
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipe_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL
);

-- 9. Create ORDERS table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT UNIQUE NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('pos', 'online')),
  channel TEXT DEFAULT 'offline',
  online_order_reference TEXT,
  net_revenue NUMERIC(12,2),
  delivery_type TEXT DEFAULT 'pickup',
  delivery_address TEXT,
  customer_name TEXT NOT NULL DEFAULT 'Pelanggan',
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0 NOT NULL,
  promo_code TEXT,
  promo_discount_percent NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_deducted BOOLEAN DEFAULT false NOT NULL,
  notes TEXT,
  created_by TEXT,
  legacy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Create ORDER_ITEMS table
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  temperature TEXT DEFAULT 'normal',
  addons JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Create STOCK_MOVEMENTS table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ingredient_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Create PAYABLES table
CREATE TABLE IF NOT EXISTS public.payables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_name TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  ingredient_id TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure all columns exist even if tables were created previously
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS qris_image_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS receipt_logo_url TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS receipt_show_logo BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS receipt_header_text TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS receipt_footer_text TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS available_addons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS promo_codes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS legacy_id TEXT;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS legacy_id TEXT;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'offline';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS online_order_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS net_revenue NUMERIC(12,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'pickup';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promo_discount_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT false;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'normal';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- Dynamic drop: Safely drops ANY old policies on public tables to prevent ERROR 42710
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Explicit drops as an additional safety guarantee
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner and admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all on store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow all on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
DROP POLICY IF EXISTS "Allow all on ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow all on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow all on recipe_items" ON public.recipe_items;
DROP POLICY IF EXISTS "Allow all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all on stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Allow all on payables" ON public.payables;

CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on store_settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ingredients" ON public.ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recipes" ON public.recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recipe_items" ON public.recipe_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payables" ON public.payables FOR ALL USING (true) WITH CHECK (true);

-- STORAGE BUCKET FOR IMAGES
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
CREATE POLICY "Public Access product-images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

-- REALTIME REPLICATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
`;
