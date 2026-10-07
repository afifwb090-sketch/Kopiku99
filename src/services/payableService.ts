import { supabase } from './supabase';
import { Payable } from '../types/database';
import { INITIAL_PAYABLES } from './mockData';

const PAYABLES_KEY = 'k99_payables';

export const getCachedPayables = (): Payable[] => {
  if (typeof window === 'undefined') return INITIAL_PAYABLES;
  try {
    const raw = localStorage.getItem(PAYABLES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading payables cache:', e);
  }
  localStorage.setItem(PAYABLES_KEY, JSON.stringify(INITIAL_PAYABLES));
  return INITIAL_PAYABLES;
};

export const payableService = {
  async getPayables(status?: 'unpaid' | 'partial' | 'paid'): Promise<Payable[]> {
    if (supabase) {
      try {
        let query = supabase.from('payables').select('*').order('due_date', { ascending: true });
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          localStorage.setItem(PAYABLES_KEY, JSON.stringify(data));
          return data as Payable[];
        }
      } catch (err) {
        console.warn('Supabase getPayables error:', err);
      }
    }

    let list = getCachedPayables();
    if (status) list = list.filter(p => p.status === status);
    return list;
  },

  async createPayable(input: Omit<Payable, 'id' | 'created_at' | 'updated_at'>): Promise<Payable> {
    const newPayable: Payable = {
      ...input,
      id: 'pay-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payables')
          .insert([input])
          .select()
          .single();
        if (!error && data) return data as Payable;
      } catch (err) {
        console.warn('Supabase createPayable error:', err);
      }
    }

    const current = getCachedPayables();
    const updated = [newPayable, ...current];
    localStorage.setItem(PAYABLES_KEY, JSON.stringify(updated));
    return newPayable;
  },

  async updatePayable(id: string, updates: Partial<Payable>): Promise<Payable | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payables')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as Payable;
      } catch (err) {
        console.warn('Supabase updatePayable error:', err);
      }
    }

    const current = getCachedPayables();
    const idx = current.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updated = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
      current[idx] = updated;
      localStorage.setItem(PAYABLES_KEY, JSON.stringify(current));
      return updated;
    }
    return null;
  },

  async recordPayment(id: string, paymentAmount: number): Promise<Payable | null> {
    const list = getCachedPayables();
    const target = list.find(p => p.id === id);
    if (!target) return null;

    const newPaid = Math.min(target.total_amount, Number(target.paid_amount || 0) + Number(paymentAmount));
    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newPaid >= target.total_amount) {
      newStatus = 'paid';
    } else if (newPaid > 0) {
      newStatus = 'partial';
    }

    return this.updatePayable(id, {
      paid_amount: newPaid,
      status: newStatus,
    });
  },

  async deletePayable(id: string): Promise<boolean> {
    if (supabase) {
      try {
        const { error } = await supabase.from('payables').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deletePayable error:', err);
      }
    }

    const current = getCachedPayables();
    localStorage.setItem(PAYABLES_KEY, JSON.stringify(current.filter(p => p.id !== id)));
    return true;
  },
};
