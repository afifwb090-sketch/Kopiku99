import { supabase } from './supabase';
import { getCachedCategories } from './categoryService';
import { getCachedProducts } from './productService';
import { getCachedStoreSettings } from './storeService';

export const pushLocalDataToSupabase = async (): Promise<{
  ok: boolean;
  categoriesSynced: number;
  productsSynced: number;
  storeSynced: boolean;
  error?: string;
}> => {
  if (!supabase) {
    return { ok: false, categoriesSynced: 0, productsSynced: 0, storeSynced: false, error: 'Supabase belum terhubung.' };
  }

  try {
    const cats = getCachedCategories();
    const prods = getCachedProducts();
    const store = getCachedStoreSettings();

    // 1. Sync Categories
    let catsCount = 0;
    if (cats.length > 0) {
      const payloadCats = cats.map(c => ({
        id: c.id,
        name: c.name,
        is_active: c.is_active ?? true,
        sort_order: c.sort_order ?? 0,
        legacy_id: c.legacy_id || null,
      }));
      const { error: catErr } = await supabase.from('categories').upsert(payloadCats);
      if (catErr) throw new Error(`Gagal upload kategori: ${catErr.message}`);
      catsCount = cats.length;
    }

    // 2. Sync Products
    let prodsCount = 0;
    if (prods.length > 0) {
      const payloadProds = prods.map(p => ({
        id: p.id,
        name: p.name,
        category_id: p.category_id || null,
        description: p.description || null,
        price: Number(p.price) || 0,
        cost_price: Number(p.cost_price) || 0,
        image_url: p.image_url || null,
        is_active: p.is_active ?? true,
        is_available: p.is_available ?? true,
        sort_order: p.sort_order ?? 0,
        legacy_id: p.legacy_id || null,
      }));
      const { error: prodErr } = await supabase.from('products').upsert(payloadProds);
      if (prodErr) throw new Error(`Gagal upload produk: ${prodErr.message}`);
      prodsCount = prods.length;
    }

    // 3. Sync Store Settings
    const { data: existingRows } = await supabase.from('store_settings').select('id').limit(1);
    const storeRowId = existingRows?.[0]?.id || store.id || '00000000-0000-0000-0000-000000000001';

    const { error: storeErr } = await supabase.from('store_settings').upsert({
      id: storeRowId,
      store_name: store.store_name,
      is_open: store.is_open,
      address: store.address || null,
      phone: store.phone || null,
      description: store.description || null,
      qris_image_url: store.qris_image_url || null,
      receipt_logo_url: store.receipt_logo_url || null,
      receipt_show_logo: store.receipt_show_logo !== false,
      receipt_header_text: store.receipt_header_text || null,
      receipt_footer_text: store.receipt_footer_text || null,
      available_addons: store.available_addons || [],
      promo_codes: store.promo_codes || [],
      updated_at: new Date().toISOString(),
    });
    if (storeErr) throw new Error(`Gagal upload pengaturan toko: ${storeErr.message}`);

    return {
      ok: true,
      categoriesSynced: catsCount,
      productsSynced: prodsCount,
      storeSynced: true,
    };
  } catch (err: any) {
    return {
      ok: false,
      categoriesSynced: 0,
      productsSynced: 0,
      storeSynced: false,
      error: err.message,
    };
  }
};
