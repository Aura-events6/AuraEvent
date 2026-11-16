import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  AlertTriangle,
  RotateCcw,
  Receipt,
  Wallet,
  LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

export type MetricVariant = 'expected' | 'collected' | 'pending' | 'cancelled' | 'expense' | 'profit';

interface AnalyticsMetricCardProps {
  variant: MetricVariant;
  title: string;
  amount: number;
  subtitle: string;
  isDark?: boolean;
  onPress?: () => void;
}

export const AnalyticsMetricCard: React.FC<AnalyticsMetricCardProps> = ({
  variant,
  title,
  amount,
  subtitle,
  isDark = true,
  onPress,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if ((variant === 'pending' || variant === 'cancelled') && amount > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [variant, amount, pulseAnim]);

  const isProfitNegative = variant === 'profit' && amount < 0;

  // Variant configs
  const config = {
    expected: {
      icon: Coins,
      color: isDark ? colors.gold[400] : colors.gold[600],
      bg: isDark ? colors.dark.accentBg : colors.light.accentBg,
      border: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.3)',
    },
    collected: {
      icon: TrendingUp,
      color: isDark ? colors.status.success.dark : colors.status.success.light,
      bg: isDark ? colors.status.success.bgDark : colors.status.success.bgLight,
      border: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.3)',
    },
    pending: {
      icon: AlertTriangle,
      color: isDark ? colors.status.warning.dark : colors.status.warning.light,
      bg: isDark ? colors.status.warning.bgDark : colors.status.warning.bgLight,
      border: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(245, 158, 11, 0.3)',
    },
    cancelled: {
      icon: RotateCcw,
      color: isDark ? colors.status.danger.dark : colors.status.danger.light,
      bg: isDark ? colors.status.danger.bgDark : colors.status.danger.bgLight,
      border: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.3)',
    },
    expense: {
      icon: Receipt,
      color: isDark ? '#F87171' : '#DC2626',
      bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(220, 38, 38, 0.1)',
      border: isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.3)',
    },
    profit: {
      icon: isProfitNegative ? TrendingDown : Wallet,
      color: isProfitNegative
        ? (isDark ? colors.status.danger.dark : colors.status.danger.light)
        : (isDark ? colors.gold[400] : colors.gold[600]),
      bg: isProfitNegative
        ? (isDark ? colors.status.danger.bgDark : colors.status.danger.bgLight)
        : (isDark ? colors.dark.accentBg : colors.light.accentBg),
      border: isProfitNegative
        ? (isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.3)')
        : (isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.3)'),
    },
  }[variant];

  const Icon: LucideIcon = config.icon;
  const isWarningVariant = (variant === 'pending' || variant === 'cancelled') && amount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        glassStyles.getCardStyle(isDark),
        {
          borderColor: config.border,
          transform: [{ scale: pressed ? 0.965 : 1 }],
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: t.textMuted }]}>{title}</Text>
        <Animated.View
          style={[
            styles.iconBox,
            { backgroundColor: config.bg },
            isWarningVariant ? { opacity: pulseAnim } : null,
          ]}
        >
          <Icon size={16} color={config.color} />
        </Animated.View>
      </View>

      <RollingNumberTicker
        targetValue={amount}
        isCurrency
        prefix="₹"
        style={[styles.amount, { color: t.text }]}
      />
      <Text style={[styles.subtitle, { color: config.color }]}>{subtitle}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

