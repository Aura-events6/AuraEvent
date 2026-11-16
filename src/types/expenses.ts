export type ExpenseCategory =
  | 'diesel_fuel'
  | 'utilities'
  | 'maintenance'
  | 'vendor_payout'
  | 'staff_salary'
  | 'supplies'
  | 'other';

export type ExpensePaymentMode = 'cash' | 'upi' | 'card' | 'credit';

export interface HallExpenseBookingRef {
  id: string;
  event_type: string;
  start_date: string;
  customers?: {
    name: string;
  } | null;
}

export interface HallExpense {
  id: string;
  hall_id: string;
  booking_id?: string | null;
  title: string; // Reason
  category: ExpenseCategory;
  amount: number;
  payment_mode: ExpensePaymentMode;
  expense_date: string; // YYYY-MM-DD
  payee_name?: string | null; // Vendor
  receipt_url?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at: string;
  updated_at?: string;
  bookings?: HallExpenseBookingRef | null;
}

export type ExpenseStatusFilter = 'ALL' | 'Pending' | 'Event' | 'Upkeep';

export interface ExpenseSummaryKPIs {
  totalSpend: number;
  paidSpend: number;
  pendingSpend: number;
  pendingCount: number;
  categoryTotals: Record<ExpenseCategory, number>;
}

export interface ExpenseFormPayload {
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMode: ExpensePaymentMode;
  expenseDate: string; // YYYY-MM-DD
  bookingId?: string | null;
  payeeName?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

export interface ExpenseCategoryMeta {
  label: string;
  short: string;
  icon: string;
}

export const EXPENSE_CATEGORIES_META: Record<ExpenseCategory, ExpenseCategoryMeta> = {
  diesel_fuel: {
    label: 'Diesel & Generator',
    short: 'Power & Diesel',
    icon: 'Fuel',
  },
  utilities: {
    label: 'Electricity & Water',
    short: 'Utilities',
    icon: 'Zap',
  },
  maintenance: {
    label: 'Repairs & Maintenance',
    short: 'Maintenance',
    icon: 'Wrench',
  },
  vendor_payout: {
    label: 'Decor, Sound & Vendors',
    short: 'Vendor Payout',
    icon: 'Sparkles',
  },
  staff_salary: {
    label: 'Staff Wages & Salaries',
    short: 'Staff & Wages',
    icon: 'Users',
  },
  supplies: {
    label: 'Cleaning & Housekeeping',
    short: 'Housekeeping',
    icon: 'Package',
  },
  other: {
    label: 'Miscellaneous Operational',
    short: 'Misc Expense',
    icon: 'Receipt',
  },
};

