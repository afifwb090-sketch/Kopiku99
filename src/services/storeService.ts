import { supabase } from './supabase';
import { StoreSetting } from '../types/database';
import { INITIAL_STORE_SETTING } from './mockData';

const STORE_STORAGE_KEY = 'k99_store_settings';
const realtimeBus = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('k99_realtime_bus')
  : null;

// Initialize local cache if not set
export const getCachedStoreSettings = (): StoreSetting => {
  if (typeof window === 'undefined') return INITIAL_STORE_SETTING;
  try {
    const raw = localStorage.getItem(STORE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading store cache:', e);
  }
  localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(INITIAL_STORE_SETTING));
  return INITIAL_STORE_SETTING;
};

export const storeService = {
  async getSettings(): Promise<StoreSetting> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .limit(1)
          .single();

        if (error) {
          console.warn('Supabase store_settings query error, falling back:', error.message);
          return getCachedStoreSettings();
        }
        if (data) {
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
          return data as StoreSetting;
        }
      } catch (err) {
        console.warn('Supabase store_settings connection failed:', err);
      }
    }
    return getCachedStoreSettings();
  },

  async updateStatus(isOpen: boolean, updatedBy?: string): Promise<StoreSetting> {
    const current = getCachedStoreSettings();
    const updated: StoreSetting = {
      ...current,
      is_open: isOpen,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || null,
    };

    // Save to local cache first
    localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(updated));

    // Broadcast across tabs/windows locally immediately
    if (realtimeBus) {
      realtimeBus.postMessage({ type: 'STORE_STATUS_CHANGED', data: updated });
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .update({
            is_open: isOpen,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || null,
          })
          .eq('id', current.id)
          .select()
          .single();

        if (error) {
          console.warn('Supabase store_settings update failed:', error.message);
        } else if (data) {
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
          return data as StoreSetting;
        }
      } catch (err) {
        console.warn('Supabase store update error:', err);
      }
    }

    return updated;
  },

  async updateStoreInfo(info: Partial<StoreSetting>): Promise<StoreSetting> {
    const current = getCachedStoreSettings();
    const updated: StoreSetting = {
      ...current,
      ...info,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(updated));
    if (realtimeBus) {
      realtimeBus.postMessage({ type: 'STORE_STATUS_CHANGED', data: updated });
    }

    if (supabase) {
      try {
        const { data } = await supabase
          .from('store_settings')
          .update(info)
          .eq('id', current.id)
          .select()
          .single();
        if (data) return data as StoreSetting;
      } catch (err) {
        console.warn('Supabase store update error:', err);
      }
    }

    return updated;
  },

  subscribe(callback: (settings: StoreSetting) => void): () => void {
    // 1. Supabase Realtime channel
    let supabaseChannel: any = null;
    if (supabase) {
      try {
        supabaseChannel = supabase
          .channel('public:store_settings')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'store_settings' },
            (payload) => {
              if (payload.new) {
                const newSettings = payload.new as StoreSetting;
                localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(newSettings));
                callback(newSettings);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Failed to subscribe to Supabase store_settings:', err);
      }
    }

    // 2. BroadcastChannel for local/multi-tab sync
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'STORE_STATUS_CHANGED' && event.data?.data) {
        callback(event.data.data);
      }
    };
    if (realtimeBus) {
      realtimeBus.addEventListener('message', handleBroadcast);
    }

    // 3. Fallback polling every 5s if tab is active (resilient network guarantee)
    const interval = setInterval(async () => {
      const latest = await storeService.getSettings();
      callback(latest);
    }, 5000);

    return () => {
      if (supabaseChannel && supabase) {
        supabase.removeChannel(supabaseChannel);
      }
      if (realtimeBus) {
        realtimeBus.removeEventListener('message', handleBroadcast);
      }
      clearInterval(interval);
    };
  },
};
