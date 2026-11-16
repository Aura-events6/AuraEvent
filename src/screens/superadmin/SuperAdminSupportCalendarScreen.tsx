import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  ShieldAlert,
  Lock,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { fetchHallSupportBookings } from '../../services/superadminService';
import { SuperAdminHallItem } from '../../types/superadmin';
import {
  getMondayOfWeek,
  get7DaysOfWeek,
  formatLocalDate,
  formatWeekRangeHeader,
  getWeekLabel,
} from '../../utils/dateUtils';
import { WeekSelector, MonthPickerModal } from '../../components/calendar';

type SupportCalendarRouteParams = {
  SuperAdminSupportCalendar: {
    hall: SuperAdminHallItem;
  };
};

export const SuperAdminSupportCalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SupportCalendarRouteParams, 'SuperAdminSupportCalendar'>>();
  const { hall } = route.params;

  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  // Calendar State
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const days = useMemo(() => get7DaysOfWeek(currentMonday), [currentMonday]);
  const startDateStr = days[0].dateStr;
  const endDateStr = days[6].dateStr;

  const weekInfo = useMemo(() => getWeekLabel(currentMonday), [currentMonday]);
  const weekRangeLabel = useMemo(
    () => formatWeekRangeHeader(startDateStr, endDateStr),
    [startDateStr, endDateStr]
  );

  const loadSchedule = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const data = await fetchHallSupportBookings(hall.id, startDateStr, endDateStr);
        setBookings(data || []);
      } catch (err: any) {
        console.warn('[SupportCalendar] Error loading live calendar:', err);
      } finally {
        if (!isSilent) setLoading(false);
        setRefreshing(false);
      }
    },
    [hall.id, startDateStr, endDateStr]
  );

  useEffect(() => {
    loadSchedule(false);
  }, [loadSchedule]);

  const handlePullRefresh = () => {
    setRefreshing(true);
    loadSchedule(true);
  };

  const handlePrevWeek = () => {
    setCurrentMonday(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentMonday(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleSelectWeekByNum = (weekNum: number) => {
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
    const firstOfMonth = new Date(year, monthIndex, 1);
    setCurrentMonday(getMondayOfWeek(firstOfMonth));
  };

  const slotMode = hall.slot_mode || 'two_slots';
  const currencySymbol = '₹';

  // Group bookings by date and slot
  const bookingsMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of bookings) {
      if (b.status !== 'cancelled') {
        map.set(`${b.start_date}_${b.slot}`, b);
      }
    }
    return map;
  }, [bookings]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* SUPPORT INSPECTION BANNER */}
      <View style={styles.supportBanner}>
        <View style={styles.bannerLeft}>
          <ShieldAlert size={16} color="#78350F" strokeWidth={2.5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerOverline}>SUPPORT INSPECTION MODE • 100% READ-ONLY</Text>
            <Text style={styles.bannerHallName} numberOfLines={1}>
              {hall.name} ({hall.phone})
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.exitBtn,
            { transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
          accessibilityLabel="Back to Hall Details"
        >
          <ArrowLeft size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.exitBtnText}>Back</Text>
        </Pressable>
      </View>

      {/* SUB-HEADER: WEEK SELECTOR */}
      <View style={[styles.controlsWrapper, glassStyles.getCardStyle(isDark)]}>
        <WeekSelector
          startDateStr={startDateStr}
          endDateStr={endDateStr}
          weekRangeLabel={weekRangeLabel}
          monthYearLabel={weekInfo.monthYearLabel}
          weekNumber={weekInfo.weekNumber}
          totalWeeks={weekInfo.totalWeeks}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onSelectWeekNumber={handleSelectWeekByNum}
          onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
          isDark={isDark}
        />
      </View>

      {/* CALENDAR SCHEDULE CONTENT */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold[400]} />
          <Text style={[styles.loadingText, { color: t.textMuted }]}>
            Loading live schedule for {hall.name}...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullRefresh}
              tintColor={colors.gold[400]}
              colors={[colors.gold[500]]}
            />
          }
        >
          {days.map(dayObj => {
            const dateStr = dayObj.dateStr;
            const isToday = dayObj.isToday;

            const morningBooking = bookingsMap.get(`${dateStr}_morning`);
            const eveningBooking = bookingsMap.get(`${dateStr}_evening`);
            const fullDayBooking = bookingsMap.get(`${dateStr}_full_day`);

            return (
              <View
                key={dateStr}
                style={[
                  styles.dayCard,
                  glassStyles.getCardStyle(isDark),
                  isToday && {
                    borderColor: isDark ? colors.gold[500] : colors.gold[600],
                    borderWidth: 1.5,
                  },
                ]}
              >
                {/* Date Header */}
                <View style={styles.dayHeaderRow}>
                  <View style={styles.dateCol}>
                    <Text
                      style={[
                        styles.dayOfWeekText,
                        { color: isToday ? colors.gold[400] : t.textMuted },
                      ]}
                    >
                      {dayObj.dayName.toUpperCase()}
                    </Text>
                    <Text style={[styles.dayNumText, { color: t.text }]}>
                      {dayObj.dayNumber} {dayObj.monthName}
                    </Text>
                  </View>

                  {isToday && (
                    <View
                      style={[
                        styles.todayPill,
                        {
                          backgroundColor: isDark
                            ? 'rgba(214, 174, 107, 0.2)'
                            : 'rgba(198, 151, 73, 0.2)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.todayPillText,
                          { color: isDark ? colors.gold[400] : colors.gold[700] },
                        ]}
                      >
                        TODAY
                      </Text>
                    </View>
                  )}
                </View>

                {/* Slots Rows */}
                {slotMode === 'two_slots' ? (
                  <View style={styles.slotsGrid}>
                    {/* Morning Slot */}
                    <View
                      style={[
                        styles.slotBox,
                        morningBooking ? styles.bookedSlotBox : styles.freeSlotBox,
                        {
                          borderColor: morningBooking
                            ? 'rgba(214, 174, 107, 0.4)'
                            : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(198,151,73,0.15)',
                        },
                      ]}
                    >
                      <View style={styles.slotHeader}>
                        <Text style={[styles.slotLabel, { color: t.textMuted }]}>
                          MORNING (06:00 - 15:00)
                        </Text>
                        {morningBooking && (
                          <View style={styles.bookedPill}>
                            <Text style={styles.bookedPillText}>BOOKED</Text>
                          </View>
                        )}
                      </View>

                      {morningBooking ? (
                        <View style={styles.bookingDetails}>
                          <Text style={[styles.customerName, { color: t.text }]}>
                            {morningBooking.customer_name}
                          </Text>
                          <Text style={[styles.eventType, { color: colors.gold[400] }]}>
                            {morningBooking.event_type}
                          </Text>
                          <Text style={[styles.amountText, { color: t.textMuted }]}>
                            {currencySymbol}{Number(morningBooking.total_contract_amount || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.freeSlotRow}>
                          <Lock size={12} color={t.textSubtle} />
                          <Text style={[styles.freeSlotText, { color: t.textSubtle }]}>
                            Free Slot (Read-Only)
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Evening Slot */}
                    <View
                      style={[
                        styles.slotBox,
                        eveningBooking ? styles.bookedSlotBox : styles.freeSlotBox,
                        {
                          borderColor: eveningBooking
                            ? 'rgba(214, 174, 107, 0.4)'
                            : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(198,151,73,0.15)',
                        },
                      ]}
                    >
                      <View style={styles.slotHeader}>
                        <Text style={[styles.slotLabel, { color: t.textMuted }]}>
                          EVENING (16:00 - 23:59)
                        </Text>
                        {eveningBooking && (
                          <View style={styles.bookedPill}>
                            <Text style={styles.bookedPillText}>BOOKED</Text>
                          </View>
                        )}
                      </View>

                      {eveningBooking ? (
                        <View style={styles.bookingDetails}>
                          <Text style={[styles.customerName, { color: t.text }]}>
                            {eveningBooking.customer_name}
                          </Text>
                          <Text style={[styles.eventType, { color: colors.gold[400] }]}>
                            {eveningBooking.event_type}
                          </Text>
                          <Text style={[styles.amountText, { color: t.textMuted }]}>
                            {currencySymbol}{Number(eveningBooking.total_contract_amount || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.freeSlotRow}>
                          <Lock size={12} color={t.textSubtle} />
                          <Text style={[styles.freeSlotText, { color: t.textSubtle }]}>
                            Free Slot (Read-Only)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  /* Full Day Slot */
                  <View
                    style={[
                      styles.slotBox,
                      fullDayBooking ? styles.bookedSlotBox : styles.freeSlotBox,
                      {
                        borderColor: fullDayBooking
                          ? 'rgba(214, 174, 107, 0.4)'
                          : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(198,151,73,0.15)',
                      },
                    ]}
                  >
                    <View style={styles.slotHeader}>
                      <Text style={[styles.slotLabel, { color: t.textMuted }]}>
                        FULL DAY SCHEDULE
                      </Text>
                      {fullDayBooking && (
                        <View style={styles.bookedPill}>
                          <Text style={styles.bookedPillText}>BOOKED</Text>
                        </View>
                      )}
                    </View>

                    {fullDayBooking ? (
                      <View style={styles.bookingDetails}>
                        <Text style={[styles.customerName, { color: t.text }]}>
                          {fullDayBooking.customer_name}
                        </Text>
                        <Text style={[styles.eventType, { color: colors.gold[400] }]}>
                          {fullDayBooking.event_type}
                        </Text>
                        <Text style={[styles.amountText, { color: t.textMuted }]}>
                          {currencySymbol}{Number(fullDayBooking.total_contract_amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.freeSlotRow}>
                        <Lock size={12} color={t.textSubtle} />
                        <Text style={[styles.freeSlotText, { color: t.textSubtle }]}>
                          Free Slot (Read-Only)
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Month Picker Modal */}
      <MonthPickerModal
        visible={isMonthPickerOpen}
        selectedDate={currentMonday}
        onClose={() => setIsMonthPickerOpen(false)}
        onSelectMonthYear={handleSelectMonthYear}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  supportBanner: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  bannerOverline: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#78350F',
    textTransform: 'uppercase',
  },
  bannerHallName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  controlsWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 20,
    maxWidth: 700,
    width: '92%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  dayCard: {
    padding: 14,
    borderRadius: 18,
    gap: 10,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayOfWeekText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dayNumText: {
    fontSize: 14,
    fontWeight: '700',
  },
  todayPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slotsGrid: {
    gap: 8,
  },
  slotBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  bookedSlotBox: {
    backgroundColor: 'rgba(214, 174, 107, 0.08)',
  },
  freeSlotBox: {
    backgroundColor: 'transparent',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bookedPill: {
    backgroundColor: 'rgba(214, 174, 107, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookedPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.gold[400],
    letterSpacing: 0.5,
  },
  bookingDetails: {
    marginTop: 2,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventType: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  amountText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  freeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  freeSlotText: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
