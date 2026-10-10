-- ============================================================
-- K99 KEDAI KOPI & TEH
-- SUPABASE PRODUCTION SCHEMA v2
-- Compatible with Kopiku99 Web App
-- ID strategy: TEXT (cat-xxx, prod-xxx)
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- CLEAN DEV RESET (UNCOMMENT ONLY FOR FRESH INSTALL)
-- ============================================================
-- DROP TABLE IF EXISTS public.order_items CASCADE;
-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;
-- DROP TABLE IF EXISTS public.categories CASCADE;
-- DROP TABLE IF EXISTS public.ingredients CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.store_settings CASCADE;


-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','cashier')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- STORE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    store_name TEXT NOT NULL DEFAULT 'K99 Kedai Kopi & Teh',
    is_open BOOLEAN DEFAULT true,
    address TEXT,
    phone TEXT,
    description TEXT,
    qris_image_url TEXT,
    receipt_logo_url TEXT,
    available_addons JSONB DEFAULT '[]'::jsonb,
    promo_codes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0,
    legacy_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) DEFAULT 0,
    cost_price NUMERIC(12,2) DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    legacy_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_products_category
    FOREIGN KEY(category_id)
    REFERENCES public.categories(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);


-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    order_type TEXT CHECK(order_type IN ('pos','online')),
    channel TEXT DEFAULT 'offline',
    customer_name TEXT DEFAULT 'Pelanggan',
    customer_phone TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'pending',
    promo_code TEXT,
    created_by TEXT,
    legacy_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(12,2) DEFAULT 0,
    subtotal NUMERIC(12,2) DEFAULT 0,
    addons JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_order_items_order
    FOREIGN KEY(order_id)
    REFERENCES public.orders(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_order_items_product
    FOREIGN KEY(product_id)
    REFERENCES public.products(id)
    ON DELETE SET NULL
);


-- ============================================================
-- INGREDIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ingredients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'gram',
    current_stock NUMERIC DEFAULT 0,
    minimum_stock NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    legacy_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "public read categories" ON public.categories;
CREATE POLICY "public read categories"
ON public.categories FOR SELECT
USING (true);


DROP POLICY IF EXISTS "public read products" ON public.products;
CREATE POLICY "public read products"
ON public.products FOR SELECT
USING (is_active = true);


DROP POLICY IF EXISTS "auth manage categories" ON public.categories;
CREATE POLICY "auth manage categories"
ON public.categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "auth manage products" ON public.products;
CREATE POLICY "auth manage products"
ON public.products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "auth manage orders" ON public.orders;
CREATE POLICY "auth manage orders"
ON public.orders FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "auth manage order items" ON public.order_items;
CREATE POLICY "auth manage order items"
ON public.order_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- SEED DATA COMPATIBLE WITH KOPIKU99
-- ============================================================

INSERT INTO public.categories(id,name,sort_order)
VALUES
('cat-1','Kopi & Espresso',1),
('cat-2','Non-Coffee & Tea',2),
('cat-3','Signature K99',3),
('cat-4','Cemilan & Snack',4)
ON CONFLICT(id) DO NOTHING;


COMMIT;
