import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Shield, ShieldCheck } from 'lucide-react-native';
import { UserRole } from '../types';
import { colors } from '../theme/colors';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'small' }) => {
  const isSuperAdmin = role === 'superadmin';
  const isOwner = role === 'owner';

  const badgeStyle = isSuperAdmin
    ? styles.superAdminBadge
    : isOwner
    ? styles.ownerBadge
    : styles.staffBadge;

  const textStyle = isSuperAdmin
    ? styles.superAdminText
    : isOwner
    ? styles.ownerText
    : styles.staffText;

  const label = isSuperAdmin ? 'SuperAdmin' : isOwner ? 'Owner' : 'Staff';

  const icon = isSuperAdmin ? (
    <ShieldCheck size={size === 'medium' ? 14 : 12} color={colors.gold[400]} />
  ) : isOwner ? (
    <Crown size={size === 'medium' ? 14 : 12} color={colors.gold[400]} />
  ) : (
    <Shield size={size === 'medium' ? 14 : 12} color="#60A5FA" />
  );

  return (
    <View style={[styles.badge, badgeStyle, size === 'medium' && styles.badgeMedium]}>
      {icon}
      <Text style={[styles.text, textStyle, size === 'medium' && styles.textMedium]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  superAdminBadge: {
    backgroundColor: 'rgba(214, 174, 107, 0.22)',
    borderWidth: 1.2,
    borderColor: 'rgba(214, 174, 107, 0.55)',
  },
  ownerBadge: {
    backgroundColor: 'rgba(229, 184, 66, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(229, 184, 66, 0.3)',
  },
  staffBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textMedium: {
    fontSize: 12,
  },
  superAdminText: {
    color: colors.gold[400],
  },
  ownerText: {
    color: colors.gold[400],
  },
  staffText: {
    color: '#93C5FD',
  },
});
