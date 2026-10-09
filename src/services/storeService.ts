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
    // 1. Try server API first (primary sync across devices)
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
        return data as StoreSetting;
      }
    } catch {
      // offline or server not ready
    }

    // 2. Try Supabase if configured
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
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

    // Update server API for all devices
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: isOpen, updated_by: updatedBy || null }),
      });
      if (res.ok) {
        const serverData = await res.json();
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(serverData));
        return serverData;
      }
    } catch (err) {
      console.warn('Server API store update error:', err);
    }

    if (supabase) {
      try {
        const { data } = await supabase
          .from('store_settings')
          .update({
            is_open: isOpen,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || null,
          })
          .eq('id', current.id)
          .select()
          .single();

        if (data) {
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

    // Sync to server API
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      if (res.ok) {
        const serverData = await res.json();
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(serverData));
        return serverData;
      }
    } catch (err) {
      console.warn('Server API store update error:', err);
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
    let sseSource: EventSource | null = null;
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        sseSource = new EventSource('/api/events');
        sseSource.addEventListener('STORE_STATUS_CHANGED', (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.data) {
              localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(parsed.data));
              callback(parsed.data);
            }
          } catch {}
        });
      } catch (err) {
        console.warn('SSE connection failed:', err);
      }
    }

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

    // 3. Fallback polling every 5s if tab is active (ensures devices without SSE keep sync)
    const interval = setInterval(async () => {
      const latest = await storeService.getSettings();
      callback(latest);
    }, 5000);

    return () => {
      if (sseSource) {
        sseSource.close();
      }
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
