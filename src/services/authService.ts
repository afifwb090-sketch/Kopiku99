import { supabase } from './supabase';
import { Profile, UserRole } from '../types/database';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  profile: Profile;
}

export interface StaffAccount {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  password?: string;
  role: UserRole;
  created_at: string;
}

const AUTH_STORAGE_KEY = 'k99_auth_user';
const STAFF_ACCOUNTS_KEY = 'k99_staff_accounts';

export const DEFAULT_ACCOUNTS: StaffAccount[] = [
  {
    id: 'staff-apep-001',
    username: 'Apep',
    email: 'apep@k99.id',
    full_name: 'Apep (Owner & Admin K99)',
    password: 'Delasika013',
    role: 'owner', // Owner has All Akses
    created_at: new Date().toISOString(),
  },
];

export const getStoredStaffAccounts = (): StaffAccount[] => {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STAFF_ACCOUNTS_KEY);
    if (raw) {
      const parsed: StaffAccount[] = JSON.parse(raw);
      // Ensure Apep account always exists
      const hasApep = parsed.some(a => a.username.toLowerCase() === 'apep');
      if (!hasApep) {
        parsed.unshift(DEFAULT_ACCOUNTS[0]);
        localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading staff accounts:', e);
  }
  localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  return DEFAULT_ACCOUNTS;
};

export const authService = {
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading auth state:', e);
    }
    return null;
  },

  async login(usernameOrEmail: string, password: string): Promise<{ user: AuthUser | null; error?: string }> {
    const trimmedInput = usernameOrEmail.trim().toLowerCase();

    // 1. Try Supabase Auth if connected & contains @
    if (supabase && trimmedInput.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedInput,
          password,
        });

        if (!error && data.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const role: UserRole = (profileData?.role as UserRole) || 'cashier';
          const full_name = profileData?.full_name || data.user.user_metadata?.full_name || trimmedInput.split('@')[0];

          const userObj: AuthUser = {
            id: data.user.id,
            email: data.user.email || trimmedInput,
            username: trimmedInput.split('@')[0],
            profile: {
              id: data.user.id,
              full_name,
              role,
              created_at: data.user.created_at,
              updated_at: new Date().toISOString(),
            },
          };

          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));
          return { user: userObj };
        }
      } catch (err: any) {
        console.warn('Supabase auth attempt error:', err);
      }
    }

    // 2. Check local registered staff accounts (including default Apep : Delasika013)
    const staffAccounts = getStoredStaffAccounts();
    const matched = staffAccounts.find(
      acc =>
        (acc.username.toLowerCase() === trimmedInput || (acc.email && acc.email.toLowerCase() === trimmedInput)) &&
        acc.password === password
    );

    if (matched) {
      const userObj: AuthUser = {
        id: matched.id,
        email: matched.email || `${matched.username.toLowerCase()}@k99.id`,
        username: matched.username,
        profile: {
          id: matched.id,
          full_name: matched.full_name,
          role: matched.role,
          created_at: matched.created_at,
          updated_at: new Date().toISOString(),
        },
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));
      return { user: userObj };
    }

    return { user: null, error: 'Username atau kata sandi salah. Silakan periksa kembali.' };
  },

  async logout(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase logout error:', err);
      }
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  hasRole(requiredRoles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    // Owner always has access to all features
    if (user.profile.role === 'owner') return true;
    return requiredRoles.includes(user.profile.role);
  },

  async getStaffList(): Promise<Profile[]> {
    if (supabase) {
      try {
        const { data } = await supabase.from('profiles').select('*');
        if (data && data.length > 0) return data as Profile[];
      } catch (err) {}
    }

    const accounts = getStoredStaffAccounts();
    return accounts.map(a => ({
      id: a.id,
      full_name: a.full_name,
      role: a.role,
      created_at: a.created_at,
      updated_at: a.created_at,
    }));
  },

  getStaffAccounts(): StaffAccount[] {
    return getStoredStaffAccounts();
  },

  async createStaffAccount(account: {
    username: string;
    full_name: string;
    password: string;
    role: UserRole;
    email?: string;
  }): Promise<StaffAccount> {
    const current = getStoredStaffAccounts();
    const cleanUsername = account.username.trim();

    if (current.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase())) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan.`);
    }

    const newStaff: StaffAccount = {
      id: 'staff-' + Math.random().toString(36).substring(2, 9),
      username: cleanUsername,
      email: account.email?.trim() || `${cleanUsername.toLowerCase()}@k99.id`,
      full_name: account.full_name.trim(),
      password: account.password,
      role: account.role,
      created_at: new Date().toISOString(),
    };

    const updated = [...current, newStaff];
    localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(updated));

    if (supabase) {
      try {
        await supabase.from('profiles').insert([{
          id: newStaff.id,
          full_name: newStaff.full_name,
          role: newStaff.role,
        }]);
      } catch (e) {}
    }

    return newStaff;
  },

  async deleteStaffAccount(id: string): Promise<boolean> {
    const current = getStoredStaffAccounts();
    const target = current.find(a => a.id === id);
    if (target && target.username.toLowerCase() === 'apep') {
      throw new Error('Akun default Apep tidak dapat dihapus.');
    }

    const filtered = current.filter(a => a.id !== id);
    localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(filtered));

    if (supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (e) {}
    }

    return true;
  },

  async updateStaffRole(id: string, role: UserRole): Promise<boolean> {
    const current = getStoredStaffAccounts();
    const idx = current.findIndex(a => a.id === id);
    if (idx !== -1) {
      current[idx].role = role;
      localStorage.setItem(STAFF_ACCOUNTS_KEY, JSON.stringify(current));

      if (supabase) {
        try {
          await supabase.from('profiles').update({ role }).eq('id', id);
        } catch (e) {}
      }
      return true;
    }
    return false;
  },
};
