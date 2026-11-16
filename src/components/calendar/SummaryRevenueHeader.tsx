import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Animated } from 'react-native';
import { Coins, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react-native';
import { CalendarSummary } from '../../types/calendar';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RollingNumberTicker, SkeletonShimmer } from '../dashboard';

interface SummaryRevenueHeaderProps {
  summary?: CalendarSummary | null;
  currencySymbol?: string;
  isDark?: boolean;
  loading?: boolean;
  onPressPendingDue?: () => void;
}

export const SummaryRevenueHeader: React.FC<SummaryRevenueHeaderProps> = ({
  summary,
  currencySymbol = '₹',
  isDark = false,
  loading = false,
  onPressPendingDue,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const t = isDark ? colors.dark : colors.light;

  const expectedRevenue = summary?.expected_revenue || 0;
  const collectedRevenue = summary?.collected_revenue || 0;
  const pendingBalance = summary?.pending_balance || 0;
  const totalBookings = summary?.total_bookings || 0;

  const collectionPercent =
    expectedRevenue > 0
      ? Math.round((collectedRevenue / expectedRevenue) * 100)
      : 100;

  // Pulsing glow for pending dues
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (pendingBalance > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pendingBalance, pulseAnim]);

  return (
    <View style={[styles.container, { gap: isMobile ? 10 : 14 }]}>
      {/* 1. Expected Revenue Card */}
      <View
        style={[
          styles.card,
          glassStyles.getCardStyle(isDark),
          { flex: 1, overflow: 'hidden' },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.label, { color: t.textMuted }]}>Expected</Text>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? 'rgba(229, 184, 66, 0.12)'
                  : 'rgba(198, 151, 73, 0.14)',
              },
            ]}
          >
            <Coins size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
          </View>
        </View>

        <RollingNumberTicker
          targetValue={expectedRevenue}
          isCurrency
          prefix={currencySymbol}
          style={[styles.amount, { color: t.text }]}
        />

        <Text style={[styles.subtext, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
          {totalBookings} {totalBookings === 1 ? 'Booking' : 'Bookings'}
        </Text>

        <SkeletonShimmer active={loading} borderRadius={16} />
      </View>

      {/* 2. Collected Revenue Card */}
      <View
        style={[
          styles.card,
          glassStyles.getCardStyle(isDark),
          { flex: 1, overflow: 'hidden' },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.label, { color: t.textMuted }]}>Collected</Text>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isDark
                  ? colors.status.success.bgDark
                  : colors.status.success.bgLight,
              },
            ]}
          >
            <CheckCircle2
              size={16}
              color={
                isDark ? colors.status.success.dark : colors.status.success.light
              }
            />
          </View>
        </View>

        <RollingNumberTicker
          targetValue={collectedRevenue}
          isCurrency
          prefix={currencySymbol}
          style={[styles.amount, { color: t.text }]}
        />

        <Text
          style={[
            styles.subtext,
            {
              color: isDark
                ? colors.status.success.dark
                : colors.status.success.light,
            },
          ]}
        >
          {collectionPercent}% Paid
        </Text>

        <SkeletonShimmer active={loading} borderRadius={16} />
      </View>

      {/* 3. Pending Balance / Khatabook Card (Interactive Pressable) */}
      <Pressable
        onPress={onPressPendingDue}
        style={({ pressed }) => [
          styles.card,
          glassStyles.getCardStyle(isDark),
          {
            flex: 1,
            overflow: 'hidden',
            transform: [{ scale: pressed ? 0.965 : 1 }],
            borderColor:
              pendingBalance > 0
                ? isDark
                  ? 'rgba(245, 158, 11, 0.45)'
                  : 'rgba(245, 158, 11, 0.55)'
                : undefined,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Pending balance: ${currencySymbol}${pendingBalance}. Tap to open dues.`}
      >
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.label,
              {
                color:
                  pendingBalance > 0
                    ? isDark
                      ? colors.status.warning.dark
                      : colors.status.warning.light
                    : t.textMuted,
              },
            ]}
          >
            Pending Due
          </Text>
          <Animated.View
            style={[
              styles.iconBox,
              {
                opacity: pendingBalance > 0 ? pulseAnim : 1,
                backgroundColor:
                  pendingBalance > 0
                    ? isDark
                      ? colors.status.warning.bgDark
                      : colors.status.warning.bgLight
                    : 'transparent',
              },
            ]}
          >
            <AlertCircle
              size={16}
              color={
                pendingBalance > 0
                  ? isDark
                    ? colors.status.warning.dark
                    : colors.status.warning.light
                  : t.textMuted
              }
            />
          </Animated.View>
        </View>

        <RollingNumberTicker
          targetValue={pendingBalance}
          isCurrency
          prefix={currencySymbol}
          style={[styles.amount, { color: t.text }]}
        />

        <View style={styles.khatabookLinkRow}>
          <Text
            style={[
              styles.subtext,
              {
                color: isDark ? colors.gold[400] : colors.gold[600],
                fontWeight: '700',
              },
            ]}
          >
            Dues Ledger
          </Text>
          <ArrowUpRight
            size={12}
            color={isDark ? colors.gold[400] : colors.gold[600]}
          />
        </View>

        <SkeletonShimmer active={loading} borderRadius={16} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '600',
  },
  khatabookLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

