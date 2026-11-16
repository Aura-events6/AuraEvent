import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let NativeSecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  try {
    NativeSecureStore = require('expo-secure-store');
  } catch {}
}

export const AURA_DEVICE_SESSION_TOKEN_KEY = 'aura_device_session_token';
export const AURA_HAS_PIN_KEY = 'aura_has_pin';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gsfaukkgknjdkzhzgdck.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZmF1a2tna25qZGt6aHpnZGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMjU3NzksImV4cCI6MjEwOTgwMTc3OX0.wb5GV76wi5rjGDRkbucQhoVXCu-U-DeSQXjHE6YXw1Y';

/**
 * Safe local storage reader for web environments without requiring DOM types
 */
const getWebStorage = () => {
  try {
    const g = globalThis as any;
    if (g && g.localStorage) {
      return g.localStorage;
    }
  } catch {}
  return null;
};

/**
 * Cross-platform secure storage adapter.
 * Uses expo-secure-store on iOS/Android native and localStorage on Web.
 */
export const SecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        const storage = getWebStorage();
        return storage ? storage.getItem(key) : null;
      }
      return NativeSecureStore ? await NativeSecureStore.getItemAsync(key) : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        const storage = getWebStorage();
        if (storage) storage.setItem(key, value);
        return;
      }
      if (NativeSecureStore) await NativeSecureStore.setItemAsync(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        const storage = getWebStorage();
        if (storage) storage.removeItem(key);
        return;
      }
      if (NativeSecureStore) await NativeSecureStore.deleteItemAsync(key);
    } catch {}
  },
};

/**
 * Interceptor that dynamically adds the 'x-session-token' header to all outgoing fetch calls
 * for single-device session enforcement at the database level.
 */
const customFetch: typeof fetch = async (input, init = {}) => {
  const sessionToken = await SecureStorage.getItem(AURA_DEVICE_SESSION_TOKEN_KEY);
  if (!sessionToken) {
    return fetch(input, init);
  }

  let headers: Record<string, string> = {};
  if (init.headers) {
    if (typeof (init.headers as any).forEach === 'function') {
      (init.headers as any).forEach((val: string, key: string) => {
        headers[key] = val;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(entry => {
        if (entry && entry.length >= 2) {
          headers[entry[0]] = entry[1];
        }
      });
    } else {
      headers = { ...(init.headers as Record<string, string>) };
    }
  }

  if (!headers['x-session-token']) {
    headers['x-session-token'] = sessionToken;
  }

  return fetch(input, { ...init, headers });
};

/**
 * Default Supabase client configured with secure storage and single-device session headers.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});

/**
 * Helper to get an authenticated Supabase client explicitly configured with the
 * active device session token header.
 * 
 * Reuses the singleton supabase instance because `customFetch` already dynamically
 * reads and injects the active device session token (`x-session-token`) on every request.
 */
export async function getSessionClient() {
  return supabase;
}
