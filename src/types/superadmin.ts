export interface PlatformMetrics {
  total_halls: number;
  active_paid_plans: number;
  trial_halls: number;
  grace_halls: number;
  suspended_halls: number;
  exempt_halls: number;
  expiring_soon: number;
  annual_recurring_revenue: number;
  platform_gmv: number;
}

export type SlotModeType = 'two_slots' | 'full_day';

export interface SuperAdminHallItem {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  slot_mode: SlotModeType;
  subscription_status: 'trial' | 'active' | 'grace_period' | 'suspended';
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  is_subscription_exempt: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  owner_username: string | null;
  owner_email: string | null;
  created_at: string;
  total_bookings?: number;
}

export type SuperAdminHallFilter =
  | 'all'
  | 'trial'
  | 'active'
  | 'grace_period'
  | 'suspended'
  | 'exempt';

export interface CreateHallPayload {
  hall_name: string;
  phone: string;
  owner_email: string;
  owner_password: string;
  owner_username: string;
  address?: string;
  slot_mode?: SlotModeType;
  timezone?: string;
  is_subscription_exempt?: boolean; // Defaults to true (Bypass mode)
  plan_type?: 'starter' | 'standard' | 'multi_hall';
}

export interface CreateHallResponse {
  success: boolean;
  message: string;
  hall: {
    id: string;
    name: string;
    phone: string;
    slot_mode: string;
    subscription_status: string;
    is_subscription_exempt: boolean;
    is_suspended: boolean;
  };
  owner: {
    id: string;
    email: string;
    username: string;
    member_id: string;
  };
}

export interface UpdateSubscriptionPayload {
  hallId: string;
  action: 'toggle_bypass' | 'activate_plan' | 'extend_trial' | 'manual_suspend' | 'manual_unsuspend';
  planType?: 'starter' | 'standard' | 'multi_hall';
  days?: number;
  isExempt?: boolean;
  reason?: string;
}

