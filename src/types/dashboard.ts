import { BookingSlot, PaymentStatus } from './calendar';

export interface DashboardYearKPIs {
  expectedRevenue: number;
  expectedBookingsCount: number;
  collectedRevenue: number;
  collectionRate: number; // 0-100%
  pendingDueAmount: number;
  pendingDueCount: number;
  overdueCount: number;
  upcomingDueCount: number;
  completedCount: number;
  upcomingCount: number;
  formatted: {
    expectedRevenue: string; // e.g. "₹18.4L"
    expectedBookings: string; // e.g. "22 Bookings"
    collectedRevenue: string; // e.g. "₹14.9L"
    collectedPercentage: string; // e.g. "81% Paid"
    pendingDue: string; // e.g. "₹3.45L"
    pendingSub: string; // e.g. "0 Overdue • 4 Upcoming" or "3 Overdue →" or "All Settled ✓"
    completedCount: string; // e.g. "14"
    upcomingCount: string; // e.g. "8 Upcoming"
  };
}

export interface DashboardDueCardItem {
  id: string;
  bookingId: string;
  customerName: string;
  eventType: string;
  eventDate: string; // e.g. "02 Nov"
  rawDate: string;  // YYYY-MM-DD
  dueAmount: string; // e.g. "₹1,20,000"
  rawDue: number;
  status: 'Overdue' | 'Upcoming';
  phone: string;
  totalContract: string;
  advancePaid: string;
  slot: BookingSlot;
}

export interface DashboardTimelineRowItem {
  id: string;
  bookingId?: string;
  timeLabel: string; // e.g. "08 Nov 02:30 PM"
  primaryTime?: string;   // e.g. "Today" or "07 Nov"
  secondaryTime?: string; // e.g. "02:30 PM" or "Sat"
  title: string;
  subtitle: string;
  category: 'events' | 'payments';
  billNumber?: string;
  amount?: string;
  dueAmountText?: string; // e.g. "₹60K Due"
}

