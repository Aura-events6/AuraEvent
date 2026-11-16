import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
  Building2,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Divide,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import { AllocatableBooking } from '../../services/expenseService';
import { formatLocalDate } from '../../utils/dateUtils';

export interface AllocationSelection {
  bookingId: string | null;
  date: string;
  label: string;
  isFullDay?: boolean;
}

interface AllocatedToSheetProps {
  visible: boolean;
  selectedBookingId: string | null;
  selectedDate: string; // YYYY-MM-DD
  allocatableBookings: AllocatableBooking[];
  isDark?: boolean;
  onClose: () => void;
  onSelectAllocation: (selection: AllocationSelection) => void;
}

type ViewMode = 'quick_select' | 'date_picker' | 'conflict_picker';

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]}`;
}

function formatSlotLabel(slot: string): string {
  if (slot === 'morning') return 'Morning Slot';
  if (slot === 'evening') return 'Evening Slot';
  if (slot === 'full_day') return 'Full Day';
  return slot;
}

export const AllocatedToSheet: React.FC<AllocatedToSheetProps> = ({
  visible,
  selectedBookingId,
  selectedDate,
  allocatableBookings,
  isDark = true,
  onClose,
  onSelectAllocation,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // View Mode: 'quick_select' | 'date_picker' | 'conflict_picker'
  const [viewMode, setViewMode] = useState<ViewMode>('quick_select');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [conflictDate, setConflictDate] = useState<string>('');
  const [conflictBookings, setConflictBookings] = useState<AllocatableBooking[]>([]);

  // Animations
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // LIFO Central Back Dispatcher: handles nested back navigation
  const handleBackPress = () => {
    if (viewMode === 'conflict_picker') {
      setViewMode('date_picker');
    } else if (viewMode === 'date_picker') {
      setViewMode('quick_select');
    } else {
      handleDismiss();
    }
  };

  useBackOverlay(visible, handleBackPress);

  useEffect(() => {
    if (visible) {
      setViewMode('quick_select');
      setCalendarMonth(new Date());
      backdropAnim.setValue(0);
      slideAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const executeSelection = (selection: AllocationSelection) => {
    onSelectAllocation(selection);
    handleDismiss();
  };

  // 1. Partition Bookings for Quick Select
  const todayBookings = useMemo(() => {
    return allocatableBookings.filter(b => b.startDate <= todayStr && b.endDate >= todayStr);
  }, [allocatableBookings, todayStr]);

  const upcomingBookings = useMemo(() => {
    return allocatableBookings
      .filter(b => b.startDate > todayStr)
      .slice(0, 4);
  }, [allocatableBookings, todayStr]);

  // Set of booked dates for calendar dots
  const bookedDatesSet = useMemo(() => {
    const set = new Set<string>();
    allocatableBookings.forEach(b => {
      set.add(b.startDate);
      if (b.endDate && b.endDate !== b.startDate) {
        set.add(b.endDate);
      }
    });
    return set;
  }, [allocatableBookings]);

  // Calendar Helpers
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateSelect = (dateStr: string) => {
    const matching = allocatableBookings.filter(b => b.startDate <= dateStr && b.endDate >= dateStr);

    if (matching.length === 0) {
      // Scenario D: No booking on this date -> General Upkeep on this date
      executeSelection({
        bookingId: null,
        date: dateStr,
        label: `${formatDisplayDate(dateStr)} • General Hall Upkeep`,
      });
    } else if (matching.length === 1) {
      // Scenario A & C: Exactly 1 booking
      const single = matching[0];
      const isFull = single.slot === 'full_day';
      const label = isFull
        ? `${formatDisplayDate(dateStr)} • ${single.customerName} (Full Day)`
        : `${formatDisplayDate(dateStr)} • ${single.customerName} (${single.eventType})`;

      executeSelection({
        bookingId: single.id,
        date: dateStr,
        label,
        isFullDay: isFull,
      });
    } else {
      // Scenario B: 2 or more bookings on that date -> Disambiguation Conflict Picker
      setConflictDate(dateStr);
      setConflictBookings(matching);
      setViewMode('conflict_picker');
    }
  };

  // Calendar Days Computation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }

    return days;
  }, [calendarMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackPress}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.backdropPressable,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? colors.dark.backgroundSecondary : colors.light.backgroundSecondary,
              borderColor: isDark ? 'rgba(214, 174, 107, 0.2)' : 'rgba(198, 151, 73, 0.2)',
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Drag Handle */}
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)' },
            ]}
          />

          {/* ========================================================
              VIEW 1: QUICK SELECT (Apple-Style "Today + Next 4 Upcoming")
             ======================================================== */}
          {viewMode === 'quick_select' && (
            <>
              {/* Header */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.sheetTitle, { color: t.text }]}>Allocated To</Text>
                  <Text style={[styles.sheetSubtitle, { color: t.textMuted }]}>
                    Link expense to an event or general upkeep
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleDismiss}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={t.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
              >
                {/* SECTION 1: QUICK SELECT INSET GROUP */}
                <Text style={[styles.sectionEyebrow, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                  QUICK SELECT
                </Text>

                <View
                  style={[
                    styles.insetGroup,
                    glassStyles.getCardStyle(isDark),
                    {
                      backgroundColor: isDark ? colors.dark.card : colors.light.card,
                      borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
                    },
                  ]}
                >
                  {/* Today's Event (If exists) */}
                  {todayBookings.map(b => {
                    const isSelected = selectedBookingId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          executeSelection({
                            bookingId: b.id,
                            date: todayStr,
                            label: `Today • ${formatDisplayDate(todayStr)}: ${b.customerName} (${b.eventType})`,
                          })
                        }
                        style={[
                          styles.optionRow,
                          styles.rowBorder,
                          { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
                          isSelected && {
                            backgroundColor: isDark ? 'rgba(214, 174, 107, 0.12)' : 'rgba(198, 151, 73, 0.10)',
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View
                            style={[
                              styles.iconBox,
                              { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)' },
                            ]}
                          >
                            <Sparkles size={16} color={isDark ? colors.status.success.dark : colors.status.success.light} />
                          </View>
                          <View style={styles.textWrap}>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.statusPill,
                                  { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.15)' },
                                ]}
                              >
                                <Text style={[styles.statusPillText, { color: isDark ? colors.status.success.dark : colors.status.success.light }]}>
                                  Today • {formatDisplayDate(todayStr)}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.optionTitle, { color: t.text }]} numberOfLines={1}>
                              {b.customerName} ({b.eventType})
                            </Text>
                            <Text style={[styles.optionSub, { color: t.textMuted }]}>
                              {formatSlotLabel(b.slot)} • {b.expectedGuests} Guests
                            </Text>
                          </View>
                        </View>
                        {isSelected && <CheckCircle2 size={18} color={isDark ? colors.gold[400] : colors.gold[500]} />}
                      </TouchableOpacity>
                    );
                  })}

                  {/* General Hall Upkeep (Always available at the top/today) */}
                  {(() => {
                    const isSelected = selectedBookingId === null && selectedDate === todayStr;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                          executeSelection({
                            bookingId: null,
                            date: todayStr,
                            label: 'Today • General Hall Upkeep',
                          })
                        }
                        style={[
                          styles.optionRow,
                          upcomingBookings.length > 0 && styles.rowBorder,
                          { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
                          isSelected && {
                            backgroundColor: isDark ? 'rgba(214, 174, 107, 0.12)' : 'rgba(198, 151, 73, 0.10)',
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View
                            style={[
                              styles.iconBox,
                              { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                            ]}
                          >
                            <Building2 size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
                          </View>
                          <View style={styles.textWrap}>
                            <Text style={[styles.optionTitle, { color: t.text }]}>
                              Today • General Hall Upkeep
                            </Text>
                            <Text style={[styles.optionSub, { color: t.textMuted }]}>
                              {todayBookings.length === 0
                                ? 'Operational overhead (No events booked today)'
                                : 'Operational overhead not tied to today’s event'}
                            </Text>
                          </View>
                        </View>
                        {isSelected && <CheckCircle2 size={18} color={isDark ? colors.gold[400] : colors.gold[500]} />}
                      </TouchableOpacity>
                    );
                  })()}

                  {/* Next 4 Upcoming Bookings */}
                  {upcomingBookings.map((b, idx) => {
                    const isSelected = selectedBookingId === b.id;
                    const isLast = idx === upcomingBookings.length - 1;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          executeSelection({
                            bookingId: b.id,
                            date: b.startDate,
                            label: `${formatDisplayDate(b.startDate)} • ${b.customerName}`,
                          })
                        }
                        style={[
                          styles.optionRow,
                          !isLast && styles.rowBorder,
                          { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
                          isSelected && {
                            backgroundColor: isDark ? 'rgba(214, 174, 107, 0.12)' : 'rgba(198, 151, 73, 0.10)',
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View
                            style={[
                              styles.iconBox,
                              { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                            ]}
                          >
                            <Clock size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
                          </View>
                          <View style={styles.textWrap}>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.statusPill,
                                  { backgroundColor: isDark ? 'rgba(214, 174, 107, 0.18)' : 'rgba(198, 151, 73, 0.15)' },
                                ]}
                              >
                                <Text style={[styles.statusPillText, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                                  Upcoming • {formatDisplayDate(b.startDate)}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.optionTitle, { color: t.text }]} numberOfLines={1}>
                              {b.customerName} ({b.eventType})
                            </Text>
                            <Text style={[styles.optionSub, { color: t.textMuted }]}>
                              {formatSlotLabel(b.slot)} • {b.expectedGuests} Guests
                            </Text>
                          </View>
                        </View>
                        {isSelected && <CheckCircle2 size={18} color={isDark ? colors.gold[400] : colors.gold[500]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* SECTION 2: SPECIFIC DATE PICKER TRIGGER */}
                <Text style={[styles.sectionEyebrow, { color: isDark ? colors.gold[400] : colors.gold[600], marginTop: 18 }]}>
                  SPECIFIC DATE
                </Text>

                <View
                  style={[
                    styles.insetGroup,
                    glassStyles.getCardStyle(isDark),
                    {
                      backgroundColor: isDark ? colors.dark.card : colors.light.card,
                      borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setViewMode('date_picker')}
                    style={styles.datePickerTriggerRow}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                        ]}
                      >
                        <CalendarIcon size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={[styles.optionTitle, { color: t.text }]}>
                          Select a different date...
                        </Text>
                        <Text style={[styles.optionSub, { color: t.textMuted }]}>
                          Pick any past or future date from the calendar
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={t.textSubtle} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}

          {/* ========================================================
              VIEW 2: CALENDAR DATE PICKER (Inline Month Grid)
             ======================================================== */}
          {viewMode === 'date_picker' && (
            <>
              {/* Header with Back button */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={() => setViewMode('quick_select')}
                  style={styles.backBtn}
                >
                  <ChevronLeft size={22} color={t.text} />
                  <Text style={[styles.backBtnText, { color: t.text }]}>Back</Text>
                </TouchableOpacity>

                <Text style={[styles.sheetTitle, { color: t.text }]}>Pick Date</Text>

                <TouchableOpacity
                  onPress={handleDismiss}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                  ]}
                >
                  <X size={18} color={t.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
              >
                {/* Month Navigation */}
                <View style={styles.monthNavRow}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    style={[
                      styles.monthNavBtn,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                    ]}
                  >
                    <ChevronLeft size={18} color={t.text} />
                  </TouchableOpacity>

                  <Text style={[styles.monthNavLabel, { color: t.text }]}>
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </Text>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    style={[
                      styles.monthNavBtn,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                    ]}
                  >
                    <ChevronRight size={18} color={t.text} />
                  </TouchableOpacity>
                </View>

                {/* Calendar Inset Card */}
                <View
                  style={[
                    styles.calendarCard,
                    glassStyles.getCardStyle(isDark),
                    {
                      backgroundColor: isDark ? colors.dark.card : colors.light.card,
                      borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
                    },
                  ]}
                >
                  {/* Weekday Row */}
                  <View style={styles.weekdayRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
                      <Text key={i} style={[styles.weekdayText, { color: t.textSubtle }]}>
                        {wd}
                      </Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.daysGrid}>
                    {calendarDays.map((cell, idx) => {
                      if (!cell.isCurrentMonth) {
                        return <View key={idx} style={styles.dayCellEmpty} />;
                      }

                      const isToday = cell.dateStr === todayStr;
                      const hasBooking = bookedDatesSet.has(cell.dateStr);

                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.6}
                          onPress={() => handleDateSelect(cell.dateStr)}
                          style={[
                            styles.dayCell,
                            isToday && {
                              borderColor: isDark ? colors.gold[400] : colors.gold[500],
                              borderWidth: 1.5,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumberText,
                              {
                                color: isToday
                                  ? (isDark ? colors.gold[400] : colors.gold[600])
                                  : t.text,
                                fontWeight: isToday || hasBooking ? '700' : '500',
                              },
                            ]}
                          >
                            {cell.dayNumber}
                          </Text>

                          {/* Event Dot Indicator */}
                          {hasBooking ? (
                            <View
                              style={[
                                styles.eventDot,
                                { backgroundColor: isDark ? colors.gold[400] : colors.gold[600] },
                              ]}
                            />
                          ) : (
                            <View style={styles.eventDotEmpty} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Calendar Guidance Tip */}
                <View style={styles.tipRow}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: isDark ? colors.gold[400] : colors.gold[600] },
                    ]}
                  />
                  <Text style={[styles.tipText, { color: t.textMuted }]}>
                    Dates with dots have scheduled hall events
                  </Text>
                </View>
              </ScrollView>
            </>
          )}

          {/* ========================================================
              VIEW 3: CONFLICT RESOLUTION PICKER (Apple Scenario B)
             ======================================================== */}
          {viewMode === 'conflict_picker' && (
            <>
              {/* Header with Back button */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={() => setViewMode('date_picker')}
                  style={styles.backBtn}
                >
                  <ChevronLeft size={22} color={t.text} />
                  <Text style={[styles.backBtnText, { color: t.text }]}>Calendar</Text>
                </TouchableOpacity>

                <Text style={[styles.sheetTitle, { color: t.text }]}>Select Event</Text>

                <TouchableOpacity
                  onPress={handleDismiss}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                  ]}
                >
                  <X size={18} color={t.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
              >
                <View style={styles.conflictBanner}>
                  <Text style={[styles.conflictBannerTitle, { color: t.text }]}>
                    Multiple Events on {formatDisplayDate(conflictDate)}
                  </Text>
                  <Text style={[styles.conflictBannerSub, { color: t.textMuted }]}>
                    2 bookings found. Please choose which event this expense belongs to:
                  </Text>
                </View>

                <View
                  style={[
                    styles.insetGroup,
                    glassStyles.getCardStyle(isDark),
                    {
                      backgroundColor: isDark ? colors.dark.card : colors.light.card,
                      borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
                    },
                  ]}
                >
                  {/* Event Options */}
                  {conflictBookings.map((b, idx) => {
                    const isMorning = b.slot === 'morning';
                    const IconComp = isMorning ? Sun : Moon;

                    return (
                      <TouchableOpacity
                        key={b.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          executeSelection({
                            bookingId: b.id,
                            date: conflictDate,
                            label: `${formatDisplayDate(conflictDate)} • ${b.customerName} (${b.eventType})`,
                          })
                        }
                        style={[
                          styles.optionRow,
                          styles.rowBorder,
                          { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View
                            style={[
                              styles.iconBox,
                              {
                                backgroundColor: isMorning
                                  ? (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)')
                                  : (isDark ? 'rgba(165, 180, 252, 0.15)' : 'rgba(99, 102, 241, 0.12)'),
                              },
                            ]}
                          >
                            <IconComp
                              size={18}
                              color={
                                isMorning
                                  ? (isDark ? colors.status.warning.dark : colors.status.warning.light)
                                  : (isDark ? colors.status.info.dark : colors.status.info.light)
                              }
                            />
                          </View>
                          <View style={styles.textWrap}>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.statusPill,
                                  {
                                    backgroundColor: isMorning
                                      ? (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.15)')
                                      : (isDark ? 'rgba(165, 180, 252, 0.18)' : 'rgba(99, 102, 241, 0.15)'),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusPillText,
                                    {
                                      color: isMorning
                                        ? (isDark ? colors.status.warning.dark : colors.status.warning.light)
                                        : (isDark ? colors.status.info.dark : colors.status.info.light),
                                    },
                                  ]}
                                >
                                  {formatSlotLabel(b.slot)}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.optionTitle, { color: t.text }]}>
                              {b.customerName} ({b.eventType})
                            </Text>
                            <Text style={[styles.optionSub, { color: t.textMuted }]}>
                              {b.expectedGuests} Guests scheduled
                            </Text>
                          </View>
                        </View>
                        <ChevronRight size={18} color={t.textSubtle} />
                      </TouchableOpacity>
                    );
                  })}

                  {/* Option 3: Full Day (Split between both events) */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      executeSelection({
                        bookingId: null,
                        date: conflictDate,
                        label: `${formatDisplayDate(conflictDate)} • Full Day Booking`,
                        isFullDay: true,
                      })
                    }
                    style={styles.optionRow}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                        ]}
                      >
                        <Building2 size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={[styles.optionTitle, { color: t.text }]}>
                          Full Day (Split between both)
                        </Text>
                        <Text style={[styles.optionSub, { color: t.textMuted }]}>
                          General operational expense shared between both events
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={t.textSubtle} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 30,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  insetGroup: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  datePickerTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    height: 44,
  },
  dayNumberText: {
    fontSize: 14,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  eventDotEmpty: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conflictBanner: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  conflictBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  conflictBannerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
});

