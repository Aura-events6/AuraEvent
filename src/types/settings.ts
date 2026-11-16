export interface NotificationSettings {
  notify_owner_on_price_edit: boolean;
  notify_owner_on_cancel: boolean;
  notify_owner_on_reversal: boolean;
}

export interface HallSettingsPayload {
  name: string;
  phone: string;
  address?: string | null;
  gstNumber?: string | null;
  billPrefix: string;
  slotMode: 'two_slots' | 'full_day';
  multiDayEnabled: boolean;
  morningStart: string; // 'HH:MM:SS'
  morningEnd: string;   // 'HH:MM:SS'
  eveningStart: string; // 'HH:MM:SS'
  eveningEnd: string;   // 'HH:MM:SS'
  notificationSettings: NotificationSettings;
  eventTypes?: string[];
}

export interface PackagePayload {
  name: string;
  price: number;
  amenities: string[];
}

export interface HallPackageItem {
  id: string;
  hall_id?: string;
  name: string;
  price: number;
  amenities: string[];
  is_active: boolean;
  created_at?: string;
}

