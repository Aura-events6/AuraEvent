import { supabase, getSessionClient } from '../lib/supabase';
import { WeeklyCalendarResponse } from '../types/calendar';
import { isSessionExpiredError, handleSessionExpired } from '../lib/apiErrors';

/**
 * Fetches the master calendar for a given week (start_date to end_date).
 * Executes in a single database round-trip via PostgreSQL RPC get_weekly_calendar.
 */
export async function fetchWeeklyCalendar(
  startDateStr: string,
  endDateStr: string,
  onSessionExpired?: () => void
): Promise<WeeklyCalendarResponse | null> {
  try {
    const client = await getSessionClient();

    const { data, error } = await client.rpc('get_weekly_calendar', {
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    });

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        return null;
      }
      console.warn('[CalendarService] Error calling get_weekly_calendar:', error);
      throw error;
    }

    return data as WeeklyCalendarResponse;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
      return null;
    }
    throw err;
  }
}

