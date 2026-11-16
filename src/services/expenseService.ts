import { supabase, getSessionClient } from '../lib/supabase';
import {
  ExpenseCategory,
  ExpenseFormPayload,
  ExpensePaymentMode,
  ExpenseStatusFilter,
  ExpenseSummaryKPIs,
  HallExpense,
} from '../types/expenses';
import { isSessionExpiredError, handleSessionExpired } from '../lib/apiErrors';

export interface GetHallExpensesParams {
  hallId: string;
  startDate?: string;
  endDate?: string;
  category?: ExpenseCategory | 'ALL';
  status?: ExpenseStatusFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GetHallExpensesResult {
  expenses: HallExpense[];
  totalCount: number;
  kpis: ExpenseSummaryKPIs;
}

export interface BookingAllocationOption {
  id: string | null;
  label: string;
  subLabel: string;
}

export interface AllocatableBooking {
  id: string;
  eventType: string;
  customerName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  slot: 'morning' | 'evening' | 'full_day' | string;
  expectedGuests?: number;
}

/**
 * Fetches expenses for a hall with filtering, search, and KPI calculations.
 */
export async function getHallExpenses(
  params: GetHallExpensesParams,
  onSessionExpired?: () => void
): Promise<GetHallExpensesResult> {
  try {
    const client = await getSessionClient();

    let query = client
      .from('hall_expenses')
      .select(
        `
        id,
        hall_id,
        booking_id,
        title,
        category,
        amount,
        payment_mode,
        expense_date,
        payee_name,
        receipt_url,
        notes,
        recorded_by,
        created_at,
        updated_at,
        bookings:booking_id (
          id,
          event_type,
          start_date,
          customers:customer_id (
            name
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('hall_id', params.hallId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.startDate) {
      query = query.gte('expense_date', params.startDate);
    }
    if (params.endDate) {
      query = query.lte('expense_date', params.endDate);
    }
    if (params.category && params.category !== 'ALL') {
      query = query.eq('category', params.category);
    }
    if (params.status === 'Pending') {
      query = query.eq('payment_mode', 'credit');
    } else if (params.status === 'Event') {
      query = query.not('booking_id', 'is', null);
    } else if (params.status === 'Upkeep') {
      query = query.is('booking_id', null);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`title.ilike.${term},payee_name.ilike.${term},notes.ilike.${term}`);
    }

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 100;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
      }
      console.warn('[ExpenseService] Error fetching expenses:', error);
      throw error;
    }

    const expenses = (data || []) as unknown as HallExpense[];

    // Calculate aggregated KPIs for the retrieved date scope
    let totalSpend = 0;
    let paidSpend = 0;
    let pendingSpend = 0;
    let pendingCount = 0;
    const categoryTotals: Record<ExpenseCategory, number> = {
      diesel_fuel: 0,
      utilities: 0,
      maintenance: 0,
      vendor_payout: 0,
      staff_salary: 0,
      supplies: 0,
      other: 0,
    };

    expenses.forEach(e => {
      const amt = Number(e.amount) || 0;
      totalSpend += amt;
      if (e.payment_mode === 'credit') {
        pendingSpend += amt;
        pendingCount += 1;
      } else {
        paidSpend += amt;
      }
      if (categoryTotals[e.category] !== undefined) {
        categoryTotals[e.category] += amt;
      } else {
        categoryTotals.other += amt;
      }
    });

    return {
      expenses,
      totalCount: count ?? expenses.length,
      kpis: {
        totalSpend,
        paidSpend,
        pendingSpend,
        pendingCount,
        categoryTotals,
      },
    };
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Records a new hall expense. Usable by both Owner and Staff.
 */
export async function recordExpense(
  hallId: string,
  memberId: string | null | undefined,
  payload: ExpenseFormPayload,
  onSessionExpired?: () => void
): Promise<HallExpense> {
  try {
    const client = await getSessionClient();

    const insertData: any = {
      hall_id: hallId,
      booking_id: payload.bookingId || null,
      title: payload.title.trim(),
      category: payload.category,
      amount: Math.max(0.01, Number(payload.amount) || 0),
      payment_mode: payload.paymentMode,
      expense_date: payload.expenseDate || new Date().toISOString().split('T')[0],
      payee_name: payload.payeeName?.trim() || null,
      notes: payload.notes?.trim() || null,
      receipt_url: payload.receiptUrl || null,
    };

    if (memberId) {
      insertData.recorded_by = memberId;
    }

    const { data, error } = await client
      .from('hall_expenses')
      .insert(insertData)
      .select(
        `
        id,
        hall_id,
        booking_id,
        title,
        category,
        amount,
        payment_mode,
        expense_date,
        payee_name,
        receipt_url,
        notes,
        recorded_by,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
      }
      console.error('[ExpenseService] Error recording expense:', error);
      throw error;
    }

    return data as HallExpense;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Updates an existing hall expense.
 */
export async function updateExpense(
  expenseId: string,
  payload: Partial<ExpenseFormPayload>,
  onSessionExpired?: () => void
): Promise<HallExpense> {
  try {
    const client = await getSessionClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updateData.title = payload.title.trim();
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.amount !== undefined) updateData.amount = Math.max(0.01, Number(payload.amount) || 0);
    if (payload.paymentMode !== undefined) updateData.payment_mode = payload.paymentMode;
    if (payload.expenseDate !== undefined) updateData.expense_date = payload.expenseDate;
    if (payload.bookingId !== undefined) updateData.booking_id = payload.bookingId || null;
    if (payload.payeeName !== undefined) updateData.payee_name = payload.payeeName?.trim() || null;
    if (payload.notes !== undefined) updateData.notes = payload.notes?.trim() || null;
    if (payload.receiptUrl !== undefined) updateData.receipt_url = payload.receiptUrl || null;

    const { data, error } = await client
      .from('hall_expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select(
        `
        id,
        hall_id,
        booking_id,
        title,
        category,
        amount,
        payment_mode,
        expense_date,
        payee_name,
        receipt_url,
        notes,
        recorded_by,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
      }
      console.error('[ExpenseService] Error updating expense:', error);
      throw error;
    }

    return data as HallExpense;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Deletes an expense. (Owner only via RLS).
 */
export async function deleteExpense(
  expenseId: string,
  onSessionExpired?: () => void
): Promise<boolean> {
  try {
    const client = await getSessionClient();

    const { error } = await client
      .from('hall_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
      }
      console.error('[ExpenseService] Error deleting expense:', error);
      throw error;
    }

    return true;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Subscribes to realtime Postgres updates on `hall_expenses` table.
 */
export function subscribeToHallExpenses(hallId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(`hall-expenses-${hallId}-${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hall_expenses',
        filter: `hall_id=eq.${hallId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetches confirmed and upcoming bookings for the Apple-style "Today + Upcoming" allocation menu.
 */
export async function fetchAllocatableBookings(
  hallId: string
): Promise<AllocatableBooking[]> {
  try {
    const client = await getSessionClient();

    const { data, error } = await client
      .from('bookings')
      .select('id, event_type, start_date, end_date, slot, expected_guests, customers:customer_id ( name )')
      .eq('hall_id', hallId)
      .neq('status', 'cancelled')
      .order('start_date', { ascending: true });

    if (error || !data) return [];

    return data.map((b: any) => ({
      id: b.id,
      eventType: b.event_type || 'Event',
      customerName: b.customers?.name || 'Customer',
      startDate: b.start_date,
      endDate: b.end_date || b.start_date,
      slot: b.slot || 'full_day',
      expectedGuests: b.expected_guests || 0,
    }));
  } catch (err) {
    console.warn('[ExpenseService] Failed to load allocatable bookings:', err);
    return [];
  }
}

/**
 * Fetches recent confirmed bookings for linking in the "Allocated To" dropdown (legacy compatibility).
 */
export async function fetchRecentBookingsForAllocation(
  hallId: string
): Promise<BookingAllocationOption[]> {
  const bookings = await fetchAllocatableBookings(hallId);
  return bookings.map(b => ({
    id: b.id,
    label: `${b.eventType} (${b.customerName})`,
    subLabel: `${b.startDate} • ${b.customerName}`,
  }));
}

