import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration can come from environment variables or custom local storage settings
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('k99_custom_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('k99_custom_supabase_key') : null;

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('http') &&
    anonKey !== 'your-anon-public-key' &&
    !url.includes('your-project-id')
  );

  return { url, anonKey, isConfigured };
};

const config = getSupabaseConfig();

export let supabase: SupabaseClient | null = null;

if (config.isConfigured) {
  try {
    supabase = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabase = null;
  }
}

export const reinitializeSupabase = (newUrl?: string, newKey?: string) => {
  if (typeof window !== 'undefined') {
    if (newUrl) localStorage.setItem('k99_custom_supabase_url', newUrl.trim());
    if (newKey) localStorage.setItem('k99_custom_supabase_key', newKey.trim());
  }
  const current = getSupabaseConfig();
  if (current.isConfigured) {
    supabase = createClient(current.url, current.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return true;
  }
  return false;
};
