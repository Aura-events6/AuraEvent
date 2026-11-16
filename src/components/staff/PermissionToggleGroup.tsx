import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Calendar,
  Search,
  BookOpen,
  BarChart3,
  Users,
  LucideIcon,
} from 'lucide-react-native';
import { ScreenAccessConfig } from '../../types/staff';
import { GoldSwitch } from '../GoldSwitch';
import { colors } from '../../theme/colors';

interface PermissionToggleGroupProps {
  permissions: ScreenAccessConfig;
  onChange: (updated: ScreenAccessConfig) => void;
  disabled?: boolean;
  isDark?: boolean;
}

interface PermissionItemDef {
  key: keyof ScreenAccessConfig;
  label: string;
  description: string;
  icon: LucideIcon;
}

const PERMISSION_DEFS: PermissionItemDef[] = [
  {
    key: 'calendar',
    label: 'Calendar & Bookings',
    description: 'View & manage date slots, new bookings and details',
    icon: Calendar,
  },
  {
    key: 'search',
    label: 'Customer Directory',
    description: 'Lookup customer contact history and previous bookings',
    icon: Search,
  },
  {
    key: 'khatabook',
    label: 'Khatabook Ledger',
    description: 'View outstanding dues, record payments and send receipts',
    icon: BookOpen,
  },
  {
    key: 'analytics',
    label: 'Financial Analytics',
    description: 'Access revenue metrics, booking volume, and reports',
    icon: BarChart3,
  },
  {
    key: 'users',
    label: 'Team Management',
    description: 'Invite team staff, manage permissions, and reset passwords',
    icon: Users,
  },
];

export const PermissionToggleGroup: React.FC<PermissionToggleGroupProps> = ({
  permissions,
  onChange,
  disabled = false,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const handleToggle = (key: keyof ScreenAccessConfig, val: boolean) => {
    onChange({
      ...permissions,
      [key]: val,
    });
  };

  return (
    <View style={styles.container}>
      {PERMISSION_DEFS.map((item, index) => {
        const Icon = item.icon;
        const isEnabled = Boolean(permissions[item.key]);
        const isLast = index === PERMISSION_DEFS.length - 1;

        return (
          <Pressable
            key={item.key}
            onPress={() => !disabled && handleToggle(item.key, !isEnabled)}
            style={({ pressed }) => [
              styles.row,
              {
                transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
              },
              !isLast && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(198, 151, 73, 0.12)',
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isEnabled }}
            accessibilityLabel={`${item.label}: ${isEnabled ? 'enabled' : 'disabled'}`}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isEnabled
                    ? isDark
                      ? colors.dark.accentBg
                      : colors.light.accentBg
                    : isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(28, 25, 23, 0.05)',
                },
              ]}
            >
              <Icon
                size={18}
                color={
                  isEnabled
                    ? isDark
                      ? colors.gold[400]
                      : colors.gold[600]
                    : isDark
                    ? colors.dark.textSubtle
                    : colors.light.textSubtle
                }
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: t.text }]}>{item.label}</Text>
              <Text style={[styles.description, { color: t.textMuted }]}>
                {item.description}
              </Text>
            </View>

            <View style={styles.switchContainer} pointerEvents="none">
              <GoldSwitch
                value={isEnabled}
                onValueChange={(val) => handleToggle(item.key, val)}
                disabled={disabled}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  description: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  switchContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 48,
    minHeight: 44,
  },
});

