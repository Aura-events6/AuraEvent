import { supabase } from '../lib/supabase';
import { isSessionExpiredError, handleSessionExpired } from '../lib/apiErrors';
import {
  CreateBookingParams,
  CreateBookingResponse,
  EditBookingParams,
  EditBookingResponse,
  CancelBookingParams,
  CancelBookingResponse,
  CustomerSuggestion,
  PackageItem,
  BookingDetailsData,
} from '../types/booking';
import { BookingSlot } from '../types/calendar';
import { isSlotElapsed } from '../utils/dateUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizePackageId(id?: string | null): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Creates a new booking atomically in PostgreSQL.
 * Physically prevents double-bookings via GiST exclusion constraint (23P01).
 */
export async function createBookingAtomic(
  params: CreateBookingParams,
  onSessionExpired?: () => void
): Promise<CreateBookingResponse> {
  try {
    const cleanMobile = params.customerMobile.replace(/[^0-9]/g, '').slice(-10);
    const cleanPackageId = sanitizePackageId(params.packageId);

    let mappedSlot: 'morning' | 'evening' | 'full_day' = 'full_day';
    if (params.slot === 'morning') mappedSlot = 'morning';
    else if (params.slot === 'evening') mappedSlot = 'evening';

    const cleanPayments = (params.payments || []).map(p => ({
      amount: Math.max(0, Number(p.amount) || 0),
      mode: p.mode || 'cash',
      payment_mode: p.mode || 'cash',
      pay_by_date: p.pay_by_date || null,
      promised_pay_by_date: p.pay_by_date || null,
      notes: p.notes && p.notes.trim() !== '' ? p.notes.trim() : null,
    }));

    const cleanExtraChargesItems = (params.extraChargesItems || []).map(item => ({
      title: item.title.trim(),
      amount: Math.max(0, Number(item.amount) || 0),
      notes: item.notes && item.notes.trim() !== '' ? item.notes.trim() : null,
    }));

    const calculatedExtraCharges = cleanExtraChargesItems.length > 0
      ? cleanExtraChargesItems.reduce((acc, cur) => acc + cur.amount, 0)
      : Math.max(0, Number(params.extraCharges) || 0);

    const { data, error } = await supabase.rpc('create_booking_atomic', {
      p_customer_name: params.customerName.trim(),
      p_customer_mobile: cleanMobile,
      p_package_id: cleanPackageId,
      p_start_date: params.startDate.trim(),
      p_end_date: (params.endDate || params.startDate).trim(),
      p_slot: mappedSlot,
      p_event_type: params.eventType.trim(),
      p_expected_guests: Math.max(0, parseInt(String(params.expectedGuests), 10) || 0),
      p_booking_price: Math.max(0, Number(params.bookingPrice) || 0),
      p_extra_charges: calculatedExtraCharges,
      p_notes: params.notes && params.notes.trim() !== '' ? params.notes.trim() : null,
      p_payments: cleanPayments,
      p_extra_charges_items: cleanExtraChargesItems,
    });

    if (error) {
      console.error('[BookingService] create_booking_atomic error:', JSON.stringify(error, null, 2));

      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        throw new Error('Your session has expired. Please log in again.');
      }

      // GiST Concurrency Collision
      if (
        error.code === '23P01' ||
        error.message?.includes('Conflict: The selected date and slot is already booked')
      ) {
        throw new Error(
          'Slot Unavailable: Another booking already occupies this date and slot. Please choose another date or slot.'
        );
      }

      // Past Date / Elapsed Slot
      if (error.message?.includes('Invalid booking time')) {
        throw new Error(
          'Invalid booking time: The selected slot has already started or elapsed. Please select an upcoming slot.'
        );
      }

      throw new Error(error.message || 'Failed to create booking.');
    }

    return data as CreateBookingResponse;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Edits an existing booking atomically.
 * Alerts owner via audit log if staff modifies pricing.
 */
export async function editBookingAtomic(
  params: EditBookingParams,
  onSessionExpired?: () => void
): Promise<EditBookingResponse> {
  try {
    const cleanMobile = params.customerMobile.replace(/[^0-9]/g, '').slice(-10);
    const cleanPackageId = sanitizePackageId(params.packageId);

    let mappedSlot: 'morning' | 'evening' | 'full_day' = 'full_day';
    if (params.slot === 'morning') mappedSlot = 'morning';
    else if (params.slot === 'evening') mappedSlot = 'evening';

    const cleanExtraChargesItems = (params.extraChargesItems || []).map(item => ({
      title: item.title.trim(),
      amount: Math.max(0, Number(item.amount) || 0),
      notes: item.notes && item.notes.trim() !== '' ? item.notes.trim() : null,
    }));

    const calculatedExtraCharges = cleanExtraChargesItems.length > 0
      ? cleanExtraChargesItems.reduce((acc, cur) => acc + cur.amount, 0)
      : Math.max(0, Number(params.extraCharges) || 0);

    const { data, error } = await supabase.rpc('edit_booking_atomic', {
      p_booking_id: params.bookingId,
      p_customer_name: params.customerName.trim(),
      p_customer_mobile: cleanMobile,
      p_package_id: cleanPackageId,
      p_start_date: params.startDate.trim(),
      p_end_date: (params.endDate || params.startDate).trim(),
      p_slot: mappedSlot,
      p_event_type: params.eventType.trim(),
      p_expected_guests: Math.max(0, parseInt(String(params.expectedGuests), 10) || 0),
      p_booking_price: Math.max(0, Number(params.bookingPrice) || 0),
      p_extra_charges: calculatedExtraCharges,
      p_notes: params.notes && params.notes.trim() !== '' ? params.notes.trim() : null,
      p_extra_charges_items: cleanExtraChargesItems,
    });

    if (error) {
      console.error('[BookingService] edit_booking_atomic error:', JSON.stringify(error, null, 2));
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        throw new Error('Your session has expired. Please log in again.');
      }

      if (
        error.code === '23P01' ||
        error.message?.includes('Conflict: The updated date and slot conflicts')
      ) {
        throw new Error(
          'Slot Unavailable: The updated date and slot conflicts with another existing reservation.'
        );
      }

      if (error.message?.includes('Cannot edit a cancelled booking')) {
        throw new Error('Cannot edit a cancelled booking.');
      }

      throw new Error(error.message || 'Failed to update booking.');
    }

    return data as EditBookingResponse;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Owner-only cancellation with payments ledger refund entry.
 * Releases occupied slot immediately in PostgreSQL.
 */
export async function cancelBooking(
  params: CancelBookingParams,
  onSessionExpired?: () => void
): Promise<CancelBookingResponse> {
  try {
    const { data, error } = await supabase.rpc('cancel_booking', {
      p_booking_id: params.bookingId,
      p_reason: params.reason.trim(),
      p_refund_amount: Number(params.refundAmount) || 0.0,
      p_refund_payment_mode: params.refundPaymentMode || 'cash',
    });

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        throw new Error('Your session has expired. Please log in again.');
      }

      if (error.message?.includes('Permission Denied')) {
        throw new Error('Permission Denied: Only the hall owner can cancel a booking.');
      }

      if (error.message?.includes('already cancelled')) {
        throw new Error('This booking is already cancelled.');
      }

      throw new Error(error.message || 'Failed to cancel booking.');
    }

    return data as CancelBookingResponse;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Fetches complete booking contract, payments ledger, and audit trail.
 */
export async function fetchBookingDetails(
  bookingId: string,
  onSessionExpired?: () => void
): Promise<BookingDetailsData | null> {
  try {
    // 1. Fetch booking core contract + relations
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        bill_number,
        start_date,
        end_date,
        slot,
        event_type,
        expected_guests,
        booking_price,
        extra_charges,
        notes,
        status,
        cancel_reason,
        refund_amount,
        cancelled_at,
        created_at,
        customers:customer_id (
          id,
          name,
          mobile
        ),
        packages:package_id (
          id,
          name,
          price,
          amenities
        ),
        created_by_member:created_by (
          id,
          username,
          role
        ),
        payments (
          id,
          amount,
          payment_mode,
          is_reversal,
          reverses_payment_id,
          promised_pay_by_date,
          notes,
          created_at,
          recorded_by_member:recorded_by (
            username
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      if (isSessionExpiredError(bookingError)) {
        await handleSessionExpired(onSessionExpired);
        return null;
      }
      throw bookingError;
    }

    // 2. Fetch activity logs separately via entity_id (activity_logs is a polymorphic audit table)
    let logs: any[] = [];
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          performed_by_member:performed_by (
            username
          )
        `)
        .eq('entity_id', bookingId)
        .order('created_at', { ascending: false });

      if (logsError) {
        console.warn('[BookingService] Failed to load activity logs:', logsError);
      } else if (logsData) {
        logs = logsData;
      }
    } catch (e) {
      console.warn('[BookingService] activity_logs fetch exception:', e);
    }

    // 3. Fetch financial overview view
    const { data: financial } = await supabase
      .from('booking_financial_summaries')
      .select('total_contract_amount, total_paid, pending_balance, payment_status, latest_promised_pay_by_date')
      .eq('booking_id', bookingId)
      .maybeSingle();

    // 4. Fetch itemized extra charges
    let extraChargesItems: any[] = [];
    try {
      const { data: extrasData, error: extrasError } = await supabase
        .from('booking_extra_charges')
        .select('id, title, amount, notes')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (extrasError) {
        console.warn('[BookingService] Failed to load extra charges items:', extrasError);
      } else if (extrasData) {
        extraChargesItems = extrasData.map(e => ({
          id: e.id,
          title: e.title,
          amount: Number(e.amount),
          notes: e.notes || null,
        }));
      }
    } catch (e) {
      console.warn('[BookingService] booking_extra_charges fetch exception:', e);
    }

    const merged: BookingDetailsData = {
      ...(booking as any),
      activity_logs: logs,
      extra_charges_items: extraChargesItems,
      total_contract_amount:
        financial?.total_contract_amount ??
        (Number(booking.booking_price || 0) + Number(booking.extra_charges || 0)),
      total_paid: financial?.total_paid ?? 0,
      pending_balance: financial?.pending_balance ?? Number(booking.booking_price || 0),
      payment_status: financial?.payment_status ?? (booking.status === 'cancelled' ? 'cancelled' : 'upcoming'),
      latest_promised_pay_by_date: financial?.latest_promised_pay_by_date ?? null,
    };

    return merged;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
      return null;
    }
    console.warn('Error fetching booking details:', err);
    throw err;
  }
}

/**
 * Searches CRM customers by 10-digit mobile prefix for auto-suggestion.
 */
export async function searchCustomers(mobilePrefix: string): Promise<CustomerSuggestion[]> {
  const clean = mobilePrefix.trim().replace(/[^0-9]/g, '');
  if (clean.length < 3) return [];

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, mobile')
      .ilike('mobile', `${clean}%`)
      .limit(5);

    if (error) {
      console.warn('Customer search error:', error);
      return [];
    }

    return (data as CustomerSuggestion[]) || [];
  } catch (err) {
    console.warn('Customer search exception:', err);
    return [];
  }
}

/**
 * Fetches active packages configured for the hall.
 */
export async function fetchActivePackages(): Promise<PackageItem[]> {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('id, name, price, amenities, is_active')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.warn('Fetch packages error:', error);
      return [];
    }

    return (data as PackageItem[]) || [];
  } catch (err) {
    console.warn('Fetch packages exception:', err);
    return [];
  }
}

export interface SlotAvailabilityResult {
  isAvailable: boolean;
  isElapsed: boolean;
  conflictCustomerName?: string;
  conflictBillNumber?: string;
}

/**
 * Proactively checks whether a given date and slot is available or booked.
 * Enforces UX Principle 1.6 (Visibility of System Status) before form submission.
 */
export async function checkSlotAvailability(
  startDate: string,
  slot: BookingSlot,
  excludeBookingId?: string
): Promise<SlotAvailabilityResult> {
  const elapsed = isSlotElapsed(startDate, slot);
  if (elapsed) {
    return { isAvailable: false, isElapsed: true };
  }

  try {
    let query = supabase
      .from('bookings')
      .select(`
        id,
        bill_number,
        slot,
        customers:customer_id (name)
      `)
      .neq('status', 'cancelled')
      .lte('start_date', startDate)
      .gte('end_date', startDate);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return { isAvailable: true, isElapsed: false };
    }

    // Check slot collision: full_day conflicts with all; morning/evening conflict with self or full_day
    const conflicting = data.find((b: any) => {
      if (b.slot === 'full_day' || slot === 'full_day') return true;
      return b.slot === slot;
    });

    if (conflicting) {
      return {
        isAvailable: false,
        isElapsed: false,
        conflictCustomerName: (conflicting as any).customers?.name || 'Existing Booking',
        conflictBillNumber: (conflicting as any).bill_number,
      };
    }

    return { isAvailable: true, isElapsed: false };
  } catch (e) {
    console.warn('[BookingService] checkSlotAvailability error:', e);
    return { isAvailable: true, isElapsed: false };
  }
}

