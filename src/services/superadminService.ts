import { supabase, getSessionClient } from '../lib/supabase';
import {
  PlatformMetrics,
  SuperAdminHallItem,
  SuperAdminHallFilter,
  CreateHallPayload,
  CreateHallResponse,
  UpdateSubscriptionPayload,
} from '../types/superadmin';

/**
 * Extracts descriptive error message from Supabase Edge Function non-2xx responses.
 */
async function extractEdgeFunctionError(err: any): Promise<string> {
  try {
    if (err && err.context && typeof err.context.json === 'function') {
      const body = await err.context.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
  } catch {}
  return err?.message || 'Request failed. Please verify SuperAdmin permissions.';
}

/**
 * Formats platform GMV and ARR figures into Indian currency representation.
 */
export function formatPlatformCurrency(amount: number, symbol: string = '₹'): string {
  if (!amount || isNaN(amount) || amount === 0) return `${symbol}0`;
  const abs = Math.abs(amount);

  // Crores (>= 1,00,00,000)
  if (abs >= 10000000) {
    const cr = (amount / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${symbol}${cr} Cr`;
  }
  // Lakhs (>= 1,00,000)
  if (abs >= 100000) {
    const lk = (amount / 100000).toFixed(2).replace(/\.00$/, '');
    return `${symbol}${lk} L`;
  }
  // Thousands (>= 1,000)
  if (abs >= 1000) {
    const k = (amount / 1000).toFixed(1).replace(/\.0$/, '');
    return `${symbol}${k}k`;
  }
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Fetches global platform executive metrics directly from live PostgreSQL RPC `superadmin_get_platform_metrics`.
 */
export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  const client = await getSessionClient();
  const { data, error } = await client.rpc('superadmin_get_platform_metrics');

  if (error) {
    console.error('[superadminService] fetchPlatformMetrics error:', error);
    throw error;
  }

  return {
    total_halls: Number(data.total_halls || 0),
    active_paid_plans: Number(data.active_paid_plans || 0),
    trial_halls: Number(data.trial_halls || 0),
    grace_halls: Number(data.grace_halls || 0),
    suspended_halls: Number(data.suspended_halls || 0),
    exempt_halls: Number(data.exempt_halls || 0),
    expiring_soon: Number(data.expiring_soon || 0),
    annual_recurring_revenue: Number(data.annual_recurring_revenue || 0),
    platform_gmv: Number(data.platform_gmv || 0),
  };
}

/**
 * Queries all function halls across India using live PostgreSQL RPC `superadmin_list_halls`.
 */
export async function fetchSuperAdminHalls(params: {
  search?: string;
  status?: SuperAdminHallFilter;
  limit?: number;
  offset?: number;
}): Promise<SuperAdminHallItem[]> {
  const client = await getSessionClient();

  const { data, error } = await client.rpc('superadmin_list_halls', {
    p_search: params.search?.trim() || null,
    p_status: params.status || 'all',
    p_limit: params.limit || 50,
    p_offset: params.offset || 0,
  });

  if (error) {
    console.error('[superadminService] fetchSuperAdminHalls error:', error);
    throw error;
  }

  const rawList = (data || []) as any[];
  return rawList.map(h => ({
    id: h.id,
    name: h.name || 'Unnamed Hall',
    phone: h.phone || '',
    address: h.address || null,
    slot_mode: h.slot_mode === 'full_day' ? 'full_day' : 'two_slots',
    subscription_status: h.subscription_status || 'trial',
    trial_ends_at: h.trial_ends_at || null,
    subscription_ends_at: h.subscription_ends_at || null,
    is_subscription_exempt: Boolean(h.is_subscription_exempt),
    is_suspended: Boolean(h.is_suspended),
    suspension_reason: h.suspension_reason || null,
    owner_username: h.owner_username || null,
    owner_email: h.owner_email || null,
    created_at: h.created_at || new Date().toISOString(),
    total_bookings: Number(h.total_bookings || 0),
  }));
}

/**
 * Provisions a new hall, owner account, starter package, and bypass settings via live Edge Function.
 */
export async function superAdminCreateHall(
  payload: CreateHallPayload
): Promise<CreateHallResponse> {
  const { data, error } = await supabase.functions.invoke('superadmin-create-hall', {
    body: {
      hall_name: payload.hall_name.trim(),
      phone: payload.phone.trim(),
      owner_email: payload.owner_email.trim().toLowerCase(),
      owner_password: payload.owner_password,
      owner_username: payload.owner_username.trim().toLowerCase(),
      address: payload.address?.trim() || null,
      slot_mode: payload.slot_mode || 'two_slots',
      timezone: payload.timezone || 'Asia/Kolkata',
      is_subscription_exempt: payload.is_subscription_exempt ?? true, // Lifetime access bypass
      plan_type: payload.plan_type || 'standard',
    },
  });

  if (error) {
    const errorMsg = await extractEdgeFunctionError(error);
    throw new Error(errorMsg);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as CreateHallResponse;
}

/**
 * Updates subscription controls, bypass status, trial extensions, and suspensions via live RPC.
 */
export async function updateHallSubscription(
  params: UpdateSubscriptionPayload
): Promise<any> {
  const client = await getSessionClient();

  const { data, error } = await client.rpc('superadmin_update_subscription', {
    p_hall_id: params.hallId,
    p_action: params.action,
    p_plan_type: params.planType || 'standard',
    p_days: params.days || 14,
    p_is_exempt: params.isExempt ?? false,
    p_reason: params.reason || null,
  });

  if (error) {
    console.error('[superadminService] updateHallSubscription error:', error);
    throw error;
  }

  return data;
}

/**
 * Fetches live weekly bookings for a specified hall (read-only support mode).
 * Queries `booking_financial_summaries` directly with hall_id filtering.
 */
export async function fetchHallSupportBookings(
  hallId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  const client = await getSessionClient();

  const { data, error } = await client
    .from('booking_financial_summaries')
    .select('*')
    .eq('hall_id', hallId)
    .gte('start_date', startDate)
    .lte('start_date', endDate);

  if (error) {
    console.warn('[superadminService] fetchHallSupportBookings error:', error);
    throw error;
  }

  return data || [];
}

