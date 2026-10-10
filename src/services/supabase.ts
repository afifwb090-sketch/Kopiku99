import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Auto-detect Supabase credentials from URL query parameters (e.g. when scanned via QR code on mobile)
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const supaUrl = params.get('supa_url') || params.get('supabase_url');
    const supaKey = params.get('supa_key') || params.get('supabase_key');
    if (supaUrl && supaKey) {
      localStorage.setItem('k99_custom_supabase_url', supaUrl.trim());
      localStorage.setItem('k99_custom_supabase_key', supaKey.trim());
      // Clean query params from URL bar so the address stays clean
      params.delete('supa_url');
      params.delete('supabase_url');
      params.delete('supa_key');
      params.delete('supabase_key');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  } catch {}
}

// Configuration can come from environment variables or custom local storage settings
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('k99_custom_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('k99_custom_supabase_key') : null;

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('http') &&
    anonKey !== 'your-anon-public-key' &&
    !url.includes('your-project-id')
  );

  return { url, anonKey, isConfigured };
};

const config = getSupabaseConfig();

export let supabase: SupabaseClient | null = null;

const initClient = (url: string, key: string): SupabaseClient | null => {
  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
};

if (config.isConfigured) {
  supabase = initClient(config.url, config.anonKey);
}

export const reinitializeSupabase = (newUrl?: string, newKey?: string) => {
  if (typeof window !== 'undefined') {
    if (newUrl !== undefined) localStorage.setItem('k99_custom_supabase_url', newUrl.trim());
    if (newKey !== undefined) localStorage.setItem('k99_custom_supabase_key', newKey.trim());
  }
  const current = getSupabaseConfig();
  if (current.isConfigured) {
    supabase = initClient(current.url, current.anonKey);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('k99_supabase_changed', { detail: current }));
    }
    return true;
  }
  supabase = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('k99_supabase_changed', { detail: current }));
  }
  return false;
};

export interface SupabaseDiagnosticResult {
  ok: boolean;
  message: string;
  latencyMs: number;
  tables: {
    store_settings: boolean;
    categories: boolean;
    products: boolean;
    orders: boolean;
  };
  storageBucket: boolean;
  error?: string;
}

/**
 * Perform a real network check to Supabase to verify credentials, table existence, and RLS policies
 */
export const testSupabaseFullConnection = async (): Promise<SupabaseDiagnosticResult> => {
  const current = getSupabaseConfig();
  if (!current.isConfigured || !supabase) {
    return {
      ok: false,
      message: 'Supabase URL atau Anon Key belum diisi atau format tidak valid.',
      latencyMs: 0,
      tables: { store_settings: false, categories: false, products: false, orders: false },
      storageBucket: false,
      error: 'Konfigurasi belum lengkap',
    };
  }

  const startTime = performance.now();
  const tables = {
    store_settings: false,
    categories: false,
    products: false,
    orders: false,
  };
  let storageBucket = false;
  let firstError = '';

  try {
    // 1. Check store_settings
    const { error: errStore } = await supabase.from('store_settings').select('id').limit(1);
    if (!errStore) tables.store_settings = true;
    else if (!firstError) firstError = `Tabel store_settings: ${errStore.message}`;

    // 2. Check categories
    const { error: errCat } = await supabase.from('categories').select('id').limit(1);
    if (!errCat) tables.categories = true;
    else if (!firstError) firstError = `Tabel categories: ${errCat.message}`;

    // 3. Check products
    const { error: errProd } = await supabase.from('products').select('id').limit(1);
    if (!errProd) tables.products = true;
    else if (!firstError) firstError = `Tabel products: ${errProd.message}`;

    // 4. Check orders
    const { error: errOrder } = await supabase.from('orders').select('id').limit(1);
    if (!errOrder) tables.orders = true;
    else if (!firstError) firstError = `Tabel orders: ${errOrder.message}`;

    // 5. Check storage bucket
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (buckets?.some(b => b.name === 'product-images' || b.id === 'product-images')) {
        storageBucket = true;
      }
    } catch {}

    const latencyMs = Math.round(performance.now() - startTime);
    const allTablesOk = tables.store_settings && tables.categories && tables.products && tables.orders;

    if (allTablesOk) {
      return {
        ok: true,
        message: 'Koneksi database Supabase PostgreSQL berhasil & semua tabel siap!',
        latencyMs,
        tables,
        storageBucket,
      };
    } else {
      return {
        ok: false,
        message: firstError || 'Sebagian tabel belum dibuat di Supabase.',
        latencyMs,
        tables,
        storageBucket,
        error: firstError,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Cek koneksi internet & URL'}`,
      latencyMs,
      tables,
      storageBucket,
      error: err.message,
    };
  }
};

/**
 * Generate a shareable URL to configure Supabase on another device (e.g. HP) via QR code
 */
export const getSupabaseShareUrl = (targetPath = '/store'): string => {
  if (typeof window === 'undefined') return '';
  const current = getSupabaseConfig();
  if (!current.isConfigured) return '';
  const origin = window.location.origin;
  const urlParam = encodeURIComponent(current.url);
  const keyParam = encodeURIComponent(current.anonKey);
  return `${origin}${targetPath}?supa_url=${urlParam}&supa_key=${keyParam}`;
};

