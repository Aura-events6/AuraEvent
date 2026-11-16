import { KhatabookDueItem } from './khatabook';

export interface CustomerSearchResult {
  id: string;
  name: string;
  mobile: string;
  notes?: string | null;
  created_at: string;
  lifetimeBookingsCount: number;
}

export type BookingSearchResult = KhatabookDueItem;

export interface CustomerLifetimeMetrics {
  totalBookings: number;
  lifetimeContractValue: number;
  totalPaid: number;
  remainingDues: number;
}

export interface CustomerProfileData {
  customer: {
    id: string;
    name: string;
    mobile: string;
    notes?: string | null;
    created_at: string;
  };
  bookings: KhatabookDueItem[];
  metrics: CustomerLifetimeMetrics;
}

