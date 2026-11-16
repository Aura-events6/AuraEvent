import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { CreditCard, AlertCircle, Clock } from 'lucide-react-native';
import { KhatabookSummaryMetrics, KhatabookFilter } from '../../types/khatabook';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

interface KhatabookSummaryHeaderProps {
  metrics: KhatabookSummaryMetrics;
  currencySymbol?: string;
  isDark?: boolean;
  selectedFilter?: KhatabookFilter;
  onSelectFilter?: (filter: KhatabookFilter) => void;
}

export const KhatabookSummaryHeader: React.FC<KhatabookSummaryHeaderProps> = ({
  metrics,
  currencySymbol = '₹',
  isDark = false,
  selectedFilter,
  onSelectFilter,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const t = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.container}>
      {/* 1. HERO CARD: TOTAL OUTSTANDING (Full-width on mobile, 1/3 on desktop) */}
      <Pressable
        onPress={() => onSelectFilter?.('all')}
        style={({ pressed }) => [
          styles.metricCard,
          isMobile ? styles.heroCardMobile : styles.desktopCard,
          glassStyles.getCardStyle(isDark),
          {
            borderColor:
              selectedFilter === 'all'
                ? isDark ? colors.gold[400] : colors.gold[600]
                : isDark ? 'rgba(214, 174, 107, 0.35)' : 'rgba(198, 151, 73, 0.30)',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Total Outstanding Dues: ${metrics.totalOutstanding} for ${metrics.counts.all} customers`}
      >
        <View style={styles.heroLeft}>
          <View style={styles.cardTopRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.cardLabel,
                { color: isDark ? colors.gold[400] : colors.gold[700] },
              ]}
            >
              Total Outstanding
            </Text>
            <Text numberOfLines={1} style={[styles.cardSubtext, { color: t.textMuted }]}>
              {metrics.counts.all} Customer{metrics.counts.all === 1 ? '' : 's'}
            </Text>
          </View>
          <RollingNumberTicker
            targetValue={metrics.totalOutstanding}
            isCurrency
            prefix={currencySymbol}
            duration={520}
            style={[
              styles.heroAmount,
              { color: isDark ? colors.gold[400] : colors.gold[600] },
            ]}
          />
        </View>

        <View
          style={[
            styles.heroIconBox,
            {
              backgroundColor: isDark
                ? 'rgba(214, 174, 107, 0.15)'
                : 'rgba(198, 151, 73, 0.14)',
            },
          ]}
        >
          <CreditCard
            size={isMobile ? 22 : 18}
            color={isDark ? colors.gold[400] : colors.gold[600]}
          />
        </View>
      </Pressable>

      {/* 2. SPLIT ROW: OVERDUE & UPCOMING (Side by Side on mobile, row siblings on desktop) */}
      <View style={isMobile ? styles.splitRowMobile : styles.desktopRowWrap}>
        {/* Overdue Card */}
        <Pressable
          onPress={() => onSelectFilter?.('overdue')}
          style={({ pressed }) => [
            styles.metricCard,
            styles.halfCard,
            glassStyles.getCardStyle(isDark),
            {
              borderColor:
                metrics.totalOverdue > 0
                  ? selectedFilter === 'overdue'
                    ? '#EF4444'
                    : isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(220, 38, 38, 0.40)'
                  : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Overdue Dues: ${metrics.totalOverdue} for ${metrics.counts.overdue} past events`}
        >
          <View style={styles.cardTop}>
            <Text numberOfLines={1} style={[styles.cardLabel, { color: colors.status.danger.light }]}>
              Overdue
            </Text>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(239, 68, 68, 0.12)',
                },
              ]}
            >
              <AlertCircle size={15} color="#EF4444" />
            </View>
          </View>

          <RollingNumberTicker
            targetValue={metrics.totalOverdue}
            isCurrency
            prefix={currencySymbol}
            duration={520}
            style={[styles.cardAmount, { color: '#EF4444' }]}
          />

          <Text numberOfLines={1} style={[styles.cardSubtext, { color: colors.status.danger.light }]}>
            {metrics.counts.overdue} Past Event{metrics.counts.overdue === 1 ? '' : 's'}
          </Text>
        </Pressable>

        {/* Upcoming Card */}
        <Pressable
          onPress={() => onSelectFilter?.('upcoming')}
          style={({ pressed }) => [
            styles.metricCard,
            styles.halfCard,
            glassStyles.getCardStyle(isDark),
            {
              borderColor:
                metrics.totalUpcoming > 0
                  ? selectedFilter === 'upcoming'
                    ? '#D97706'
                    : isDark ? 'rgba(245, 158, 11, 0.40)' : 'rgba(217, 119, 6, 0.35)'
                  : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Upcoming Dues: ${metrics.totalUpcoming} for ${metrics.counts.upcoming} future events`}
        >
          <View style={styles.cardTop}>
            <Text numberOfLines={1} style={[styles.cardLabel, { color: '#D97706' }]}>
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

          <Text numberOfLines={1} style={[styles.cardSubtext, { color: t.textMuted }]}>
            {metrics.counts.upcoming} Future Event{metrics.counts.upcoming === 1 ? '' : 's'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 10,
  },
  metricCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    minHeight: 96,
    overflow: 'hidden',
  },
  heroCardMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 82,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 11,
    fontWeight: '600',
  },
  splitRowMobile: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCard: {
    flex: 1,
  },
  desktopCard: {
    flex: 1,
  },
  desktopRowWrap: {
    flexDirection: 'row',
    flex: 2,
    gap: 10,
  },
});
