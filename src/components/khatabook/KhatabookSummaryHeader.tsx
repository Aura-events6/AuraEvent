import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { CreditCard, AlertCircle, Clock } from 'lucide-react-native';
import { KhatabookSummaryMetrics } from '../../types/khatabook';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

interface KhatabookSummaryHeaderProps {
  metrics: KhatabookSummaryMetrics;
  currencySymbol?: string;
  isDark?: boolean;
}

export const KhatabookSummaryHeader: React.FC<KhatabookSummaryHeaderProps> = ({
  metrics,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // Ambient pulsing alert glow for overdue balances
  const overduePulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (metrics.totalOverdue > 0) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(overduePulseAnim, {
            toValue: 1.12,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(overduePulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      overduePulseAnim.setValue(1);
    }

    return () => {
      if (animation) animation.stop();
    };
  }, [metrics.totalOverdue]);

  return (
    <View style={styles.container}>
      {/* 1. Total Outstanding */}
      <Pressable
        style={({ pressed }) => [
          styles.metricCard,
          glassStyles.getCardStyle(isDark),
          {
            borderColor: isDark
              ? 'rgba(214, 174, 107, 0.35)'
              : 'rgba(198, 151, 73, 0.35)',
            transform: [{ scale: pressed ? 0.965 : 1 }],
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Total Outstanding Dues: ${metrics.totalOutstanding} for ${metrics.counts.all} customers`}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.cardLabel, { color: t.textMuted }]}>
            Total Outstanding
          </Text>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? 'rgba(214, 174, 107, 0.15)'
                  : 'rgba(198, 151, 73, 0.14)',
              },
            ]}
          >
            <CreditCard
              size={15}
              color={isDark ? colors.gold[400] : colors.gold[600]}
            />
          </View>
        </View>

        <RollingNumberTicker
          targetValue={metrics.totalOutstanding}
          isCurrency
          prefix={currencySymbol}
          duration={520}
          style={[
            styles.cardAmount,
            { color: isDark ? colors.gold[400] : colors.gold[600] },
          ]}
        />

        <Text style={[styles.cardSubtext, { color: t.textMuted }]}>
          {metrics.counts.all} Customer{metrics.counts.all === 1 ? '' : 's'}
        </Text>
      </Pressable>

      {/* 2. Overdue Dues */}
      <Pressable
        style={({ pressed }) => [
          styles.metricCard,
          glassStyles.getCardStyle(isDark),
          {
            borderColor:
              metrics.totalOverdue > 0
                ? isDark
                  ? 'rgba(239, 68, 68, 0.40)'
                  : 'rgba(220, 38, 38, 0.35)'
                : isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            transform: [{ scale: pressed ? 0.965 : 1 }],
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Overdue Dues: ${metrics.totalOverdue} for ${metrics.counts.overdue} past events`}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.cardLabel, { color: colors.status.danger.light }]}>
            Overdue
          </Text>
          <Animated.View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(239, 68, 68, 0.12)',
                transform: [{ scale: overduePulseAnim }],
              },
            ]}
          >
            <AlertCircle size={15} color="#EF4444" />
          </Animated.View>
        </View>

        <RollingNumberTicker
          targetValue={metrics.totalOverdue}
          isCurrency
          prefix={currencySymbol}
          duration={520}
          style={[styles.cardAmount, { color: '#EF4444' }]}
        />

        <Text style={[styles.cardSubtext, { color: colors.status.danger.light }]}>
          {metrics.counts.overdue} Past Event{metrics.counts.overdue === 1 ? '' : 's'}
        </Text>
      </Pressable>

      {/* 3. Upcoming Dues */}
      <Pressable
        style={({ pressed }) => [
          styles.metricCard,
          glassStyles.getCardStyle(isDark),
          {
            borderColor: isDark
              ? 'rgba(245, 158, 11, 0.35)'
              : 'rgba(217, 119, 6, 0.30)',
            transform: [{ scale: pressed ? 0.965 : 1 }],
          },
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`Upcoming Dues: ${metrics.totalUpcoming} for ${metrics.counts.upcoming} future events`}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.cardLabel, { color: '#D97706' }]}>
            Upcoming
          </Text>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(245, 158, 11, 0.12)',
              },
            ]}
          >
            <Clock size={15} color="#D97706" />
          </View>
        </View>

        <RollingNumberTicker
          targetValue={metrics.totalUpcoming}
          isCurrency
          prefix={currencySymbol}
          duration={520}
          style={[styles.cardAmount, { color: '#D97706' }]}
        />

        <Text style={[styles.cardSubtext, { color: t.textMuted }]}>
          {metrics.counts.upcoming} Future Event{metrics.counts.upcoming === 1 ? '' : 's'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginVertical: 2,
  },
  cardSubtext: {
    fontSize: 11,
    fontWeight: '600',
  },
});

