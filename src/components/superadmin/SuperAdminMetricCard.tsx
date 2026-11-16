import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { useAuth } from '../../context/AuthContext';
import { motionTokens } from '../../theme/motion';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

export interface SuperAdminMetricCardProps {
  label: string;
  value: string;
  numericValue?: number;
  isCurrency?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'gold' | 'success' | 'info' | 'danger' | 'warning';
  onPress?: () => void;
  width?: string | number;
}

export const SuperAdminMetricCard: React.FC<SuperAdminMetricCardProps> = ({
  label,
  value,
  numericValue,
  isCurrency = false,
  subtitle,
  icon: Icon,
  variant = 'gold',
  onPress,
  width = '48%',
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.timing(scale, {
      toValue: 0.965,
      duration: motionTokens.durPress,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          iconColor: isDark ? colors.status.success.dark : colors.status.success.light,
          iconBg: isDark ? colors.status.success.bgDark : colors.status.success.bgLight,
          subColor: isDark ? colors.status.success.dark : colors.status.success.light,
          border: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
        };
      case 'info':
        return {
          iconColor: isDark ? colors.status.info.dark : colors.status.info.light,
          iconBg: isDark ? colors.status.info.bgDark : colors.status.info.bgLight,
          subColor: isDark ? colors.status.info.dark : colors.status.info.light,
          border: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.25)',
        };
      case 'danger':
        return {
          iconColor: isDark ? colors.status.danger.dark : colors.status.danger.light,
          iconBg: isDark ? colors.status.danger.bgDark : colors.status.danger.bgLight,
          subColor: isDark ? colors.status.danger.dark : colors.status.danger.light,
          border: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
        };
      case 'warning':
        return {
          iconColor: isDark ? colors.status.warning.dark : colors.status.warning.light,
          iconBg: isDark ? colors.status.warning.bgDark : colors.status.warning.bgLight,
          subColor: isDark ? colors.status.warning.dark : colors.status.warning.light,
          border: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
        };
      case 'gold':
      default:
        return {
          iconColor: isDark ? colors.gold[400] : colors.gold[600],
          iconBg: isDark ? colors.dark.accentBg : colors.light.accentBg,
          subColor: isDark ? colors.gold[400] : colors.gold[700],
          border: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
        };
    }
  };

  const v = getVariantStyles();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{ width: width as any }}
    >
      <Animated.View
        style={[
          styles.card,
          glassStyles.getCardStyle(isDark),
          { borderColor: v.border, width: '100%', transform: [{ scale }] },
        ]}
      >
        <View style={styles.contentCol}>
          <Text style={[styles.label, { color: t.textMuted }]}>{label}</Text>
          {numericValue !== undefined ? (
            <RollingNumberTicker
              targetValue={numericValue}
              isCurrency={isCurrency}
              style={[styles.value, { color: t.text }]}
              fallbackText={value}
            />
          ) : (
            <Text style={[styles.value, { color: t.text }]}>{value}</Text>
          )}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: v.subColor }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={[styles.iconBox, { backgroundColor: v.iconBg }]}>
          <Icon size={18} color={v.iconColor} strokeWidth={2.2} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 10,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

