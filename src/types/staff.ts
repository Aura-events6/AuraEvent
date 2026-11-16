export interface ScreenAccessConfig {
  calendar: boolean;
  search: boolean;
  khatabook: boolean;
  analytics: boolean;
  users: boolean;
  settings?: boolean;
}

export const DEFAULT_STAFF_SCREEN_ACCESS: ScreenAccessConfig = {
  calendar: true,
  search: true,
  khatabook: true,
  analytics: false,
  users: false,
  settings: true,
};

export interface TeamMemberItem {
  id: string;
  user_id: string;
  role: 'owner' | 'staff' | 'superadmin';
  username: string;
  screen_access: ScreenAccessConfig;
  is_active: boolean;
  created_at: string;
}

export interface TeamDirectoryResult {
  members: TeamMemberItem[];
  activeCount: number;
  maxLimit: number;
  canAddMore: boolean;
}

export interface CreateStaffParams {
  username: string;
  password: string;
  screenAccess: ScreenAccessConfig;
}

export interface ResetStaffPasswordParams {
  memberId: string;
  newPassword: string;
}

