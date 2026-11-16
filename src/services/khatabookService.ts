import { supabase, getSessionClient } from '../lib/supabase';
import { isSessionExpiredError, handleSessionExpired } from '../lib/apiErrors';
import {
  KhatabookDueItem,
  KhatabookSummaryMetrics,
  RecordPaymentParams,
  RecordPaymentResponse,
  ReversePaymentParams,
  ReversePaymentResponse,
} from '../types/khatabook';

/**
 * Computes high-level financial summary metrics from the dues list.
 */
export function computeKhatabookTotals(dues: KhatabookDueItem[]): KhatabookSummaryMetrics {
  const totalOutstanding = dues.reduce(
    (sum, item) => sum + (Number(item.pending_balance) || 0),
    0
  );

  const overdueItems = dues.filter(item => item.payment_status === 'overdue');
  const totalOverdue = overdueItems.reduce(
    (sum, item) => sum + (Number(item.pending_balance) || 0),
    0
  );

  const upcomingItems = dues.filter(item => item.payment_status === 'upcoming');
  const totalUpcoming = upcomingItems.reduce(
    (sum, item) => sum + (Number(item.pending_balance) || 0),
    0
  );

  const creditItems = dues.filter(item => item.latest_promised_pay_by_date !== null);

  return {
    totalOutstanding,
    totalOverdue,
    totalUpcoming,
    counts: {
      all: dues.length,
      overdue: overdueItems.length,
      upcoming: upcomingItems.length,
      credit: creditItems.length,
    },
  };
}

/**
 * Fetches all confirmed bookings with an outstanding balance for the caller's hall.
 * Runs on PostgreSQL view booking_financial_summaries with security_invoker = true.
 */
export async function fetchKhatabookDues(
  onSessionExpired?: () => void
): Promise<KhatabookDueItem[]> {
  try {
    const client = await getSessionClient();

    const { data, error } = await client
      .from('booking_financial_summaries')
      .select('*')
      .eq('status', 'confirmed')
      .gt('pending_balance', 0)
      .order('start_date', { ascending: true });

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        return [];
      }
      console.warn('[KhatabookService] fetchKhatabookDues error:', error);
      throw error;
    }

    return (data as KhatabookDueItem[]) || [];
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
      return [];
    }
    throw err;
  }
}

/**
 * Records a subsequent payment (installment, settlement, credit promise) atomically.
 */
export async function recordPayment(
  params: RecordPaymentParams,
  onSessionExpired?: () => void
): Promise<RecordPaymentResponse> {
  try {
    const client = await getSessionClient();

    const { data, error } = await client.rpc('record_payment', {
      p_booking_id: params.bookingId,
      p_amount: Math.max(0, Number(params.amount) || 0),
      p_payment_mode: params.paymentMode,
      p_promised_pay_by_date: params.promisedPayByDate || null,
      p_notes: params.notes?.trim() || null,
    });

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        throw new Error('Your session has expired. Please log in again.');
      }
      throw new Error(error.message || 'Failed to record payment.');
    }

    return data as RecordPaymentResponse;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Reverses an erroneous payment in the immutable payments ledger.
 * Inserts an auditable reversing entry and writes to activity_logs.
 */
export async function reversePayment(
  params: ReversePaymentParams,
  onSessionExpired?: () => void
): Promise<ReversePaymentResponse> {
  try {
    const client = await getSessionClient();

    const { data, error } = await client.rpc('reverse_payment', {
      p_payment_id: params.paymentId,
      p_reason: params.reason.trim(),
    });

    if (error) {
      if (isSessionExpiredError(error)) {
        await handleSessionExpired(onSessionExpired);
        throw new Error('Your session has expired. Please log in again.');
      }
      throw new Error(error.message || 'Failed to reverse payment.');
    }

    return data as ReversePaymentResponse;
  } catch (err: any) {
    if (isSessionExpiredError(err)) {
      await handleSessionExpired(onSessionExpired);
    }
    throw err;
  }
}

/**
 * Subscribes to Realtime changes on payments and bookings to keep Khatabook in sync.
 */
export function subscribeToPaymentChanges(onUpdate: () => void) {
  const instanceId = Math.random().toString(36).substring(2, 9);
  const channel = supabase
    .channel(`khatabook-realtime-sync-${instanceId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments' },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

