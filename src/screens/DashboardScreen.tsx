import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Share,
  Platform,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Search,
  Coins,
  CheckCircle2,
  BookMarked,
  CalendarCheck,
  Send,
  FileText,
  X,
  Check,
  ChevronRight,
  MessageCircle,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { glassStyles } from '../theme/glass';
import {
  fetchDashboardYearKPIs,
  fetchDashboardPendingDues,
  fetchDashboardTimeline,
} from '../services/dashboardService';
import { recordPayment } from '../services/khatabookService';
import { ScreenBackground } from '../components/common';
import {
  DashboardYearKPIs,
  DashboardDueCardItem,
  DashboardTimelineRowItem,
} from '../types/dashboard';
import { EmptyStateCard } from '../components/EmptyStateCard';
import { useRealtimeCalendar } from '../hooks/useRealtimeCalendar';
import { useBackOverlay } from '../hooks/useBackOverlay';
import {
  RollingNumberTicker,
  SkeletonShimmer,
  DashboardPaymentModal,
  SwipeableTimelineCard,
} from '../components/dashboard';
import { motionTokens } from '../theme/motion';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, hall, theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  // Live Dashboard State
  const [kpis, setKpis] = useState<DashboardYearKPIs | null>(null);
  const [dues, setDues] = useState<DashboardDueCardItem[]>([]);
  const [timeline, setTimeline] = useState<DashboardTimelineRowItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);

  // Filter state for timeline
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'events'>('all');

  // Modals state
  const [selectedDue, setSelectedDue] = useState<DashboardDueCardItem | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [originCoords, setOriginCoords] = useState<{ x: number; y: number } | null>(null);

  // Wire screen-level modals to Central BackDispatcher (Rule 1)
  useBackOverlay(isWhatsAppModalOpen, () => setIsWhatsAppModalOpen(false));
  useBackOverlay(isSearchModalOpen, () => setIsSearchModalOpen(false));

  // Micro-interaction 6.2: Sticky Header Compression on Scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  // Micro-interaction 2.4: Progressive Brand Emblem Blur-Up
  const emblemBlurAnim = useRef(new Animated.Value(1.06)).current;
  useEffect(() => {
    Animated.timing(emblemBlurAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  // Micro-interaction 3.3: Sliding Tab Indicator for Timeline Filter
  const timelineFilterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(timelineFilterAnim, {
      toValue: timelineFilter === 'all' ? 0 : 1,
      tension: 65,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [timelineFilter]);

  // Micro-interaction 14/15: Animated Toast Slide-Up Banner
  const toastSlideAnim = useRef(new Animated.Value(40)).current;
  const toastFadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (toastMessage) {
      toastSlideAnim.setValue(40);
      toastFadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(toastSlideAnim, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(toastFadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  /**
   * Loads live dashboard data from PostgreSQL
   */
  const loadDashboardData = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);

        const currentHallId = hall?.id || (user as any)?.hallId;

        const [kpiRes, duesRes, timelineRes] = await Promise.all([
          fetchDashboardYearKPIs(currentHallId),
          fetchDashboardPendingDues(currentHallId),
          fetchDashboardTimeline(currentHallId),
        ]);

        setKpis(kpiRes);
        setDues(duesRes);
        setTimeline(timelineRes);
      } catch (err) {
        console.warn('[DashboardScreen] Error loading dashboard data:', err);
      } finally {
        if (!isSilent) setLoading(false);
        setRefreshing(false);
      }
    },
    [hall?.id, (user as any)?.hallId]
  );

  // Mount effect
  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  // Pull-to-refresh
  const handlePullRefresh = () => {
    setRefreshing(true);
    loadDashboardData(true);
  };

  // Realtime Live Sync: auto-refresh when booking or payment occurs
  useRealtimeCalendar(hall?.id || (user as any)?.hallId, () => {
    loadDashboardData(true);
  });

  // Micro-interaction 3.1: Coordinate-aware Collect Trigger
  const openCollectModal = (item: DashboardDueCardItem, e?: any) => {
    setSelectedDue(item);
    if (e && e.nativeEvent) {
      setOriginCoords({
        x: e.nativeEvent.pageX || windowWidth / 2,
        y: e.nativeEvent.pageY || 300,
      });
    } else {
      setOriginCoords(null);
    }
    setIsCollectModalOpen(true);
  };

  // Micro-interaction 2.3 & 5.2: Optimistic UI Insertion + FLIP Layout Reflow
  const handleConfirmPaymentModal = async (
    val: number,
    mode: 'UPI' | 'Cash' | 'Card',
    noteText: string,
    isSplit: boolean
  ) => {
    if (!selectedDue) return;

    // 1. FLIP Layout Reflow: animate removal of card
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDues(prev => prev.filter(d => d.id !== selectedDue.id));

    // 2. Optimistic Timeline row prepend
    const newRow: DashboardTimelineRowItem = {
      id: `opt-${Date.now()}`,
      timeLabel: 'Just now • Live Sync',
      title: `Payment Collected: ₹${val.toLocaleString('en-IN')}`,
      subtitle: `${selectedDue.customerName} (${selectedDue.eventType})`,
      category: 'payments',
      amount: `₹${val.toLocaleString('en-IN')}`,
    };
    setTimeline(prev => [newRow, ...prev]);

    // 3. Optimistic live KPI ticker update
    setKpis(prev => {
      if (!prev) return prev;
      const newCollected = prev.collectedRevenue + val;
      const newPending = Math.max(0, prev.pendingDueAmount - val);
      return {
        ...prev,
        collectedRevenue: newCollected,
        pendingDueAmount: newPending,
        formatted: {
          ...prev.formatted,
          collectedRevenue: `₹${(newCollected / 100000).toFixed(1)}L`,
          pendingDue: `₹${(newPending / 100000).toFixed(2)}L`,
        },
      };
    });

    showToast(`Collected ₹${val.toLocaleString('en-IN')} via ${mode}`);

    // 4. Authoritative backend RPC
    try {
      await recordPayment({
        bookingId: selectedDue.bookingId,
        amount: val,
        paymentMode: mode.toLowerCase() as any,
      });
      await loadDashboardData(true);
    } catch (err) {
      console.warn('Payment recording error:', err);
      await loadDashboardData(true);
    }
  };

  // WhatsApp Reminder modal handlers
  const openWhatsAppModal = (item: DashboardDueCardItem) => {
    setSelectedDue(item);
    setIsWhatsAppModalOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedDue) return;
    const msg = `Dear ${selectedDue.customerName}, gentle reminder regarding the pending balance of ${selectedDue.dueAmount} for your ${selectedDue.eventType} booked at ${hall?.name || user?.hallName || 'Royal Palace'}. Kindly settle at your convenience.`;
    setIsWhatsAppModalOpen(false);
    try {
      await Share.share({ message: msg });
    } catch {}
    showToast('Reminder shared with customer');
  };

  // Filtered timeline rows
  const filteredTimeline = timeline.filter(item => {
    if (timelineFilter === 'events') return item.category === 'events';
    return true;
  });

  // Max-4 overdue/pending cards constraint
  const displayedDues = dues.slice(0, 4);

  // Micro-interaction 6.2: Header Compression interpolations
  const headerPadding = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [12, 6],
    extrapolate: 'clamp',
  });
  const headerBorderRadius = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [22, 16],
    extrapolate: 'clamp',
  });
  const emblemScale = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. HEADER: BRAND EMBLEM + LIVE STATUS + SPOTLIGHT SEARCH */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Platform.OS === 'android' ? 26 : 10,
            paddingHorizontal: isMobile ? 16 : 24,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.headerContainer,
            glassStyles.getCardStyle(isDark),
            {
              paddingVertical: headerPadding,
              borderRadius: headerBorderRadius,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <Animated.View
              style={{
                transform: [
                  { scale: emblemScale },
                  { scale: emblemBlurAnim },
                ],
              }}
            >
              <LinearGradient colors={colors.goldGradient} style={styles.headerEmblem}>
                <Crown size={20} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <View style={styles.brandTextCol}>
              <View style={styles.titleWithLive}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.headerTitle, { color: t.text }]}
                >
                  {hall?.name || user?.hallName || 'Royal Palace'}
                </Text>
                <View
                  style={[
                    styles.liveBadge,
                    {
                      backgroundColor: isDark
                        ? colors.status.success.bgDark
                        : colors.status.success.bgLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.livePulseDot,
                      {
                        backgroundColor: isDark
                          ? colors.status.success.dark
                          : colors.status.success.light,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveText,
                      {
                        color: isDark
                          ? colors.status.success.dark
                          : colors.status.success.light,
                      },
                    ]}
                  >
                    Live
                  </Text>
                </View>
              </View>
              <Text numberOfLines={1} style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {new Date().toLocaleString('en-US', { month: 'short' })} {new Date().getFullYear()} • Operations
              </Text>
            </View>
          </View>

          {/* SEARCH BAR AT THE HEADER */}
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={({ pressed }) => [
              styles.headerSearchBar,
              {
                backgroundColor: isDark ? colors.dark.input : colors.light.input,
                borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search bookings, directory and clients"
          >
            <Search size={15} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.headerSearchText, { color: t.textMuted }]}>
              Search
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={isDark ? colors.gold[400] : colors.gold[600]}
            colors={[colors.gold[500]]}
          />
        }
      >

        {/* 2. 4 SIDE-BY-SIDE KPI CARDS WITH ROLLING TICKERS & SHIMMER */}
        <View style={styles.kpiGrid}>
          <SkeletonShimmer active={loading || refreshing} borderRadius={20} />

          {/* KPI 1: Expected Revenue */}
          <Pressable
            style={({ pressed }) => [
              styles.kpiCard,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.965 : 1 }] },
            ]}
            onPress={() => navigation.navigate('Analytics')}
            accessibilityRole="button"
            accessibilityLabel="View executive financial analytics"
          >
            <View>
              <Text style={[styles.kpiLabel, { color: t.textMuted }]}>Expected</Text>
              <RollingNumberTicker
                targetValue={kpis?.expectedRevenue ?? 0}
                isCurrency
                fallbackText={kpis ? kpis.formatted.expectedRevenue : '...'}
                style={[styles.kpiValue, { color: t.text }]}
              />
              <Text style={[styles.kpiSub, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                {kpis ? kpis.formatted.expectedBookings : '...'}
              </Text>
            </View>
            <View style={[styles.kpiIconBox, { backgroundColor: 'transparent' }]}>
              <Coins size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
          </Pressable>

          {/* KPI 2: Collected Revenue */}
          <View style={[styles.kpiCard, glassStyles.getCardStyle(isDark)]}>
            <View>
              <Text style={[styles.kpiLabel, { color: t.textMuted }]}>Collected</Text>
              <RollingNumberTicker
                targetValue={kpis?.collectedRevenue ?? 0}
                isCurrency
                fallbackText={kpis ? kpis.formatted.collectedRevenue : '...'}
                style={[styles.kpiValue, { color: t.text }]}
              />
              <Text style={[styles.kpiSub, { color: isDark ? colors.status.success.dark : colors.status.success.light }]}>
                {kpis ? kpis.formatted.collectedPercentage : '...'}
              </Text>
            </View>
            <View style={[styles.kpiIconBox, { backgroundColor: 'transparent' }]}>
              <CheckCircle2 size={18} color={isDark ? colors.status.success.dark : colors.status.success.light} />
            </View>
          </View>

          {/* KPI 3: Pending Balance (Khatabook) */}
          <Pressable
            onPress={() => navigation.navigate('Khatabook')}
            style={({ pressed }) => [
              styles.kpiCard,
              glassStyles.getCardStyle(isDark),
              {
                borderColor:
                  (kpis?.pendingDueAmount || 0) > 0
                    ? 'rgba(245, 158, 11, 0.4)'
                    : isDark
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(16, 185, 129, 0.25)',
                transform: [{ scale: pressed ? 0.965 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open Khatabook dues management"
          >
            <View>
              <Text
                style={[
                  styles.kpiLabel,
                  {
                    color:
                      (kpis?.overdueCount || 0) > 0
                        ? isDark
                          ? colors.status.danger.dark
                          : colors.status.danger.light
                        : isDark
                        ? colors.status.success.dark
                        : colors.status.success.light,
                  },
                ]}
              >
                Pending Due
              </Text>
              <RollingNumberTicker
                targetValue={kpis?.pendingDueAmount ?? 0}
                isCurrency
                fallbackText={kpis ? kpis.formatted.pendingDue : '...'}
                style={[styles.kpiValue, { color: t.text }]}
              />
              <Text
                style={[
                  styles.kpiSub,
                  {
                    color:
                      (kpis?.pendingDueAmount || 0) === 0
                        ? isDark
                          ? colors.status.success.dark
                          : colors.status.success.light
                        : isDark
                        ? colors.gold[400]
                        : colors.gold[600],
                  },
                ]}
              >
                {kpis ? kpis.formatted.pendingSub : '...'}
              </Text>
            </View>
            <View style={[styles.kpiIconBox, { backgroundColor: 'transparent' }]}>
              <BookMarked
                size={18}
                color={
                  (kpis?.pendingDueAmount || 0) === 0
                    ? isDark
                      ? colors.status.success.dark
                      : colors.status.success.light
                    : isDark
                    ? colors.status.danger.dark
                    : colors.status.danger.light
                }
              />
            </View>
          </Pressable>

          {/* KPI 4: Functions Done */}
          <View style={[styles.kpiCard, glassStyles.getCardStyle(isDark)]}>
            <View>
              <Text style={[styles.kpiLabel, { color: t.textMuted }]}>Completed</Text>
              <RollingNumberTicker
                targetValue={kpis?.completedCount ?? 0}
                fallbackText={kpis ? kpis.formatted.completedCount : '...'}
                style={[styles.kpiValue, { color: t.text }]}
              />
              <Text style={[styles.kpiSub, { color: t.textMuted }]}>
                {kpis ? kpis.formatted.upcomingCount : '...'}
              </Text>
            </View>
            <View style={[styles.kpiIconBox, { backgroundColor: 'transparent' }]}>
              <CalendarCheck size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
          </View>
        </View>

        {/* 3. CARD CAROUSEL: PENDING DUES (MAX 4 OVERDUES + VIEW ALL) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Pending Dues</Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor:
                    (kpis?.overdueCount || 0) > 0
                      ? isDark
                        ? colors.status.danger.bgDark
                        : colors.status.danger.bgLight
                      : isDark
                      ? colors.status.success.bgDark
                      : colors.status.success.bgLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  {
                    color:
                      (kpis?.overdueCount || 0) > 0
                        ? isDark
                          ? colors.status.danger.dark
                          : colors.status.danger.light
                        : isDark
                        ? colors.status.success.dark
                        : colors.status.success.light,
                  },
                ]}
              >
                {dues.length}
              </Text>
            </View>
          </View>

          {/* View All Button in Section Header -> Navigates to Bookings Calendar */}
          <Pressable
            onPress={() => navigation.navigate('Calendar')}
            style={({ pressed }) => [
              styles.viewAllHeaderBtn,
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View all bookings in calendar"
          >
            <Text style={[styles.carouselHint, { color: isDark ? colors.gold[400] : colors.gold[700], fontWeight: '700' }]}>
              View All Bookings →
            </Text>
          </Pressable>
        </View>

        {/* Carousel Content or Bespoke Empty/Settled State Seal */}
        {dues.length === 0 ? (
          <View style={[styles.settledDuesCard, glassStyles.getCardStyle(isDark)]}>
            <View
              style={[
                styles.settledCheckBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'rgba(16, 185, 129, 0.12)',
                },
              ]}
            >
              <Check size={24} color="#10B981" strokeWidth={2.8} />
            </View>
            <Text style={[styles.settledDuesTitle, { color: t.text }]}>
              All Customer Dues Settled!
            </Text>
            <Text style={[styles.settledDuesSub, { color: t.textMuted }]}>
              Zero pending balances in your Khatabook.
            </Text>
          </View>
        ) : (
          <View style={{ position: 'relative' }}>
            <SkeletonShimmer active={loading || refreshing} borderRadius={24} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.duesCarousel}>
              {/* Max 4 Cards Rendered with Tactile Controls */}
              {displayedDues.map(item => (
                <View key={item.id} style={[styles.dueCard, glassStyles.getCardStyle(isDark)]}>
                  <View style={styles.dueCardTop}>
                    <View
                      style={[
                        styles.dueBadge,
                        {
                          backgroundColor:
                            item.status === 'Overdue'
                              ? isDark
                                ? colors.status.danger.bgDark
                                : colors.status.danger.bgLight
                              : isDark
                              ? colors.dark.accentBg
                              : colors.light.accentBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dueBadgeText,
                          {
                            color:
                              item.status === 'Overdue'
                                ? isDark
                                  ? colors.status.danger.dark
                                  : colors.status.danger.light
                                : isDark
                                ? colors.gold[400]
                                : colors.gold[700],
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                    <Text style={[styles.dueDate, { color: t.textMuted }]}>{item.eventDate}</Text>
                  </View>

                  <Text style={[styles.dueCustomer, { color: t.text }]} numberOfLines={1}>
                    {item.customerName}
                  </Text>
                  <Text style={[styles.dueEvent, { color: t.textMuted }]}>{item.eventType}</Text>

                  <View style={[styles.dueDivider, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(198,151,73,0.18)' }]}>
                    <Text style={[styles.dueAmountLabel, { color: t.textMuted }]}>Due</Text>
                    <Text
                      style={[
                        styles.dueAmountValue,
                        {
                          color:
                            item.status === 'Overdue'
                              ? isDark
                                ? colors.status.danger.dark
                                : colors.status.danger.light
                              : isDark
                              ? colors.gold[400]
                              : colors.gold[700],
                        },
                      ]}
                    >
                      {item.dueAmount}
                    </Text>
                  </View>

                  <View style={styles.dueActionsRow}>
                    <Pressable
                      onPress={(e) => openCollectModal(item, e)}
                      style={({ pressed }) => [
                        styles.collectBtnWrapper,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] },
                      ]}
                    >
                      <LinearGradient colors={colors.goldGradient} style={styles.collectBtn}>
                        <Text style={styles.collectBtnText}>Collect</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => openWhatsAppModal(item)}
                      style={({ pressed }) => [
                        styles.whatsappBtn,
                        {
                          backgroundColor: isDark ? colors.status.success.bgDark : colors.status.success.bgLight,
                          transform: [{ scale: pressed ? 0.93 : 1 }],
                        },
                      ]}
                    >
                      <MessageCircle size={18} color={isDark ? colors.status.success.dark : colors.status.success.light} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {/* Sleek Carousel Tail Card -> Navigates to Bookings Calendar */}
              <Pressable
                onPress={() => navigation.navigate('Calendar')}
                style={({ pressed }) => [
                  styles.viewAllTailCard,
                  glassStyles.getCardStyle(isDark),
                  { transform: [{ scale: pressed ? 0.965 : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open all bookings in master calendar"
              >
                <View
                  style={[
                    styles.viewAllTailIconCircle,
                    {
                      backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg,
                      borderColor: isDark ? colors.gold[500] : colors.gold[600],
                    },
                  ]}
                >
                  <ChevronRight
                    size={20}
                    color={isDark ? colors.gold[400] : colors.gold[700]}
                    strokeWidth={2.5}
                  />
                </View>
                <Text
                  style={[
                    styles.viewAllTailOverline,
                    { color: isDark ? colors.gold[400] : colors.gold[700] },
                  ]}
                >
                  MASTER SCHEDULE
                </Text>
                <Text style={[styles.viewAllTailTitle, { color: t.text }]}>
                  View All Bookings
                </Text>
                <Text style={[styles.viewAllTailSub, { color: t.textMuted }]}>
                  {dues.length > 4
                    ? `+${dues.length - 4} more dues in ledger`
                    : 'Explore calendar slots'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* 4. COMPLETED TIMELINE (LEFT-RAIL CHRONOLOGICAL) */}
        <View style={styles.timelineHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Completed Timeline</Text>
            <View style={[styles.chronBadge, { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg }]}>
              <Text style={[styles.chronBadgeText, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                Live Sync
              </Text>
            </View>
          </View>

          {/* 3.3 Sliding Pill with Overshoot Spring */}
          <View style={[styles.filterCapsule, glassStyles.getCardStyle(isDark)]}>
            <Animated.View
              style={[
                styles.slidingFilterPill,
                {
                  left: timelineFilterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['2%', '51%'],
                  }),
                  backgroundColor: isDark ? colors.gold[400] : colors.gold[600],
                },
              ]}
            />

            <Pressable
              onPress={() => setTimelineFilter('all')}
              style={({ pressed }) => [
                styles.filterTab,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: timelineFilter === 'all' ? '#121212' : t.textMuted,
                    fontWeight: timelineFilter === 'all' ? '800' : '600',
                  },
                ]}
              >
                All
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTimelineFilter('events')}
              style={({ pressed }) => [
                styles.filterTab,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color: timelineFilter === 'events' ? '#121212' : t.textMuted,
                    fontWeight: timelineFilter === 'events' ? '800' : '600',
                  },
                ]}
              >
                Events
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 6.1 Vertical Connected Railway Timeline with Swipe-to-Action Gestures */}
        {filteredTimeline.length === 0 ? (
          <EmptyStateCard
            variant="timeline-empty"
            onAction={() => navigation.navigate('Calendar')}
            style={{ marginTop: 6 }}
          />
        ) : (
          <View style={styles.timelineList}>
            <SkeletonShimmer active={loading || refreshing} borderRadius={16} />
            {filteredTimeline.map((item, idx) => (
              <SwipeableTimelineCard
                key={item.id}
                item={item}
                isLast={idx === filteredTimeline.length - 1}
                isDark={isDark}
                onAction={timelineItem => {
                  if (timelineItem.billNumber) {
                    showToast('Bill opened');
                  } else {
                    showToast(`Receipt for ${timelineItem.title} accessed`);
                  }
                }}
              />
            ))}
          </View>
        )}

      </Animated.ScrollView>

      {/* 14/15. ANIMATED TOAST SLIDE-UP BANNER */}
      {toastMessage ? (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastFadeAnim,
              transform: [{ translateY: toastSlideAnim }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.toastCard, glassStyles.getCardStyle(isDark)]}>
            <CheckCircle2 size={16} color={colors.status.success.light} />
            <Text style={[styles.toastText, { color: t.text }]}>{toastMessage}</Text>
          </View>
        </Animated.View>
      ) : null}

      {/* 2.2 & 3.1 & 3.4 & 4.1 HIGH-FIDELITY DASHBOARD PAYMENT MODAL */}
      <DashboardPaymentModal
        visible={isCollectModalOpen}
        selectedDue={selectedDue}
        onClose={() => setIsCollectModalOpen(false)}
        onConfirm={handleConfirmPaymentModal}
        isDark={isDark}
        originCoords={originCoords}
      />

      {/* WHATSAPP REMINDER MODAL */}
      <Modal
        visible={isWhatsAppModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsWhatsAppModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, glassStyles.getCardStyle(isDark)]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.text }]}>WhatsApp Reminder</Text>
              <Pressable
                onPress={() => setIsWhatsAppModalOpen(false)}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.90 : 1 }] }]}
                hitSlop={8}
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>
              Recipient: <Text style={{ fontWeight: '700', color: t.text }}>{selectedDue?.phone}</Text>
            </Text>

            <View style={[styles.waPreviewBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)' }]}>
              <Text style={[styles.waPreviewText, { color: t.text }]}>
                {`Dear ${selectedDue?.customerName},\n\nThis is a friendly reminder from ${hall?.name || user?.hallName || 'Royal Palace Conventions'}. The pending amount of ${selectedDue?.dueAmount} for your ${selectedDue?.eventType} booking is due.\n\nPlease clear the balance at your earliest convenience.`}
              </Text>
            </View>

            <Pressable
              onPress={handleSendWhatsApp}
              style={({ pressed }) => [
                { marginTop: 20 },
                { transform: [{ scale: pressed ? 0.965 : 1 }] },
              ]}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.modalPrimaryBtn}>
                <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Send on WhatsApp</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* SPOTLIGHT SEARCH MODAL */}
      <Modal
        visible={isSearchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSearchModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, glassStyles.getCardStyle(isDark)]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Spotlight Search</Text>
              <Pressable
                onPress={() => setIsSearchModalOpen(false)}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.90 : 1 }] }]}
                hitSlop={8}
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.searchInputRow, glassStyles.getInputStyle(isDark)]}>
              <Search size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search customer, booking ID, bill..."
                placeholderTextColor={t.textSubtle}
                style={[styles.spotlightInput, { color: t.text }]}
                autoFocus
              />
            </View>

            <Text style={[styles.searchQuickHeader, { color: t.textMuted }]}>Recent Bookings</Text>
            {dues.slice(0, 3).map(due => (
              <Pressable
                key={due.id}
                onPress={(e) => {
                  setIsSearchModalOpen(false);
                  openCollectModal(due, e);
                }}
                style={({ pressed }) => [
                  styles.searchResultRow,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <View>
                  <Text style={[styles.searchResultTitle, { color: t.text }]}>{due.customerName}</Text>
                  <Text style={[styles.searchResultSub, { color: t.textMuted }]}>{due.eventType} • {due.eventDate}</Text>
                </View>
                <Text
                  style={[
                    styles.searchResultAmount,
                    {
                      color:
                        due.status === 'Overdue'
                          ? isDark
                            ? colors.status.danger.dark
                            : colors.status.danger.light
                          : isDark
                          ? colors.gold[400]
                          : colors.gold[600],
                    },
                  ]}
                >
                  {due.dueAmount}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    marginBottom: 6,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  headerEmblem: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flexShrink: 0,
  },
  brandTextCol: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  titleWithLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    flexShrink: 0,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
  },
  headerSearchText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  searchPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  carouselHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewAllHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  duesCarousel: {
    gap: 12,
    paddingBottom: 8,
  },
  dueCard: {
    width: 250,
    padding: 16,
    borderRadius: 24,
  },
  dueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dueDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  dueCustomer: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  dueEvent: {
    fontSize: 11,
    fontWeight: '500',
  },
  dueDivider: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
    paddingTop: 8,
  },
  dueAmountLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  dueAmountValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  dueActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  collectBtnWrapper: {
    flex: 1,
  },
  collectBtn: {
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  whatsappBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllTailCard: {
    width: 170,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewAllTailIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  viewAllTailOverline: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  viewAllTailTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  viewAllTailSub: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  settledDuesCard: {
    borderRadius: 26,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  settledCheckBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  settledDuesTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  settledDuesSub: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  chronBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chronBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  filterCapsule: {
    position: 'relative',
    flexDirection: 'row',
    padding: 3,
    borderRadius: 20,
    minWidth: 140,
  },
  slidingFilterPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '47%',
    borderRadius: 16,
  },
  filterTab: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timelineList: {
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 58,
  },
  timelineLeftTime: {
    width: 65,
    paddingTop: 8,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  timelineTimePrimary: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineTimeSecondary: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  timelineRailContainer: {
    width: 24,
    alignItems: 'center',
  },
  railSpine: {
    width: 2,
    flex: 1,
  },
  railNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 6,
  },
  timelineCardContent: {
    flex: 1,
    marginRight: 8,
  },
  timelineCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineCardSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  billButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  billButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineAmountBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    padding: 22,
    borderRadius: 26,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 10,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalTextInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  modeChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  waPreviewBox: {
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  waPreviewText: {
    fontSize: 12,
    lineHeight: 18,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    marginBottom: 14,
  },
  spotlightInput: {
    flex: 1,
    fontSize: 14,
  },
  searchQuickHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  searchResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,151,73,0.1)',
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchResultSub: {
    fontSize: 11,
    marginTop: 2,
  },
  searchResultAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
});
