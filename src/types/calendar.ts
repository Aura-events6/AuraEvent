export type SlotMode = 'two_slots' | 'full_day';
export type BookingSlot = 'morning' | 'evening' | 'full_day';
export type PaymentStatus = 'paid' | 'upcoming' | 'overdue' | 'overpaid' | 'cancelled';

export interface HallOperatingConfig {
  id: string;
  name: string;
  slot_mode: SlotMode;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  currency_symbol: string;
  timezone: string;
  event_types?: string[];
}

export interface CalendarSummary {
  start_date: string;
  end_date: string;
  total_bookings: number;
  expected_revenue: number;
  collected_revenue: number;
  pending_balance: number;
}

export interface CalendarBooking {
  booking_id: string;
  bill_number: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  package_id: string | null;
  package_name: string;
  start_date: string;
  end_date: string;
  slot: BookingSlot;
  event_type: string;
  status: 'confirmed' | 'cancelled';
  booking_price: number;
  extra_charges: number;
  extra_charges_items?: Array<{
    id?: string;
    title: string;
    amount: number;
    notes?: string | null;
  }>;
  total_contract_amount: number;
  total_paid: number;
  pending_balance: number;
  payment_status: PaymentStatus;
  latest_promised_pay_by_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface WeeklyCalendarResponse {
  hall: HallOperatingConfig;
  summary: CalendarSummary;
  bookings: CalendarBooking[];
}

export interface MappedSlot {
  slot: BookingSlot;
  label: string;
  timeRange: string;
  booking: CalendarBooking | null;
}

