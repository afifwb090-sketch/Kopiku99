import { supabase } from './supabase';
import { Product } from '../types/database';
import { INITIAL_PRODUCTS } from './mockData';

const STORAGE_KEY = 'k99_products';

export const getCachedProducts = (): Product[] => {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading product cache:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
};

export const productService = {
  async getProducts(options?: { categoryId?: string; onlyActive?: boolean; onlyAvailable?: boolean }): Promise<Product[]> {
    if (supabase) {
      try {
        let query = supabase
          .from('products')
          .select('*, categories(name)')
          .order('sort_order', { ascending: true });

        if (options?.onlyActive) query = query.eq('is_active', true);
        if (options?.onlyAvailable) query = query.eq('is_available', true);
        if (options?.categoryId && options.categoryId !== 'all') {
          query = query.eq('category_id', options.categoryId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped = data.map((item: any) => ({
            ...item,
            category_name: item.categories?.name || undefined,
          })) as Product[];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getProducts error:', err);
      }
    }

    let list = getCachedProducts();
    if (options?.onlyActive) list = list.filter(p => p.is_active);
    if (options?.onlyAvailable) list = list.filter(p => p.is_available);
    if (options?.categoryId && options.categoryId !== 'all') {
      list = list.filter(p => p.category_id === options.categoryId);
    }
    return list;
  },

  async getProductById(id: string): Promise<Product | null> {
    const all = await this.getProducts();
    return all.find(p => p.id === id) || null;
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: 'prod-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            name: product.name,
            category_id: product.category_id || null,
            description: product.description || null,
            price: Number(product.price),
            cost_price: Number(product.cost_price || 0),
            image_url: product.image_url || null,
            is_active: product.is_active ?? true,
            is_available: product.is_available ?? true,
            sort_order: product.sort_order ?? 0,
            legacy_id: product.legacy_id || null,
          }])
          .select()
          .single();

        if (!error && data) {
          return data as Product;
        }
      } catch (err) {
        console.warn('Supabase createProduct error:', err);
      }
    }

    const current = getCachedProducts();
    const updated = [...current, newProduct];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (supabase) {
      try {
        const payload: any = { ...updates, updated_at: new Date().toISOString() };
        delete payload.category_name;
        delete payload.categories;

        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return data as Product;
        }
      } catch (err) {
        console.warn('Supabase updateProduct error:', err);
      }
    }

    const current = getCachedProducts();
    const idx = current.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updated = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
      current[idx] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return updated;
    }
    return null;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deleteProduct error:', err);
      }
    }

    const current = getCachedProducts();
    const filtered = current.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  async uploadProductImage(file: File): Promise<string | null> {
    if (supabase) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          return data.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase storage upload error:', err);
      }
    }

    // Fallback: convert to base64 Data URL or mock image URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  },
};
