import { BookingSlot, PaymentStatus } from './calendar';

export interface KhatabookDueItem {
  booking_id: string;
  hall_id: string;
  bill_number: string;
  customer_id: string;
  customer_name: string;
  customer_mobile: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  slot: BookingSlot;
  event_type: string;
  status: 'confirmed' | 'cancelled';
  booking_price: number;
  extra_charges: number;
  total_contract_amount: number;
  total_paid: number;
  pending_balance: number;
  payment_status: PaymentStatus;
  latest_promised_pay_by_date: string | null;
}

export type KhatabookFilter = 'all' | 'overdue' | 'upcoming' | 'credit';

export interface KhatabookSummaryMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  totalUpcoming: number;
  counts: {
    all: number;
    overdue: number;
    upcoming: number;
    credit: number;
  };
}

export interface RecordPaymentParams {
  bookingId: string;
  amount: number;
  paymentMode: 'cash' | 'card' | 'upi' | 'credit';
  promisedPayByDate?: string | null;
  notes?: string;
}

export interface RecordPaymentResponse {
  success: boolean;
  payment_id: string;
  amount: number;
  payment_mode: string;
}

export interface ReversePaymentParams {
  paymentId: string;
  reason: string;
}

export interface ReversePaymentResponse {
  success: boolean;
  message: string;
}

