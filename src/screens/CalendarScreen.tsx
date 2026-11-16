import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Pressable,
  LayoutAnimation,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { glassStyles } from '../theme/glass';
import {
  WeeklyCalendarResponse,
  BookingSlot,
  CalendarBooking,
  SlotMode,
} from '../types/calendar';
import {
  getMondayOfWeek,
  get7DaysOfWeek,
  formatLocalDate,
  formatWeekRangeHeader,
  getWeekLabel,
  isSlotElapsed,
  getTomorrowDate,
} from '../utils/dateUtils';
import { useRealtimeCalendar } from '../hooks/useRealtimeCalendar';
import { useNavigation } from '@react-navigation/native';
import { fetchWeeklyCalendar } from '../services/calendarService';
import { ScreenBackground } from '../components/common';
import {
  SummaryRevenueHeader,
  WeekSelector,
  MonthPickerModal,
  DateRowItem,
} from '../components/calendar';
import { Alert } from 'react-native';

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, theme, hall, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  // Selected week starting Monday
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [calendarData, setCalendarData] = useState<WeeklyCalendarResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Month Picker Modal
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);

  // Scroll position & header compression
  const scrollY = useRef(new Animated.Value(0)).current;

  // Progressive Brand Emblem Blur-Up on mount
  const emblemScaleAnim = useRef(new Animated.Value(1.06)).current;
  const emblemOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(emblemScaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(emblemOpacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [emblemScaleAnim, emblemOpacityAnim]);

  // Interpolated header compression
  const headerPaddingV = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [14, 8],
    extrapolate: 'clamp',
  });

  const headerRadius = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [20, 16],
    extrapolate: 'clamp',
  });

  const scrollEmblemScale = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });

  // Compute 7 days of the selected week
  const weekDays = useMemo(() => get7DaysOfWeek(currentMonday), [currentMonday]);
  const startDateStr = weekDays[0].dateStr;
  const endDateStr = weekDays[6].dateStr;

  const weekInfo = useMemo(() => getWeekLabel(currentMonday), [currentMonday]);
  const weekRangeLabel = useMemo(
    () => formatWeekRangeHeader(startDateStr, endDateStr),
    [startDateStr, endDateStr]
  );

  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  /**
   * Loads live calendar from Supabase RPC get_weekly_calendar
   */
  const loadCalendar = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (!isManualRefresh) setLoading(true);
        const data = await fetchWeeklyCalendar(startDateStr, endDateStr, () => logoutRef.current());
        if (data) {
          setCalendarData(data);
        }
      } catch (err) {
        console.warn('Failed to load weekly calendar:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDateStr, endDateStr]
  );

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  // When hall slot mode or settings change, automatically refresh weekly calendar to redraw slots
  useEffect(() => {
    if (hall?.slotMode) {
      loadCalendar(true);
    }
  }, [hall?.slotMode, hall?.name]);

  // Realtime WebSocket Subscription
  const activeHallId = hall?.id || calendarData?.hall?.id;
  const handleCalendarChange = useCallback(() => {
    loadCalendar(true);
  }, [loadCalendar]);

  const { syncStatus } = useRealtimeCalendar(activeHallId, handleCalendarChange);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCalendar(true);
  };

  // Week navigation with smooth FLIP layout transition
  const handlePrevWeek = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonday(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonday(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleSelectWeekNumber = (weekNum: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentMonday(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      const firstDay = new Date(year, month, 1);
      const firstMonday = getMondayOfWeek(firstDay);
      const targetMonday = new Date(firstMonday);
      targetMonday.setDate(targetMonday.getDate() + (weekNum - 1) * 7);
      return targetMonday;
    });
  };

  const handleSelectMonthYear = (year: number, monthIndex: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const firstOfMonth = new Date(year, monthIndex, 1);
    setCurrentMonday(getMondayOfWeek(firstOfMonth));
  };

  // Determine active slot mode from hall settings
  const currentSlotMode: SlotMode =
    (hall?.slotMode === 'full-day' || hall?.slotMode === 'full_day'
      ? 'full_day'
      : (calendarData?.hall?.slot_mode as SlotMode) || 'two_slots');

  const activeBookings = calendarData?.bookings || [];
  const currencySymbol = calendarData?.hall?.currency_symbol || '₹';

  // Strict Role & Screen Permission Enforcement
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const canAccessCalendar = isOwner || Boolean(user?.screenAccess?.calendar);

  if (!canAccessCalendar) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.accessRestrictedWrap}>
          <View
            style={[
              styles.restrictedIconBox,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
            ]}
          >
            <ShieldAlert
              size={44}
              color={isDark ? colors.status.danger.dark : colors.status.danger.light}
            />
          </View>
          <Text style={[styles.restrictedTitle, { color: t.text }]}>
            Calendar Access Restricted
          </Text>
          <Text style={[styles.restrictedSubtitle, { color: t.textMuted }]}>
            Your staff account does not have permission to view or manage bookings on the Calendar. Please contact the Hall Owner to grant access.
          </Text>
          <TouchableOpacity
            style={[
              styles.backToHomeBtn,
              { backgroundColor: isDark ? colors.dark.card : colors.light.card },
            ]}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={[styles.backToHomeBtnText, { color: t.text }]}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* HEADER: Brand Emblem, Hall Name & Live Sync Indicator with Sticky Compression */}
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
              paddingVertical: headerPaddingV,
              borderRadius: headerRadius,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <Animated.View
              style={{
                opacity: emblemOpacityAnim,
                transform: [
                  { scale: Animated.multiply(emblemScaleAnim, scrollEmblemScale) },
                ],
              }}
            >
              <LinearGradient colors={colors.goldGradient} style={styles.headerEmblem}>
                <Crown size={20} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>
                  {calendarData?.hall?.name || hall?.name || 'Aura Convention'}
                </Text>
              </View>
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                Calendar & Slot Availability
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isMobile ? 16 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.gold[500]}
            colors={[colors.gold[500]]}
          />
        }
      >
        {/* REVENUE AGGREGATION HEADER */}
        <SummaryRevenueHeader
          summary={calendarData?.summary}
          currencySymbol={currencySymbol}
          isDark={isDark}
          loading={loading || refreshing}
          onPressPendingDue={() => {
            navigation.navigate('Khatabook');
          }}
        />

        {/* WEEK SELECTOR & MONTH JUMP */}
        <WeekSelector
          startDateStr={startDateStr}
          endDateStr={endDateStr}
          weekRangeLabel={weekRangeLabel}
          monthYearLabel={weekInfo.monthYearLabel}
          weekNumber={weekInfo.weekNumber}
          totalWeeks={weekInfo.totalWeeks}
          isDark={isDark}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onSelectWeekNumber={handleSelectWeekNumber}
          onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
        />

        {/* LOADING INDICATOR */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.gold[500]} />
            <Text style={[styles.loadingText, { color: t.textMuted }]}>
              Syncing week availability...
            </Text>
          </View>
        ) : (
          /* 7-DAY DATE & SLOT ROWS */
          <View style={styles.daysList}>
            {weekDays.map((day, idx) => (
              <DateRowItem
                key={day.dateStr}
                dateStr={day.dateStr}
                dayName={day.dayName}
                dayNumber={day.dayNumber}
                monthName={day.monthName}
                isToday={day.isToday}
                slotMode={currentSlotMode}
                bookings={activeBookings}
                currencySymbol={currencySymbol}
                isDark={isDark}
                index={idx}
                onPressFreeSlot={(dateStr, slot) => {
                  const isElapsed = isSlotElapsed(dateStr, slot);
                  const targetDate = isElapsed ? getTomorrowDate() : dateStr;
                  navigation.navigate('BookingForm', {
                    mode: 'create',
                    initialDate: targetDate,
                    initialSlot: slot,
                    wasElapsedNotice: isElapsed,
                  });
                }}
                onPressBooking={bookingId => {
                  const targetBooking = calendarData?.bookings?.find(b => b.booking_id === bookingId);
                  const isElapsed = targetBooking
                    ? isSlotElapsed(targetBooking.start_date, targetBooking.slot)
                    : false;
                  navigation.navigate('BookingDetails', {
                    bookingId,
                    isElapsed,
                  });
                }}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* MONTH PICKER MODAL */}
      <MonthPickerModal
        visible={isMonthPickerOpen}
        selectedDate={currentMonday}
        isDark={isDark}
        onClose={() => setIsMonthPickerOpen(false)}
        onSelectMonthYear={handleSelectMonthYear}
      />
    </SafeAreaView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingBottom: 10,
  },
  headerContainer: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerEmblem: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    maxWidth: 160,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 110, // Space for floating bottom tab bar
    paddingTop: 6,
  },
  loadingBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  daysList: {
    marginTop: 4,
  },
  accessRestrictedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 420,
    alignSelf: 'center',
  },
  restrictedIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  restrictedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  backToHomeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.3)',
  },
  backToHomeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
