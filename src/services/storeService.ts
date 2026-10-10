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
    const cached = getCachedStoreSettings();

    // 1. Try server API first (primary sync across devices) with cache busting
    try {
      const res = await fetch(`/api/store?_t=${Date.now()}`, { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && typeof data.is_open === 'boolean') {
          // Check timestamp: don't overwrite if local cache was modified very recently (< 10s) and is newer
          const localTime = cached.updated_at ? new Date(cached.updated_at).getTime() : 0;
          const remoteTime = data.updated_at ? new Date(data.updated_at).getTime() : 0;
          if (localTime > remoteTime && Date.now() - localTime < 10000) {
            return cached;
          }
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
          return data as StoreSetting;
        }
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
          .maybeSingle();

        if (!error && data) {
          const localTime = cached.updated_at ? new Date(cached.updated_at).getTime() : 0;
          const remoteTime = data.updated_at ? new Date(data.updated_at).getTime() : 0;
          if (localTime > remoteTime && Date.now() - localTime < 10000) {
            return cached;
          }
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
          return data as StoreSetting;
        }
      } catch (err) {
        console.warn('Supabase store_settings connection failed:', err);
      }
    }

    return cached;
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
    try {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Broadcast across tabs/windows locally immediately
    if (realtimeBus) {
      realtimeBus.postMessage({ type: 'STORE_STATUS_CHANGED', data: updated });
    }

    // Update server API for devices running Node backend
    try {
      const res = await fetch(`/api/store?_t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ is_open: isOpen, updated_by: updatedBy || null }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverData = await res.json();
        if (serverData) {
          try {
            localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(serverData));
          } catch {}
          return serverData;
        }
      }
    } catch (err) {
      console.warn('Server API store update error:', err);
    }

    // Update Supabase with upsert so it never fails on ID mismatch
    if (supabase) {
      try {
        // Query the first row ID in Supabase if exists, to avoid mismatch
        const { data: existingRows } = await supabase.from('store_settings').select('id').limit(1);
        const rowId = existingRows?.[0]?.id || current.id || '00000000-0000-0000-0000-000000000001';

        const payload = {
          ...updated,
          id: rowId,
        };

        const { data, error } = await supabase
          .from('store_settings')
          .upsert(payload)
          .select()
          .maybeSingle();

        if (!error && data) {
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

    try {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    if (realtimeBus) {
      realtimeBus.postMessage({ type: 'STORE_STATUS_CHANGED', data: updated });
    }

    // Sync to server API with cache-busting
    try {
      const res = await fetch(`/api/store?_t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(info),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverData = await res.json();
        if (serverData) {
          try {
            localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(serverData));
          } catch {}
          return serverData;
        }
      }
    } catch (err) {
      console.warn('Server API store update error:', err);
    }

    // Upsert to Supabase
    if (supabase) {
      try {
        const { data: existingRows } = await supabase.from('store_settings').select('id').limit(1);
        const rowId = existingRows?.[0]?.id || current.id || '00000000-0000-0000-0000-000000000001';

        const payload = {
          ...updated,
          id: rowId,
        };

        const { data, error } = await supabase
          .from('store_settings')
          .upsert(payload)
          .select()
          .maybeSingle();

        if (!error && data) {
          localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(data));
          return data as StoreSetting;
        }
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

    // 1. Supabase Realtime channel setup helper
    let supabaseChannel: any = null;
    const setupSupabaseChannel = () => {
      if (supabaseChannel && supabase) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
        supabaseChannel = null;
      }
      if (supabase) {
        try {
          supabaseChannel = supabase
            .channel('public:store_settings_' + Math.random().toString(36).substring(2, 6))
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
    };

    setupSupabaseChannel();

    // Listen to credentials change event
    const handleSupaChange = () => {
      setupSupabaseChannel();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('k99_supabase_changed', handleSupaChange);
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

    // 3. Fallback polling every 5s
    const interval = setInterval(async () => {
      const latest = await storeService.getSettings();
      callback(latest);
    }, 5000);

    return () => {
      if (sseSource) {
        sseSource.close();
      }
      if (supabaseChannel && supabase) {
        try { supabase.removeChannel(supabaseChannel); } catch {}
      }
      if (realtimeBus) {
        realtimeBus.removeEventListener('message', handleBroadcast);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('k99_supabase_changed', handleSupaChange);
      }
      clearInterval(interval);
    };
  },
};
