export type UserRole = 'owner' | 'staff' | 'superadmin';

export interface ScreenAccess {
  calendar: boolean;
  search: boolean;
  khatabook: boolean;
  analytics: boolean;
  users: boolean;
  settings?: boolean;
  expenses?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  avatarUrl?: string;
  pin?: string;
  permissions?: string[];
  screenAccess?: Partial<ScreenAccess>;
  hallId?: string;
  hallName?: string;
}

export type SlotMode = 'two-slot' | 'full-day' | 'two_slots' | 'full_day';

export interface HallProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  slotMode: SlotMode;
  capacity: number;
  gstNumber?: string;
  billPrefix: string;
  currency_symbol?: string;
  multiDayEnabled?: boolean;
  morningStart?: string;
  morningEnd?: string;
  eveningStart?: string;
  eveningEnd?: string;
  trialDaysRemaining: number;
  isSubscriptionExempt?: boolean;
  subscription_status?: string;
  trial_ends_at?: string;
  subscription_ends_at?: string | null;
  is_suspended?: boolean;
  suspension_reason?: string | null;
  event_types?: string[];
}

export interface RegisterHallForm {
  hallName: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  city: string;
  slotMode: SlotMode;
  capacity: number;
}

export type AuthStackParamList = {
  Login: undefined;
  RegisterHall: undefined;
  PinSetup: { fromRegistration?: boolean } | undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  PinUnlock: undefined;
  MainTabs: undefined;
};

export * from './staff';
export * from './settings';
export * from './search';
export * from './analytics';
export * from './dashboard';
export * from './superadmin';
export * from './expenses';

