import { supabase, getSessionClient } from '../lib/supabase';
import {
  DashboardYearKPIs,
  DashboardDueCardItem,
  DashboardTimelineRowItem,
} from '../types/dashboard';
import { formatLocalDate, parseLocalDate } from '../utils/dateUtils';
import { BookingSlot } from '../types/calendar';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Compact Indian currency formatter.
 * Formats: ₹18.4L, ₹3.45L, ₹85k, ₹500, ₹0
 */
export function formatCompactCurrency(amount: number, symbol: string = '₹'): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return `${symbol}0`;
  }

  const abs = Math.abs(amount);

  // Crores (>= 1,00,00,000)
  if (abs >= 10000000) {
    const cr = (amount / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
    return `${symbol}${cr}Cr`;
  }

  // Lakhs (>= 1,00,000)
  if (abs >= 100000) {
    const lk = (amount / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
    return `${symbol}${lk}L`;
  }

  // Thousands (>= 1,000)
  if (abs >= 1000) {
    const k = (amount / 1000).toFixed(1).replace(/\.0$/, '');
    return `${symbol}${k}k`;
  }

  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Formats a payment timeline amount with leading + sign matching HTML mockup (e.g. +₹60,000)
 */
export function formatPaymentTimelineAmount(amount: number, symbol: string = '₹'): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return `+${symbol}0`;
  }
  return `+${symbol}${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Formats a local date (YYYY-MM-DD) into display string, e.g. "04 Nov"
 */
function formatDisplayDayMonth(dateStr: string): string {
  try {
    const d = parseLocalDate(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES_SHORT[d.getMonth()];
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
}

/**
 * Fetches and aggregates operational KPIs for "This Year" (Jan 1 to Dec 31 of current calendar year).
 * Queries PostgreSQL view `booking_financial_summaries`.
 */
export async function fetchDashboardYearKPIs(
  hallId?: string,
  targetYear?: number
): Promise<DashboardYearKPIs> {
  const currentYear = targetYear || new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  const todayStr = formatLocalDate(new Date());

  try {
    const client = await getSessionClient();
    let query = client
      .from('booking_financial_summaries')
      .select('*')
      .gte('start_date', startDate)
      .lte('start_date', endDate);

    if (hallId) {
      query = query.eq('hall_id', hallId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.warn('[DashboardService] fetchDashboardYearKPIs error:', error);
      throw error;
    }

    const list = bookings || [];

    let expectedRevenue = 0;
    let expectedBookingsCount = 0;
    let collectedRevenue = 0;
    let pendingDueAmount = 0;
    let pendingDueCount = 0;
    let overdueCount = 0;
    let upcomingDueCount = 0;
    let completedCount = 0;
    let upcomingCount = 0;

    list.forEach((b: any) => {
      if (b.status === 'cancelled') {
        return; // Exclude cancelled contracts from operational expected totals
      }

      const contract = Number(b.total_contract_amount) || 0;
      const paid = Number(b.total_paid) || 0;
      const due = Number(b.pending_balance) || 0;
      const bStartDate = String(b.start_date || '');

      expectedRevenue += contract;
      expectedBookingsCount += 1;
      collectedRevenue += paid;

      if (due > 0) {
        pendingDueAmount += due;
        pendingDueCount += 1;
        if (bStartDate < todayStr) {
          overdueCount += 1;
        } else {
          upcomingDueCount += 1;
        }
      }

      if (b.status === 'confirmed') {
        if (bStartDate <= todayStr) {
          completedCount += 1;
        } else {
          upcomingCount += 1;
        }
      }
    });

    // Guard against division by zero
    const collectionRate =
      expectedRevenue > 0 ? Math.round((collectedRevenue / expectedRevenue) * 100) : 0;

    // Subtitle formatting for Pending Due (concise single-line per design-system.md)
    const pendingSub =
      pendingDueCount > 0 ? `${pendingDueCount} Unpaid →` : 'All Settled ✓';

    return {
      expectedRevenue,
      expectedBookingsCount,
      collectedRevenue,
      collectionRate,
      pendingDueAmount,
      pendingDueCount,
      overdueCount,
      upcomingDueCount,
      completedCount,
      upcomingCount,
      formatted: {
        expectedRevenue: formatCompactCurrency(expectedRevenue),
        expectedBookings: `${expectedBookingsCount} Bookings`,
        collectedRevenue: formatCompactCurrency(collectedRevenue),
        collectedPercentage: `${collectionRate}% Paid`,
        pendingDue: formatCompactCurrency(pendingDueAmount),
        pendingSub,
        completedCount: String(completedCount),
        upcomingCount: `${upcomingCount} Upcoming`,
      },
    };
  } catch (err) {
    console.warn('[DashboardService] Fallback to empty year KPIs due to error:', err);
    return {
      expectedRevenue: 0,
      expectedBookingsCount: 0,
      collectedRevenue: 0,
      collectionRate: 0,
      pendingDueAmount: 0,
      pendingDueCount: 0,
      overdueCount: 0,
      upcomingDueCount: 0,
      completedCount: 0,
      upcomingCount: 0,
      formatted: {
        expectedRevenue: '₹0',
        expectedBookings: '0 Bookings',
        collectedRevenue: '₹0',
        collectedPercentage: '0% Paid',
        pendingDue: '₹0',
        pendingSub: 'All Settled ✓',
        completedCount: '0',
        upcomingCount: '0 Upcoming',
      },
    };
  }
}

/**
 * Fetches active confirmed bookings with pending dues for the carousel.
 * Prioritizes overdue bookings first (`start_date < today`), followed by upcoming dues.
 */
export async function fetchDashboardPendingDues(
  hallId?: string,
  limit: number = 20
): Promise<DashboardDueCardItem[]> {
  const todayStr = formatLocalDate(new Date());

  try {
    const client = await getSessionClient();
    let query = client
      .from('booking_financial_summaries')
      .select('*')
      .eq('status', 'confirmed')
      .gt('pending_balance', 0)
      .order('start_date', { ascending: true })
      .limit(limit);

    if (hallId) {
      query = query.eq('hall_id', hallId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[DashboardService] fetchDashboardPendingDues error:', error);
      throw error;
    }

    const rawList = (data || []) as any[];

    // Map each row to UI item
    const mapped: DashboardDueCardItem[] = rawList.map(b => {
      const bStartDate = String(b.start_date || '');
      const isOverdue = bStartDate < todayStr;
      const rawDue = Number(b.pending_balance) || 0;
      const contract = Number(b.total_contract_amount) || 0;
      const paid = Number(b.total_paid) || 0;

      return {
        id: b.booking_id,
        bookingId: b.booking_id,
        customerName: b.customer_name || 'Customer',
        eventType: b.event_type || 'Function',
        eventDate: formatDisplayDayMonth(bStartDate),
        rawDate: bStartDate,
        dueAmount: `₹${rawDue.toLocaleString('en-IN')}`,
        rawDue,
        status: isOverdue ? 'Overdue' : 'Upcoming',
        phone: b.customer_mobile || '',
        totalContract: `₹${contract.toLocaleString('en-IN')}`,
        advancePaid: `₹${paid.toLocaleString('en-IN')}`,
        slot: (b.slot as BookingSlot) || 'full_day',
      };
    });

    // Sort: Overdues first, then upcoming
    mapped.sort((a, b) => {
      if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
      if (a.status !== 'Overdue' && b.status === 'Overdue') return 1;
      return a.rawDate.localeCompare(b.rawDate);
    });

    return mapped;
  } catch (err) {
    console.warn('[DashboardService] Failed to load pending dues:', err);
    return [];
  }
}

/**
 * Fetches recent completed timeline items (functions concluded and payments recorded).
 */
export async function fetchDashboardTimeline(
  hallId?: string,
  limit: number = 10
): Promise<DashboardTimelineRowItem[]> {
  const todayStr = formatLocalDate(new Date());

  try {
    const client = await getSessionClient();

    // 1. Fetch completed bookings (event passed)
    let bookingsQuery = client
      .from('booking_financial_summaries')
      .select('*')
      .eq('status', 'confirmed')
      .lte('start_date', todayStr)
      .order('start_date', { ascending: false })
      .limit(limit);

    if (hallId) {
      bookingsQuery = bookingsQuery.eq('hall_id', hallId);
    }

    const { data: bookingsData } = await bookingsQuery;

    const items: DashboardTimelineRowItem[] = [];

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    (bookingsData || []).forEach((b: any) => {
      const formattedDate = formatDisplayDayMonth(b.start_date);
      const isToday = b.start_date === todayStr;
      let weekdayLabel = 'Done';
      if (b.start_date) {
        const parts = String(b.start_date).split('-');
        if (parts.length === 3) {
          const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (!isNaN(dt.getTime())) {
            weekdayLabel = WEEKDAYS[dt.getDay()];
          }
        }
      }

      const pendingBal = Number(b.pending_balance) || 0;
      const isPaid = pendingBal <= 0;
      const derivedBill = b.bill_number || `RPC-${String(b.booking_id).slice(0, 4).toUpperCase()}`;

      items.push({
        id: `event_${b.booking_id}`,
        bookingId: b.booking_id,
        timeLabel: `${isToday ? 'Today' : formattedDate} ${weekdayLabel}`,
        primaryTime: isToday ? 'Today' : formattedDate,
        secondaryTime: weekdayLabel,
        title: b.customer_name || `${b.event_type || 'Event'} Completed`,
        subtitle: `${b.event_type || 'Event'} • ${isPaid ? 'Paid' : 'Pending'}`,
        category: 'events',
        billNumber: isPaid ? derivedBill : (b.bill_number || undefined),
        dueAmountText: !isPaid ? `${formatCompactCurrency(pendingBal)} Due` : undefined,
        amount: b.total_contract_amount
          ? `₹${Number(b.total_contract_amount).toLocaleString('en-IN')}`
          : undefined,
      });
    });

    return items;
  } catch (err) {
    console.warn('[DashboardService] Failed to load timeline:', err);
    return [];
  }
}

