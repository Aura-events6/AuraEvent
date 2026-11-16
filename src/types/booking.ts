import { BookingSlot, PaymentStatus } from './calendar';

export interface SplitPaymentItem {
  amount: number;
  mode: 'cash' | 'card' | 'upi' | 'credit';
  pay_by_date?: string | null; // YYYY-MM-DD
  notes?: string;
}

export interface ExtraChargeItem {
  id?: string;
  title: string;
  amount: number;
  notes?: string | null;
}

export interface CreateBookingParams {
  customerName: string;
  customerMobile: string;
  packageId?: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  slot: BookingSlot;
  eventType: string;
  expectedGuests: number;
  bookingPrice: number;
  extraCharges?: number;
  extraChargesItems?: ExtraChargeItem[];
  notes?: string;
  payments?: SplitPaymentItem[];
}

export interface CreateBookingResponse {
  success: boolean;
  booking_id: string;
  bill_number: string;
  customer_id: string;
}

export interface EditBookingParams {
  bookingId: string;
  customerName: string;
  customerMobile: string;
  packageId?: string | null;
  startDate: string;
  endDate: string;
  slot: BookingSlot;
  eventType: string;
  expectedGuests: number;
  bookingPrice: number;
  extraCharges?: number;
  extraChargesItems?: ExtraChargeItem[];
  notes?: string;
}

export interface EditBookingResponse {
  success: boolean;
  message: string;
}

export interface CancelBookingParams {
  bookingId: string;
  reason: string;
  refundAmount?: number;
  refundPaymentMode?: 'cash' | 'card' | 'upi' | 'credit';
}

export interface CancelBookingResponse {
  success: boolean;
  message: string;
}

export interface CustomerSuggestion {
  id: string;
  name: string;
  mobile: string;
}

export interface PackageItem {
  id: string;
  name: string;
  price: number;
  amenities?: string[] | null;
  is_active?: boolean;
}

export interface BookingPaymentRecord {
  id: string;
  amount: number;
  payment_mode: 'cash' | 'card' | 'upi' | 'credit';
  is_reversal: boolean;
  reverses_payment_id?: string | null;
  promised_pay_by_date?: string | null;
  notes?: string | null;
  created_at: string;
  recorded_by_member?: {
    username: string;
  } | null;
}

export interface BookingActivityLog {
  id: string;
  action: string;
  details?: any;
  created_at: string;
  performed_by_member?: {
    username: string;
  } | null;
}

export interface BookingDetailsData {
  id: string;
  bill_number: string;
  start_date: string;
  end_date: string;
  slot: BookingSlot;
  event_type: string;
  expected_guests: number;
  booking_price: number;
  extra_charges: number;
  extra_charges_items?: ExtraChargeItem[];
  notes?: string | null;
  status: 'confirmed' | 'cancelled';
  cancel_reason?: string | null;
  refund_amount?: number | null;
  cancelled_at?: string | null;
  created_at: string;
  customers?: {
    id: string;
    name: string;
    mobile: string;
  } | null;
  packages?: {
    id: string;
    name: string;
    price: number;
    amenities?: string[] | null;
  } | null;
  created_by_member?: {
    id: string;
    username: string;
    role: string;
  } | null;
  payments?: BookingPaymentRecord[];
  activity_logs?: BookingActivityLog[];
  // Extended financial summaries
  total_contract_amount?: number;
  total_paid?: number;
  pending_balance?: number;
  payment_status?: PaymentStatus;
  latest_promised_pay_by_date?: string | null;
}

