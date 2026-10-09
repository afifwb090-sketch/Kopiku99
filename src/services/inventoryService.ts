import { supabase } from './supabase';
import { Ingredient, Recipe, StockMovement, MovementType, Order } from '../types/database';
import { INITIAL_INGREDIENTS } from './mockData';

const INGREDIENTS_KEY = 'k99_ingredients';
const RECIPES_KEY = 'k99_recipes';
const MOVEMENTS_KEY = 'k99_stock_movements';

export const getCachedIngredients = (): Ingredient[] => {
  if (typeof window === 'undefined') return INITIAL_INGREDIENTS;
  try {
    const raw = localStorage.getItem(INGREDIENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading ingredients cache:', e);
  }
  localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(INITIAL_INGREDIENTS));
  return INITIAL_INGREDIENTS;
};

export const inventoryService = {
  async getIngredients(): Promise<Ingredient[]> {
    try {
      const res = await fetch('/api/inventory/ingredients');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(data));
          return data as Ingredient[];
        }
      }
    } catch {}

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ingredients')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(data));
          return data as Ingredient[];
        }
      } catch (err) {
        console.warn('Supabase getIngredients error:', err);
      }
    }
    return getCachedIngredients();
  },

  async createIngredient(data: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>): Promise<Ingredient> {
    const newIngredient: Ingredient = {
      ...data,
      id: 'ing-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/inventory/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIngredient),
      });
      if (res.ok) {
        const serverIng = await res.json();
        const current = getCachedIngredients();
        localStorage.setItem(INGREDIENTS_KEY, JSON.stringify([...current, serverIng]));
        return serverIng;
      }
    } catch {}

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('ingredients')
          .insert([data])
          .select()
          .single();

        if (!error && inserted) {
          return inserted as Ingredient;
        }
      } catch (err) {
        console.warn('Supabase createIngredient error:', err);
      }
    }

    const current = getCachedIngredients();
    const updated = [...current, newIngredient];
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(updated));
    return newIngredient;
  },

  async updateIngredient(id: string, updates: Partial<Ingredient>): Promise<Ingredient | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ingredients')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return data as Ingredient;
      } catch (err) {
        console.warn('Supabase updateIngredient error:', err);
      }
    }

    const current = getCachedIngredients();
    const idx = current.findIndex(i => i.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(current));
      return current[idx];
    }
    return null;
  },

  async deleteIngredient(id: string): Promise<boolean> {
    if (supabase) {
      try {
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deleteIngredient error:', err);
      }
    }

    const current = getCachedIngredients();
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(current.filter(i => i.id !== id)));
    return true;
  },

  async getRecipes(): Promise<Recipe[]> {
    try {
      const res = await fetch('/api/inventory/recipes');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          localStorage.setItem(RECIPES_KEY, JSON.stringify(data));
          return data as Recipe[];
        }
      }
    } catch {}

    if (supabase) {
      try {
        const { data } = await supabase
          .from('recipes')
          .select('*, recipe_items(*, ingredients(name))');
        if (data) {
          return data.map((r: any) => ({
            ...r,
            items: (r.recipe_items || []).map((item: any) => ({
              ...item,
              ingredient_name: item.ingredients?.name,
            })),
          }));
        }
      } catch (err) {
        console.warn('Supabase getRecipes error:', err);
      }
    }

    try {
      const raw = localStorage.getItem(RECIPES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  },

  async saveRecipe(productId: string, items: Array<{ ingredient_id: string; quantity: number; unit: string }>): Promise<boolean> {
    const now = new Date().toISOString();
    const recipeId = 'rcp-' + productId;

    // Save to server API
    try {
      await fetch('/api/inventory/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, items }),
      });
    } catch {}

    const mappedItems = items.map((it) => ({
      id: 'rcp-item-' + Math.random().toString(36).substring(2, 9),
      recipe_id: recipeId,
      ingredient_id: it.ingredient_id,
      quantity: it.quantity,
      unit: it.unit,
    }));

    if (supabase) {
      try {
        // Upsert recipe
        const { data: recipe } = await supabase
          .from('recipes')
          .upsert({ product_id: productId, updated_at: now }, { onConflict: 'product_id' })
          .select()
          .single();

        if (recipe) {
          await supabase.from('recipe_items').delete().eq('recipe_id', recipe.id);
          await supabase.from('recipe_items').insert(
            items.map(it => ({
              recipe_id: recipe.id,
              ingredient_id: it.ingredient_id,
              quantity: it.quantity,
              unit: it.unit,
            }))
          );
          return true;
        }
      } catch (err) {
        console.warn('Supabase saveRecipe error:', err);
      }
    }

    let existing: Recipe[] = [];
    try {
      const raw = localStorage.getItem(RECIPES_KEY);
      if (raw) existing = JSON.parse(raw);
    } catch (e) {}

    const filtered = existing.filter(r => r.product_id !== productId);
    filtered.push({
      id: recipeId,
      product_id: productId,
      created_at: now,
      updated_at: now,
      items: mappedItems,
    });
    localStorage.setItem(RECIPES_KEY, JSON.stringify(filtered));
    return true;
  },

  async recordStockMovement(input: {
    ingredient_id: string;
    movement_type: MovementType;
    quantity: number;
    notes?: string;
    reference_type?: string;
    reference_id?: string;
    created_by?: string;
  }): Promise<StockMovement> {
    const movement: StockMovement = {
      id: 'mov-' + Math.random().toString(36).substring(2, 9),
      ingredient_id: input.ingredient_id,
      movement_type: input.movement_type,
      quantity: input.quantity,
      reference_type: input.reference_type || null,
      reference_id: input.reference_id || null,
      notes: input.notes || null,
      created_by: input.created_by || null,
      created_at: new Date().toISOString(),
    };

    // Update ingredient stock
    const ingredients = await this.getIngredients();
    const item = ingredients.find(i => i.id === input.ingredient_id);
    if (item) {
      let delta = input.quantity;
      if (input.movement_type === 'sale' || input.movement_type === 'waste') {
        delta = -Math.abs(input.quantity);
      } else if (input.movement_type === 'purchase' || input.movement_type === 'return') {
        delta = Math.abs(input.quantity);
      }
      const newStock = Math.max(0, Number(item.current_stock) + delta);
      await this.updateIngredient(input.ingredient_id, { current_stock: newStock });
    }

    if (supabase) {
      try {
        await supabase.from('stock_movements').insert([input]);
      } catch (err) {
        console.warn('Supabase recordStockMovement error:', err);
      }
    }

    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      const list: StockMovement[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([movement, ...list]));
    } catch (e) {}

    return movement;
  },

  async getStockMovements(): Promise<StockMovement[]> {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('stock_movements')
          .select('*, ingredients(name)')
          .order('created_at', { ascending: false });

        if (data) {
          return data.map((m: any) => ({
            ...m,
            ingredient_name: m.ingredients?.name,
          }));
        }
      } catch (err) {
        console.warn('Supabase getStockMovements error:', err);
      }
    }

    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  },

  async deductStockForOrder(order: Order): Promise<boolean> {
    if (order.stock_deducted) return false;
    if (!order.items || order.items.length === 0) return false;

    try {
      const recipes = await this.getRecipes();

      for (const item of order.items) {
        // Find recipe for this product
        const recipe = recipes.find(r => item.product_id && r.product_id === item.product_id);
        if (recipe && recipe.items && recipe.items.length > 0) {
          for (const rItem of recipe.items) {
            const qtyNeeded = Number(rItem.quantity) * Number(item.quantity);
            if (qtyNeeded > 0) {
              await this.recordStockMovement({
                ingredient_id: rItem.ingredient_id,
                movement_type: 'sale',
                quantity: qtyNeeded,
                reference_type: 'order',
                reference_id: order.id,
                notes: `Terjual di order ${order.order_number} (${item.quantity}× ${item.product_name})`,
                created_by: order.created_by || undefined,
              });
            }
          }
        }
      }

      order.stock_deducted = true;

      // Update in Supabase if enabled
      if (supabase) {
        try {
          await supabase.from('orders').update({ stock_deducted: true }).eq('id', order.id);
        } catch (e) {}
      }

      // Update in localStorage
      try {
        const raw = localStorage.getItem('k99_orders');
        if (raw) {
          const list: Order[] = JSON.parse(raw);
          const idx = list.findIndex(o => o.id === order.id);
          if (idx !== -1) {
            list[idx].stock_deducted = true;
            localStorage.setItem('k99_orders', JSON.stringify(list));
          }
        }
      } catch (e) {}

      return true;
    } catch (err) {
      console.error('Error during deductStockForOrder:', err);
      return false;
    }
  },

  async restoreStockForOrder(order: Order): Promise<boolean> {
    if (!order.stock_deducted) return false;

    try {
      const movements = await this.getStockMovements();
      const orderSales = movements.filter(
        m => m.reference_type === 'order' && m.reference_id === order.id && m.movement_type === 'sale'
      );

      if (orderSales.length > 0) {
        for (const sale of orderSales) {
          await this.recordStockMovement({
            ingredient_id: sale.ingredient_id,
            movement_type: 'return',
            quantity: sale.quantity,
            reference_type: 'order_cancelled',
            reference_id: order.id,
            notes: `Pengembalian stok pembatalan/penghapusan order ${order.order_number}`,
          });
        }
      } else {
        // Fallback using recipe lookup
        const recipes = await this.getRecipes();
        if (order.items) {
          for (const item of order.items) {
            const recipe = recipes.find(r => item.product_id && r.product_id === item.product_id);
            if (recipe && recipe.items) {
              for (const rItem of recipe.items) {
                const qtyToRestore = Number(rItem.quantity) * Number(item.quantity);
                if (qtyToRestore > 0) {
                  await this.recordStockMovement({
                    ingredient_id: rItem.ingredient_id,
                    movement_type: 'return',
                    quantity: qtyToRestore,
                    reference_type: 'order_cancelled',
                    reference_id: order.id,
                    notes: `Pengembalian stok pembatalan/penghapusan order ${order.order_number}`,
                  });
                }
              }
            }
          }
        }
      }

      order.stock_deducted = false;

      // Update in Supabase
      if (supabase) {
        try {
          await supabase.from('orders').update({ stock_deducted: false }).eq('id', order.id);
        } catch (e) {}
      }

      // Update in localStorage
      try {
        const raw = localStorage.getItem('k99_orders');
        if (raw) {
          const list: Order[] = JSON.parse(raw);
          const idx = list.findIndex(o => o.id === order.id);
          if (idx !== -1) {
            list[idx].stock_deducted = false;
            localStorage.setItem('k99_orders', JSON.stringify(list));
          }
        }
      } catch (e) {}

      return true;
    } catch (err) {
      console.error('Error restoring stock for order:', err);
      return false;
    }
  },
};
