import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SyncStatus = 'connected' | 'connecting' | 'disconnected';

/**
 * Custom hook that listens to live PostgreSQL changes via Supabase Realtime
 * for bookings and payments in the current hall.
 */
export function useRealtimeCalendar(
  hallId?: string | null,
  onCalendarChange?: () => void
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const callbackRef = useRef(onCalendarChange);

  // Keep callback ref fresh without triggering effect re-execution
  useEffect(() => {
    callbackRef.current = onCalendarChange;
  }, [onCalendarChange]);

  useEffect(() => {
    if (!hallId) {
      setSyncStatus('disconnected');
      return;
    }

    setSyncStatus('connecting');

    // Instance-unique channel ID prevents collision across concurrent screens (Dashboard + Calendar)
    const instanceId = Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel(`hall-calendar-${hallId}-${instanceId}`)
      // 1. Listen for Booking changes (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `hall_id=eq.${hallId}`,
        },
        () => {
          callbackRef.current?.();
        }
      )
      // 2. Listen for Payment changes (INSERT for new payment or reversal)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `hall_id=eq.${hallId}`,
        },
        () => {
          callbackRef.current?.();
        }
      )
      // 3. Listen for Hall settings changes (slot mode, operational hours, hall name, bill prefix)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'halls',
          filter: `id=eq.${hallId}`,
        },
        () => {
          callbackRef.current?.();
        }
      )
      // 4. Listen for customer extra charges changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_extra_charges',
          filter: `hall_id=eq.${hallId}`,
        },
        () => {
          callbackRef.current?.();
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('disconnected');
        } else {
          setSyncStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hallId]);

  return { syncStatus };
}

