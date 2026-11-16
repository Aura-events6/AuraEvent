import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  ShieldCheck,
  KeyRound,
  UserX,
  UserCheck,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { TeamMemberItem } from '../../types/staff';
import { RoleBadge } from '../RoleBadge';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';

interface StaffCardProps {
  member: TeamMemberItem;
  onEditPermissions?: (member: TeamMemberItem) => void;
  onResetPassword?: (member: TeamMemberItem) => void;
  onDeactivate?: (member: TeamMemberItem) => void;
  onReactivate?: (member: TeamMemberItem) => void;
  onDelete?: (member: TeamMemberItem) => void;
  isDark?: boolean;
}

const SCREEN_NAME_MAP: Record<string, string> = {
  calendar: 'Calendar',
  search: 'Search',
  khatabook: 'Khatabook',
  analytics: 'Analytics',
  users: 'Users',
  settings: 'Settings',
};

export const StaffCard: React.FC<StaffCardProps> = ({
  member,
  onEditPermissions,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onDelete,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const isOwner = member.role === 'owner';
  const isActive = member.is_active;

  // Extract granted permissions
  const activeScreens = Object.entries(member.screen_access || {})
    .filter(([_, granted]) => Boolean(granted))
    .map(([key]) => SCREEN_NAME_MAP[key] || key);

  // Format joined date
  const joinedDate = React.useMemo(() => {
    try {
      if (!member.created_at) return '';
      const d = new Date(member.created_at);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [member.created_at]);

  return (
    <View
      style={[
        styles.card,
        glassStyles.getCardStyle(isDark),
        !isActive && styles.inactiveCard,
      ]}
    >
      {/* Header Info */}
      <View style={styles.topRow}>
        <View style={styles.userIdentity}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isOwner
                  ? isDark
                    ? colors.dark.accentBg
                    : colors.light.accentBg
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(28, 25, 23, 0.08)',
              },
            ]}
          >
            {isOwner ? (
              <Sparkles
                size={18}
                color={isDark ? colors.gold[400] : colors.gold[600]}
              />
            ) : (
              <Text
                style={[
                  styles.avatarInitial,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                {member.username.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.username, { color: t.text }]}>
                @{member.username}
              </Text>
              <RoleBadge role={member.role} size="small" />
            </View>

            {joinedDate ? (
              <View style={styles.joinedRow}>
                <Clock size={11} color={t.textSubtle} />
                <Text style={[styles.joinedText, { color: t.textSubtle }]}>
                  Joined {joinedDate}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {!isActive && (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isDark
                  ? colors.status.danger.bgDark
                  : colors.status.danger.bgLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isDark
                    ? colors.status.danger.dark
                    : colors.status.danger.light,
                },
              ]}
            >
              Inactive
            </Text>
          </View>
        )}
      </View>

      {/* Screen Access Tags */}
      <View style={styles.permissionsSection}>
        <Text style={[styles.permissionsLabel, { color: t.textSubtle }]}>
          {isOwner ? 'Full Administrative Access' : 'Screen Permissions'}
        </Text>

        {isOwner ? (
          <View style={styles.chipsWrap}>
            <View
              style={[
                styles.permissionChip,
                {
                  backgroundColor: isDark
                    ? colors.dark.accentBg
                    : colors.light.accentBg,
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.25)'
                    : 'rgba(198, 151, 73, 0.35)',
                },
              ]}
            >
              <Text
                style={[
                  styles.permissionChipText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                All Screens Granted (Super Admin)
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.chipsWrap}>
            {activeScreens.length > 0 ? (
              activeScreens.map((screen) => (
                <View
                  key={screen}
                  style={[
                    styles.permissionChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(28, 25, 23, 0.05)',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(198, 151, 73, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.permissionChipText,
                      { color: isDark ? t.text : '#1C1917' },
                    ]}
                  >
                    {screen}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noPermissionsText, { color: t.textSubtle }]}>
                No screen permissions granted
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons Row (Only for non-owner staff) */}
      {!isOwner && (
        <View
          style={[
            styles.actionsRow,
            {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(198, 151, 73, 0.15)',
            },
          ]}
        >
          {isActive ? (
            /* ACTIVE STAFF ACTIONS: Permissions, Reset Password, Deactivate */
            <>
              {onEditPermissions && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                  ]}
                  onPress={() => onEditPermissions(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit permissions for ${member.username}`}
                >
                  <ShieldCheck
                    size={14}
                    color={isDark ? colors.gold[400] : colors.gold[600]}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: isDark ? colors.gold[400] : colors.gold[600] },
                    ]}
                  >
                    Permissions
                  </Text>
                </Pressable>
              )}

              {onResetPassword && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                  ]}
                  onPress={() => onResetPassword(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reset password for ${member.username}`}
                >
                  <KeyRound
                    size={14}
                    color={isDark ? colors.gold[400] : colors.gold[600]}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: isDark ? colors.gold[400] : colors.gold[600] },
                    ]}
                  >
                    Reset Password
                  </Text>
                </Pressable>
              )}

              {onDeactivate && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.deactivateBtn,
                    {
                      backgroundColor: isDark
                        ? colors.status.warning.bgDark
                        : colors.status.warning.bgLight,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                  onPress={() => onDeactivate(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`Deactivate staff member ${member.username}`}
                >
                  <UserX
                    size={14}
                    color={isDark ? colors.status.warning.dark : colors.status.warning.light}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color: isDark
                          ? colors.status.warning.dark
                          : colors.status.warning.light,
                      },
                    ]}
                  >
                    Deactivate
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            /* INACTIVE STAFF ACTIONS: Reactivate, Delete Permanently */
            <>
              {onReactivate && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    {
                      backgroundColor: isDark
                        ? colors.status.success.bgDark
                        : colors.status.success.bgLight,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                  onPress={() => onReactivate(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reactivate staff member ${member.username}`}
                >
                  <UserCheck
                    size={14}
                    color={isDark ? colors.status.success.dark : colors.status.success.light}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color: isDark
                          ? colors.status.success.dark
                          : colors.status.success.light,
                      },
                    ]}
                  >
                    Reactivate
                  </Text>
                </Pressable>
              )}

              {onDelete && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.deactivateBtn,
                    {
                      backgroundColor: isDark
                        ? colors.status.danger.bgDark
                        : colors.status.danger.bgLight,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                  onPress={() => onDelete(member)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete staff member ${member.username} permanently`}
                >
                  <Trash2
                    size={14}
                    color={isDark ? colors.status.danger.dark : colors.status.danger.light}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color: isDark
                          ? colors.status.danger.dark
                          : colors.status.danger.light,
                      },
                    ]}
                  >
                    Delete Permanently
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 14,
  },
  inactiveCard: {
    opacity: 0.65,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  joinedText: {
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  permissionsSection: {
    marginTop: 2,
    marginBottom: 8,
  },
  permissionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  permissionChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noPermissionsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    minHeight: 36,
  },
  deactivateBtn: {
    marginLeft: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

