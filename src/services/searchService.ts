import { supabase } from '../lib/supabase';
import {
  BookingSearchResult,
  CustomerProfileData,
  CustomerSearchResult,
} from '../types/search';

/**
 * Service for real-time customer and booking directory searches,
 * customer CRM profile retrieval, and notes synchronization.
 */

export async function searchDirectory(
  query: string,
  hallId?: string
): Promise<{ customers: CustomerSearchResult[]; bookings: BookingSearchResult[] }> {
  const clean = query.trim();
  if (clean.length < 2) {
    return { customers: [], bookings: [] };
  }

  try {
    // 1. Search matching customers
    let customerQuery = supabase
      .from('customers')
      .select('id, name, mobile, notes, created_at')
      .or(`name.ilike.%${clean}%,mobile.ilike.%${clean}%`)
      .limit(20);

    if (hallId) {
      customerQuery = customerQuery.eq('hall_id', hallId);
    }

    // 2. Search matching bookings
    let bookingQuery = supabase
      .from('booking_financial_summaries')
      .select('*')
      .or(
        `bill_number.ilike.%${clean}%,customer_name.ilike.%${clean}%,customer_mobile.ilike.%${clean}%`
      )
      .order('start_date', { ascending: false })
      .limit(20);

    if (hallId) {
      bookingQuery = bookingQuery.eq('hall_id', hallId);
    }

    const [customerRes, bookingRes] = await Promise.all([
      customerQuery,
      bookingQuery,
    ]);

    if (customerRes.error) {
      console.warn('Customer search error:', customerRes.error);
    }
    if (bookingRes.error) {
      console.warn('Booking search error:', bookingRes.error);
    }

    const rawCustomers = customerRes.data || [];
    const bookings = (bookingRes.data || []) as BookingSearchResult[];

    // 3. Enrich customers with lifetime bookings count
    let enrichedCustomers: CustomerSearchResult[] = [];
    if (rawCustomers.length > 0) {
      const customerIds = rawCustomers.map((c) => c.id);
      const { data: bookingCounts } = await supabase
        .from('booking_financial_summaries')
        .select('customer_id')
        .in('customer_id', customerIds);

      const countMap: Record<string, number> = {};
      (bookingCounts || []).forEach((b) => {
        if (b.customer_id) {
          countMap[b.customer_id] = (countMap[b.customer_id] || 0) + 1;
        }
      });

      enrichedCustomers = rawCustomers.map((c) => ({
        ...c,
        lifetimeBookingsCount: countMap[c.id] || 0,
      }));
    }

    return {
      customers: enrichedCustomers,
      bookings,
    };
  } catch (err) {
    console.warn('searchDirectory exception:', err);
    return { customers: [], bookings: [] };
  }
}

export async function fetchCustomerProfile(
  customerId: string
): Promise<CustomerProfileData> {
  // 1. Fetch customer entity
  const { data: customer, error: custError } = await supabase
    .from('customers')
    .select('id, name, mobile, notes, created_at')
    .eq('id', customerId)
    .single();

  if (custError || !customer) {
    throw new Error(custError?.message || 'Customer profile not found');
  }

  // 2. Fetch customer bookings
  const { data: bookings, error: bookError } = await supabase
    .from('booking_financial_summaries')
    .select('*')
    .eq('customer_id', customerId)
    .order('start_date', { ascending: false });

  if (bookError) {
    throw new Error(bookError.message || 'Failed to fetch customer bookings');
  }

  const typedBookings = (bookings || []) as BookingSearchResult[];

  // 3. Compute lifetime metrics
  const totalBookings = typedBookings.length;
  let lifetimeContractValue = 0;
  let totalPaid = 0;
  let remainingDues = 0;

  typedBookings.forEach((b) => {
    lifetimeContractValue += Number(b.total_contract_amount || 0);
    totalPaid += Number(b.total_paid || 0);
    remainingDues += Number(b.pending_balance || 0);
  });

  return {
    customer,
    bookings: typedBookings,
    metrics: {
      totalBookings,
      lifetimeContractValue,
      totalPaid,
      remainingDues,
    },
  };
}

export async function updateCustomerNotes(
  customerId: string,
  notes: string
): Promise<boolean> {
  const { error } = await supabase
    .from('customers')
    .update({
      notes: notes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) {
    throw new Error(error.message || 'Failed to update customer notes');
  }

  return true;
}

