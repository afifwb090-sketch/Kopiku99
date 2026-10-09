import { supabase } from './supabase';
import { Category } from '../types/database';
import { INITIAL_CATEGORIES } from './mockData';

const STORAGE_KEY = 'k99_categories';

export const getCachedCategories = (): Category[] => {
  if (typeof window === 'undefined') return INITIAL_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading category cache:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
  return INITIAL_CATEGORIES;
};

export const categoryService = {
  async getCategories(onlyActive = false): Promise<Category[]> {
    try {
      const res = await fetch(`/api/categories?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        let serverCats = (await res.json()) as Category[];
        if (serverCats && serverCats.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverCats));
          } catch {}
          return onlyActive ? serverCats.filter(c => c.is_active) : serverCats;
        }
      }
    } catch {}

    if (supabase) {
      try {
        let query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (onlyActive) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data as Category[];
        }
      } catch (err) {
        console.warn('Supabase getCategories error:', err);
      }
    }
    const cached = getCachedCategories();
    return onlyActive ? cached.filter(c => c.is_active) : cached;
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: 'cat-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });
      if (res.ok) {
        const serverCat = await res.json();
        const current = getCachedCategories();
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, serverCat]));
        return serverCat;
      }
    } catch {}

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert([category])
          .select()
          .single();
        if (!error && data) {
          return data as Category;
        }
      } catch (err) {
        console.warn('Supabase createCategory error:', err);
      }
    }

    const current = getCachedCategories();
    const updated = [...current, newCategory];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newCategory;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const serverCat = await res.json();
        const current = getCachedCategories();
        const idx = current.findIndex(c => c.id === id);
        if (idx !== -1) {
          current[idx] = serverCat;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        }
        return serverCat;
      }
    } catch {}

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          return data as Category;
        }
      } catch (err) {
        console.warn('Supabase updateCategory error:', err);
      }
    }

    const current = getCachedCategories();
    const idx = current.findIndex(c => c.id === id);
    if (idx !== -1) {
      const updatedItem = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
      current[idx] = updatedItem;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return updatedItem;
    }
    return null;
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const current = getCachedCategories();
        const filtered = current.filter(c => c.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
      }
    } catch {}

    if (supabase) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deleteCategory error:', err);
      }
    }

    const current = getCachedCategories();
    const filtered = current.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },
};
