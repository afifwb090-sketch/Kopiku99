import { supabase } from './supabase';
import { productService } from './productService';
import { categoryService } from './categoryService';
import { inventoryService } from './inventoryService';
import { orderService } from './orderService';
import { MigrationSummary, Product, Category, Ingredient, Order } from '../types/database';

export const migrationService = {
  /**
   * Helper to parse simple CSV text into array of record objects
   */
  parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Handle commas inside quotes or basic split
      const row = lines[i];
      const values: string[] = [];
      let inQuote = false;
      let currentVal = '';

      for (let c = 0; c < row.length; c++) {
        const char = row[c];
        if (char === '"' || char === "'") {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          values.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim());

      const record: Record<string, string> = {};
      headers.forEach((h, idx) => {
        let val = values[idx] || '';
        val = val.replace(/^["']|["']$/g, '').trim();
        record[h] = val;
      });
      records.push(record);
    }

    return records;
  },

  /**
   * Import Categories with idempotency (checks legacy_id or name)
   */
  async importCategories(data: any[]): Promise<MigrationSummary> {
    const summary: MigrationSummary = { entity: 'Categories', imported: 0, duplicates: 0, invalid: 0, details: [] };
    const existing = await categoryService.getCategories();
    const existingLegacyIds = new Set(existing.map(c => c.legacy_id).filter(Boolean));
    const existingNames = new Set(existing.map(c => c.name.toLowerCase()));

    for (const item of data) {
      const name = item.name || item.nama || item.category || item.kategori;
      if (!name) {
        summary.invalid++;
        summary.details?.push(`Baris tanpa nama kategori`);
        continue;
      }

      const legacyId = item.id || item.legacy_id || item.code || null;
      if ((legacyId && existingLegacyIds.has(legacyId)) || existingNames.has(name.toLowerCase())) {
        summary.duplicates++;
        continue;
      }

      await categoryService.createCategory({
        name,
        is_active: item.is_active !== false && item.is_active !== 'false' && item.status !== 'inactive',
        sort_order: Number(item.sort_order || item.urutan || 0),
        legacy_id: legacyId,
      });

      summary.imported++;
      if (legacyId) existingLegacyIds.add(legacyId);
      existingNames.add(name.toLowerCase());
    }

    return summary;
  },

  /**
   * Import Products with idempotency
   */
  async importProducts(data: any[]): Promise<MigrationSummary> {
    const summary: MigrationSummary = { entity: 'Products', imported: 0, duplicates: 0, invalid: 0, details: [] };
    const existing = await productService.getProducts();
    const categories = await categoryService.getCategories();

    const categoryMap = new Map<string, string>();
    categories.forEach(c => {
      categoryMap.set(c.name.toLowerCase(), c.id);
      if (c.legacy_id) categoryMap.set(c.legacy_id, c.id);
    });

    const existingLegacyIds = new Set(existing.map(p => p.legacy_id).filter(Boolean));
    const existingNames = new Set(existing.map(p => p.name.toLowerCase()));

    for (const item of data) {
      const name = item.name || item.nama_produk || item.nama;
      const price = Number(item.price || item.harga || 0);

      if (!name || isNaN(price) || price < 0) {
        summary.invalid++;
        summary.details?.push(`Data produk tidak valid: ${name || 'tanpa nama'}`);
        continue;
      }

      const legacyId = item.id || item.legacy_id || item.kode_produk || null;
      if ((legacyId && existingLegacyIds.has(legacyId)) || existingNames.has(name.toLowerCase())) {
        summary.duplicates++;
        continue;
      }

      // Find matching category ID
      const catKey = (item.category || item.category_name || item.kategori || item.category_id || '').toLowerCase();
      const categoryId = categoryMap.get(catKey) || null;

      await productService.createProduct({
        name,
        category_id: categoryId,
        description: item.description || item.deskripsi || null,
        price,
        cost_price: Number(item.cost_price || item.hpp || item.modal || 0),
        image_url: item.image_url || item.gambar || item.foto || null,
        is_active: item.is_active !== false && item.is_active !== 'false',
        is_available: item.is_available !== false && item.is_available !== 'false',
        sort_order: Number(item.sort_order || 0),
        legacy_id: legacyId,
      });

      summary.imported++;
      if (legacyId) existingLegacyIds.add(legacyId);
      existingNames.add(name.toLowerCase());
    }

    return summary;
  },

  /**
   * Import Ingredients (Inventory)
   */
  async importIngredients(data: any[]): Promise<MigrationSummary> {
    const summary: MigrationSummary = { entity: 'Ingredients', imported: 0, duplicates: 0, invalid: 0, details: [] };
    const existing = await inventoryService.getIngredients();
    const existingLegacy = new Set(existing.map(i => i.legacy_id).filter(Boolean));
    const existingNames = new Set(existing.map(i => i.name.toLowerCase()));

    for (const item of data) {
      const name = item.name || item.nama_bahan || item.bahan;
      if (!name) {
        summary.invalid++;
        continue;
      }

      const legacyId = item.id || item.legacy_id || null;
      if ((legacyId && existingLegacy.has(legacyId)) || existingNames.has(name.toLowerCase())) {
        summary.duplicates++;
        continue;
      }

      await inventoryService.createIngredient({
        name,
        unit: item.unit || item.satuan || 'gram',
        current_stock: Number(item.current_stock || item.stok || item.stok_saat_ini || 0),
        minimum_stock: Number(item.minimum_stock || item.stok_minimum || 0),
        cost_per_unit: Number(item.cost_per_unit || item.harga_satuan || item.biaya || 0),
        is_active: item.is_active !== false && item.is_active !== 'false',
        legacy_id: legacyId,
      });

      summary.imported++;
      if (legacyId) existingLegacy.add(legacyId);
      existingNames.add(name.toLowerCase());
    }

    return summary;
  },

  /**
   * Import Orders
   */
  async importOrders(data: any[]): Promise<MigrationSummary> {
    const summary: MigrationSummary = { entity: 'Orders', imported: 0, duplicates: 0, invalid: 0, details: [] };
    const existing = await orderService.getOrders();
    const existingNumbers = new Set(existing.map(o => o.order_number));
    const existingLegacy = new Set(existing.map(o => o.legacy_id).filter(Boolean));

    for (const item of data) {
      const orderNum = item.order_number || item.no_pesanan || item.order_id || `K99-MIG-${Math.floor(1000 + Math.random() * 9000)}`;
      const legacyId = item.id || item.legacy_id || null;

      if ((legacyId && existingLegacy.has(legacyId)) || existingNumbers.has(orderNum)) {
        summary.duplicates++;
        continue;
      }

      const total = Number(item.total || item.total_bayar || 0);
      const itemsList = Array.isArray(item.items) ? item.items : [
        {
          product_name: item.product_name || item.item || 'Order Migrasi',
          quantity: Number(item.quantity || item.qty || 1),
          unit_price: total > 0 ? total : 20000,
        }
      ];

      await orderService.createOrder({
        order_type: item.order_type === 'online' || item.tipe === 'online' ? 'online' : 'pos',
        customer_name: item.customer_name || item.pelanggan || 'Pelanggan Lama',
        customer_phone: item.customer_phone || item.no_hp || '',
        payment_method: (item.payment_method || item.metode || 'cash').toLowerCase() as any,
        notes: item.notes || item.catatan || 'Import dari sistem lama',
        discount: Number(item.discount || 0),
        items: itemsList,
      });

      summary.imported++;
      existingNumbers.add(orderNum);
      if (legacyId) existingLegacy.add(legacyId);
    }

    return summary;
  },

  /**
   * Opsi A: Migrasi langsung dari Google Apps Script / Google Sheets URL
   */
  async migrateFromAppsScript(appsScriptUrl: string): Promise<MigrationSummary[]> {
    const cleanUrl = appsScriptUrl.trim();
    if (!cleanUrl) {
      throw new Error('URL Google Apps Script tidak boleh kosong.');
    }

    // Try fetching JSON from Apps Script Web App
    const res = await fetch(cleanUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Gagal menghubungi Google Apps Script: HTTP ${res.status}`);
    }

    const payload = await res.json();
    const results: MigrationSummary[] = [];

    if (payload.categories && Array.isArray(payload.categories)) {
      results.push(await this.importCategories(payload.categories));
    }
    if (payload.products && Array.isArray(payload.products)) {
      results.push(await this.importProducts(payload.products));
    }
    if (payload.ingredients && Array.isArray(payload.ingredients)) {
      results.push(await this.importIngredients(payload.ingredients));
    }
    if (payload.orders && Array.isArray(payload.orders)) {
      results.push(await this.importOrders(payload.orders));
    }

    if (results.length === 0) {
      // If flat array or single entity
      if (Array.isArray(payload)) {
        // Guess entity by inspecting first row
        const first = payload[0] || {};
        if (first.price !== undefined || first.harga !== undefined) {
          results.push(await this.importProducts(payload));
        } else if (first.unit !== undefined || first.satuan !== undefined) {
          results.push(await this.importIngredients(payload));
        } else {
          results.push(await this.importCategories(payload));
        }
      }
    }

    return results;
  },

  /**
   * Opsi B: Migrasi dari teks CSV / JSON
   */
  async migrateFromFileContent(type: 'products' | 'categories' | 'ingredients' | 'orders', content: string, format: 'json' | 'csv'): Promise<MigrationSummary> {
    let records: any[] = [];

    if (format === 'json') {
      try {
        const parsed = JSON.parse(content);
        records = Array.isArray(parsed) ? parsed : (parsed.data || parsed.items || []);
      } catch (e: any) {
        throw new Error('Format file JSON tidak valid: ' + e.message);
      }
    } else {
      records = this.parseCSV(content);
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Tidak ada data baris yang ditemukan dalam file.');
    }

    switch (type) {
      case 'categories':
        return await this.importCategories(records);
      case 'products':
        return await this.importProducts(records);
      case 'ingredients':
        return await this.importIngredients(records);
      case 'orders':
        return await this.importOrders(records);
      default:
        throw new Error('Jenis entitas tidak didukung: ' + type);
    }
  },
};
