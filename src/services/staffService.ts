import { supabase } from '../lib/supabase';
import {
  CreateStaffParams,
  ResetStaffPasswordParams,
  ScreenAccessConfig,
  TeamDirectoryResult,
  TeamMemberItem,
} from '../types/staff';

/**
 * Service for managing hall team staff accounts, permissions, and Edge Function operations.
 */

/**
 * Fetch all team members for a hall and calculate active member slots against the 5-member limit.
 */
export async function fetchTeamMembers(hallId: string): Promise<TeamDirectoryResult> {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, user_id, role, username, screen_access, is_active, created_at')
    .eq('hall_id', hallId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to fetch team members');
  }

  const typedMembers = (members || []).map(m => ({
    ...m,
    screen_access: (m.screen_access || {}) as ScreenAccessConfig,
  })) as TeamMemberItem[];

  const activeCount = typedMembers.filter(m => m.is_active).length;

  return {
    members: typedMembers,
    activeCount,
    maxLimit: 5,
    canAddMore: activeCount < 5,
  };
}

/**
 * Helper to extract the actual human-readable error message from a Supabase Edge Function error.
 * Supabase functions.invoke returns FunctionsHttpError with a generic 'Edge Function returned a non-2xx status code',
 * while the server's real JSON payload is in error.context.
 */
async function extractEdgeFunctionError(error: any, data: any): Promise<string> {
  if (data?.error) {
    return data.error;
  }
  if (error) {
    if (error.context) {
      try {
        if (typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.error) return body.error;
          if (body?.message) return body.message;
        } else if (typeof error.context.text === 'function') {
          const rawText = await error.context.text();
          try {
            const body = JSON.parse(rawText);
            if (body?.error) return body.error;
            if (body?.message) return body.message;
          } catch {
            if (rawText) return rawText;
          }
        }
      } catch {}
    }
    return error.message || 'Edge function invocation failed';
  }
  return 'Unknown error occurred while managing staff';
}

/**
 * Create a new staff member via the Supabase 'create-staff' Edge Function.
 * The Edge Function:
 * 1. Validates the caller is the hall owner.
 * 2. Checks and locks the hall row to enforce the 5 active member limit.
 * 3. Creates an auth user with shadow email: <username>@<hall_id>.aura.app.
 * 4. Inserts into the members table with specified screen permissions.
 */
export async function createStaffMember(params: CreateStaffParams): Promise<TeamMemberItem> {
  const sanitizedUsername = params.username.trim().toLowerCase();

  const { data, error } = await supabase.functions.invoke('create-staff', {
    body: {
      username: sanitizedUsername,
      password: params.password,
      screen_access: params.screenAccess,
    },
  });

  if (error || data?.error) {
    const errorMsg = await extractEdgeFunctionError(error, data);
    throw new Error(errorMsg);
  }

  return data.member;
}

/**
 * Reset a staff member's password directly via the Edge Function.
 * No email recovery links or user confirmation required.
 */
export async function resetStaffPassword(params: ResetStaffPasswordParams): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('create-staff', {
    body: {
      action: 'reset_password',
      member_id: params.memberId,
      new_password: params.newPassword,
    },
  });

  if (error || data?.error) {
    const errorMsg = await extractEdgeFunctionError(error, data);
    throw new Error(errorMsg);
  }

  return {
    success: true,
    message: data?.message || 'Password reset successfully',
  };
}

/**
 * Update granular screen access permissions for an existing team member.
 */
export async function updateStaffPermissions(
  memberId: string,
  screenAccess: ScreenAccessConfig
): Promise<TeamMemberItem> {
  const { data, error } = await supabase
    .from('members')
    .update({
      screen_access: screenAccess,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select('id, user_id, role, username, screen_access, is_active, created_at')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update member permissions');
  }

  return {
    ...data,
    screen_access: data.screen_access as ScreenAccessConfig,
  };
}

/**
 * Deactivate a staff member (soft-delete).
 * Preserves audit history (payments, bookings created) while instantly
 * revoking system access and freeing up 1 seat in the 5-member limit.
 */
export async function deactivateStaffMember(memberId: string): Promise<boolean> {
  const { error } = await supabase
    .from('members')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    throw new Error(error.message || 'Failed to deactivate staff member');
  }

  return true;
}

/**
 * Reactivate a previously deactivated staff member.
 * Database trigger 'enforce_max_hall_members' ensures the 5-member limit is respected.
 */
export async function reactivateStaffMember(memberId: string): Promise<boolean> {
  const { error } = await supabase
    .from('members')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    if (
      error.message.toLowerCase().includes('5 active members') ||
      error.message.toLowerCase().includes('team limit')
    ) {
      throw new Error(
        'Team limit reached: Maximum 5 active members allowed per hall. Deactivate another member first.'
      );
    }
    throw new Error(error.message || 'Failed to reactivate staff member');
  }

  return true;
}

/**
 * Permanently delete a staff member via the Edge Function.
 * This completely deletes their Auth user (revoking login tokens and freeing the username),
 * and removes their member record (or archives if historical bookings exist).
 */
export async function deleteStaffMember(memberId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('create-staff', {
    body: {
      action: 'delete_staff',
      member_id: memberId,
    },
  });

  if (error || data?.error) {
    const errorMsg = await extractEdgeFunctionError(error, data);
    throw new Error(errorMsg);
  }

  return true;
}

