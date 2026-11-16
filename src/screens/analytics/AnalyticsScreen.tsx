import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
} from 'react-native';
import {
  ArrowLeft,
  Crown,
  ShieldAlert,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import {
  DateRangeSelector,
  AnalyticsMetricCard,
  HorizontalBarChart,
} from '../../components/analytics';
import {
  fetchHallAnalytics,
  getDateRangeForPreset,
} from '../../services/analyticsService';
import {
  AnalyticsDateRange,
  HallAnalyticsData,
} from '../../types/analytics';
import { ScreenBackground } from '../../components/common';

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { hall, user, theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  // Security Check: Owner or Screen Access to Analytics
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const hasAnalyticsAccess = isOwner || Boolean((user as any)?.screenAccess?.analytics);

  const hallId = hall?.id || (user && 'hallId' in user ? (user as any).hallId : undefined);

  // Date Range State (defaults to "This Month")
  const [currentRange, setCurrentRange] = useState<AnalyticsDateRange>(() =>
    getDateRangeForPreset('this_month')
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HallAnalyticsData | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!hasAnalyticsAccess) {
      setLoading(false);
      return;
    }

    try {
      const result = await fetchHallAnalytics(
        currentRange.startDate,
        currentRange.endDate,
        hallId
      );
      setData(result);
    } catch (err) {
      console.error('Failed to load hall analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasAnalyticsAccess, currentRange.startDate, currentRange.endDate, hallId]);

  useEffect(() => {
    setLoading(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleRangeChange = (newRange: AnalyticsDateRange) => {
    setCurrentRange(newRange);
  };

  // If user does not have permission, show security restricted screen
  if (!hasAnalyticsAccess) {
    return (
      <ScreenBackground isDark={isDark}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
          />
          <View style={styles.restrictedContainer}>
            <View
              style={[
                styles.lockIconWrap,
                {
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(220, 38, 38, 0.1)',
                },
              ]}
            >
              <ShieldAlert
                size={48}
                color={isDark ? colors.status.danger.dark : colors.status.danger.light}
              />
            </View>
            <Text style={[styles.restrictedTitle, { color: t.text }]}>
              Restricted Access
            </Text>
            <Text style={[styles.restrictedSub, { color: t.textMuted }]}>
              Executive financial intelligence and business reports are restricted to
              hall owners and authorized managers.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.backHomeBtn,
                { backgroundColor: colors.gold[500], transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
            >
              <Text style={styles.backHomeBtnText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />

      {/* Screen Header */}
      <View
        style={[
          styles.headerBar,
          {
            borderBottomColor: t.cardBorder,
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: isDark ? colors.dark.card : colors.light.card,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={t.text} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <View style={styles.headerTitleRow}>
            <Crown size={16} color={colors.gold[500]} />
            <Text style={[styles.headerTitle, { color: t.text }]}>
              Owner Analytics
            </Text>
          </View>
          <Text style={[styles.headerSub, { color: t.textSubtle }]} numberOfLines={1}>
            {hall?.name || 'Aura Executive'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold[500]}
            colors={[colors.gold[500]]}
          />
        }
      >
        {/* Date Range Selector */}
        <DateRangeSelector
          selectedRange={currentRange}
          onSelectRange={handleRangeChange}
          isDark={isDark}
        />

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold[500]} />
            <Text style={[styles.loadingText, { color: t.textMuted }]}>
              Computing business metrics...
            </Text>
          </View>
        ) : data ? (
          <>
            {/* Executive Cards Section */}
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? colors.gold[400] : colors.gold[700] },
                ]}
              >
                EXECUTIVE SUMMARY
              </Text>
              <Text style={[styles.periodBadge, { color: t.textMuted }]}>
                {currentRange.label}
              </Text>
            </View>

            <View style={styles.cardsGrid}>
              {/* Card 1: Contract Expected */}
              <View style={styles.gridCardCol}>
                <AnalyticsMetricCard
                  variant="expected"
                  title="Contract Expected"
                  amount={data.executive.contractExpected.amount}
                  subtitle={`${data.executive.contractExpected.count} bookings scheduled`}
                  isDark={isDark}
                />
              </View>

              {/* Card 2: Net Cash Collected */}
              <View style={styles.gridCardCol}>
                <AnalyticsMetricCard
                  variant="collected"
                  title="Net Collected"
                  amount={data.executive.netCashCollected.amount}
                  subtitle={`${data.executive.netCashCollected.collectionRate}% collection rate`}
                  isDark={isDark}
                />
              </View>

              {/* Card 3: Operating Expenses */}
              <View style={styles.gridCardCol}>
                <AnalyticsMetricCard
                  variant="expense"
                  title="Operating Outflow"
                  amount={data.executive.totalExpenses?.amount || 0}
                  subtitle={`${data.executive.totalExpenses?.count || 0} disbursements • View`}
                  onPress={() => navigation.navigate('ExpenseTracker')}
                  isDark={isDark}
                />
              </View>

              {/* Card 4: Net Operating Profit */}
              <View style={styles.gridCardCol}>
                <AnalyticsMetricCard
                  variant="profit"
                  title="Operating Profit"
                  amount={data.executive.netOperatingProfit?.amount ?? (data.executive.netCashCollected.amount - (data.executive.totalExpenses?.amount || 0))}
                  subtitle={
                    (data.executive.netOperatingProfit?.amount ?? (data.executive.netCashCollected.amount - (data.executive.totalExpenses?.amount || 0))) >= 0
                      ? 'Net Cash Surplus'
                      : 'Operating Deficit'
                  }
                  isDark={isDark}
                />
              </View>

              {/* Card 5: Period Pending Dues */}
              <View style={styles.gridCardCol}>
                <AnalyticsMetricCard
                  variant="pending"
                  title="Pending Dues"
                  amount={data.executive.pendingDues.amount}
                  subtitle={`${data.executive.pendingDues.count} accounts outstanding`}
                  isDark={isDark}
                />
              </View>

              {/* Card 6: Cancellations */}
              <View style={styles.gridCardCol}>
                <AnalyticsMetricCard
                  variant="cancelled"
                  title="Refunds & Cancelled"
                  amount={data.executive.cancellations.refundAmount}
                  subtitle={`${data.executive.cancellations.count} cancelled`}
                  isDark={isDark}
                />
              </View>
            </View>

            {/* Visual Ranking Section */}
            <View style={styles.rankingsContainer}>
              <HorizontalBarChart
                title="Top Event Types"
                subtitle="Most frequent event occasions booked in this period"
                data={data.topEventTypes}
                isDark={isDark}
              />

              <HorizontalBarChart
                title="Top Packages"
                subtitle="Best performing package selections by client popularity"
                data={data.topPackages}
                isDark={isDark}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  periodBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  gridCardCol: {
    width: '50%',
    paddingHorizontal: 6,
  },
  rankingsContainer: {
    marginTop: 10,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  lockIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  restrictedSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  backHomeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  backHomeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
});
