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
    // 1. Try server API first (sync across all devices)
    try {
      const params = new URLSearchParams();
      params.set('_t', Date.now().toString());
      if (options?.categoryId) params.set('categoryId', options.categoryId);
      if (options?.onlyActive) params.set('onlyActive', 'true');
      if (options?.onlyAvailable) params.set('onlyAvailable', 'true');

      const url = `/api/products?${params.toString()}`;
      const res = await fetch(url, { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverProducts = (await res.json()) as Product[];
        if (Array.isArray(serverProducts)) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverProducts));
          } catch {}
          return serverProducts;
        }
      }
    } catch {
      // offline fallback
    }

    // 2. Try Supabase
    if (supabase) {
      try {
        let query = supabase
          .from('products')
          .select('*')
          .order('sort_order', { ascending: true });

        if (options?.onlyActive) query = query.eq('is_active', true);
        if (options?.onlyAvailable) query = query.eq('is_available', true);
        if (options?.categoryId && options.categoryId !== 'all') {
          query = query.eq('category_id', options.categoryId);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          if (data.length > 0) {
            const mapped = data as Product[];
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
            return mapped;
          }
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

    // Save to local cache immediately
    const current = getCachedProducts();
    const updated = [...current, newProduct];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Save to server API if available
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(newProduct),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverProd = await res.json();
        if (serverProd?.id) {
          try {
            const fresh = getCachedProducts().filter(p => p.id !== newProduct.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...fresh, serverProd]));
          } catch {}
          return serverProd;
        }
      }
    } catch (err) {
      console.warn('Server API createProduct error:', err);
    }

    // Upsert to Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .upsert([{
            id: newProduct.id,
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
            created_at: newProduct.created_at,
            updated_at: newProduct.updated_at,
          }])
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as Product;
        }
      } catch (err) {
        console.warn('Supabase createProduct error:', err);
      }
    }

    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const current = getCachedProducts();
    const idx = current.findIndex(p => p.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {}
    }

    // 1. Try server API first
    try {
      const res = await fetch(`/api/products/${id}?_t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(updates),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverProd = await res.json();
        if (serverProd) {
          return serverProd;
        }
      }
    } catch (err) {
      console.warn('Server API updateProduct error:', err);
    }

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
          .maybeSingle();

        if (!error && data) {
          return data as Product;
        }
      } catch (err) {
        console.warn('Supabase updateProduct error:', err);
      }
    }

    return idx !== -1 ? current[idx] : null;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const current = getCachedProducts();
    const filtered = current.filter(p => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {}

    // 1. Try server API first
    try {
      const res = await fetch(`/api/products/${id}?_t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return true;
      }
    } catch (err) {
      console.warn('Server API deleteProduct error:', err);
    }

    if (supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deleteProduct error:', err);
      }
    }

    return true;
  },

  async uploadProductImage(file: File): Promise<string | null> {
    // 1. If Supabase is configured, try Supabase Storage first for a permanent public CDN URL
    if (supabase) {
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          if (data?.publicUrl) return data.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase storage upload error:', err);
      }
    }

    // 2. Read and compress image with Canvas to lightweight base64 (~50-80KB)
    // This works on ALL devices, Cloudflare Pages, mobile, desktop, with ZERO 404s!
    const base64Data: string = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const isPng = file.type.includes('png');
            resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.85));
            return;
          }
          resolve(e.target?.result as string || '');
        };
        img.onerror = () => resolve(e.target?.result as string || '');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    if (!base64Data) return null;

    // 3. Try server API upload if running on localhost Node server
    const isStaticHost = typeof window !== 'undefined' &&
      (window.location.hostname.includes('pages.dev') || window.location.hostname.includes('github.io'));

    if (!isStaticHost) {
      try {
        const res = await fetch(`/api/upload?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ data: base64Data, filename: file.name }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data?.url) return data.url;
        }
      } catch (err) {
        console.warn('Server upload error, using compressed base64:', err);
      }
    }

    // Self-contained data URL is universal and never returns 404 on mobile or Cloudflare!
    return base64Data;
  },
};
