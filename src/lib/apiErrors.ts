import { Alert } from 'react-native';
import { supabase, SecureStorage, AURA_DEVICE_SESSION_TOKEN_KEY } from './supabase';

export interface ApiError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Checks if the given PostgreSQL error indicates that the session token
 * has been invalidated by another phone logging into the same account.
 * (PostgreSQL Error Code 28000: invalid_authorization_specification)
 */
export function isSessionExpiredError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === '28000' ||
    (typeof error.message === 'string' &&
      error.message.toLowerCase().includes('logged in on another device'))
  );
}

/**
 * Checks if the hall subscription or grace period is suspended.
 * (PostgreSQL Error Code 55000: object_not_in_prerequisite_state)
 */
export function isHallSuspendedError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === '55000' ||
    (typeof error.message === 'string' &&
      error.message.toLowerCase().includes('suspended'))
  );
}

/**
 * Global handler for Session Invalidation:
 * 1. Purges local device session token.
 * 2. Signs out of Supabase auth.
 * 3. Alerts the user with a clear security notice.
 * 4. Calls callback to reset UI navigation to Login.
 */
export async function handleSessionExpired(onReset?: () => void) {
  try {
    await SecureStorage.removeItem(AURA_DEVICE_SESSION_TOKEN_KEY);
    await supabase.auth.signOut();
  } catch {}

  Alert.alert(
    'Session Expired',
    'You have logged in on another device. This device has been signed out.',
    [{ text: 'Sign In', onPress: () => onReset?.() }]
  );
}

