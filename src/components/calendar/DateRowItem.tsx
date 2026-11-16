import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarBooking, BookingSlot, SlotMode } from '../../types/calendar';
import { SlotCard } from './SlotCard';
import { FreeSlotPlusCard } from './FreeSlotPlusCard';
import { colors } from '../../theme/colors';
import { isSlotElapsed } from '../../utils/dateUtils';

interface DateRowItemProps {
  dateStr: string;
  dayName: string;
  dayNumber: string;
  monthName: string;
  isToday: boolean;
  slotMode: SlotMode;
  bookings: CalendarBooking[];
  currencySymbol?: string;
  isDark?: boolean;
  index?: number;
  onPressFreeSlot: (dateStr: string, slot: BookingSlot) => void;
  onPressBooking: (bookingId: string) => void;
}

export const DateRowItem: React.FC<DateRowItemProps> = ({
  dateStr,
  dayName,
  dayNumber,
  monthName,
  isToday,
  slotMode,
  bookings,
  currencySymbol = '₹',
  isDark = false,
  index = 0,
  onPressFreeSlot,
  onPressBooking,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // Staggered cascade entrance animation
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entranceAnim.setValue(0);
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 35, 250),
      useNativeDriver: true,
    }).start();
  }, [dateStr, index, entranceAnim]);

  // Filter bookings covering this date
  const activeBookings = bookings.filter(
    b => b.start_date <= dateStr && b.end_date >= dateStr && b.status === 'confirmed'
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: entranceAnim,
          transform: [
            {
              translateY: entranceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Left Date Column (Stretches to match the right slot height) */}
      <View style={styles.dateColWrapper}>
        {isToday ? (
          <LinearGradient
            colors={['#D6AE6B', '#B8863B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.todayDateBadge}
          >
            <Text style={styles.todayDayNameText}>{dayName.toUpperCase()}</Text>
            <Text style={styles.todayDayNumberText}>{dayNumber}</Text>
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>Today</Text>
            </View>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.normalDateBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(35, 33, 30, 0.82)'
                  : 'rgba(255, 255, 255, 0.72)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 0.92)',
              },
            ]}
          >
            <Text
              style={[
                styles.dayNameText,
                { color: isDark ? 'rgba(245, 245, 244, 0.55)' : 'rgba(28, 25, 23, 0.55)' },
              ]}
            >
              {dayName.toUpperCase()}
            </Text>
            <Text style={[styles.dayNumberText, { color: t.text }]}>
              {dayNumber}
            </Text>
            <Text
              style={[
                styles.monthNameText,
                { color: isDark ? 'rgba(245, 245, 244, 0.50)' : 'rgba(28, 25, 23, 0.50)' },
              ]}
            >
              {monthName}
            </Text>
          </View>
        )}
      </View>

      {/* Right Slots Container */}
      <View style={styles.slotsCol}>
        {slotMode === 'two_slots' ? (
          <>
            {/* Morning Slot */}
            {(() => {
              const morningBooking = activeBookings.find(
                b => b.slot === 'morning' || b.slot === 'full_day'
              );
              const isElapsed = isSlotElapsed(dateStr, 'morning');
              return morningBooking ? (
                <SlotCard
                  key={`m-${morningBooking.booking_id}`}
                  booking={morningBooking}
                  dateStr={dateStr}
                  currencySymbol={currencySymbol}
                  isDark={isDark}
                  isElapsed={isElapsed}
                  onPress={onPressBooking}
                />
              ) : (
                <FreeSlotPlusCard
                  key={`free-m-${dateStr}`}
                  slot="morning"
                  dateStr={dateStr}
                  isDark={isDark}
                  isElapsed={isElapsed}
                  onPress={onPressFreeSlot}
                />
              );
            })()}

            {/* Evening Slot */}
            {(() => {
              const eveningBooking = activeBookings.find(
                b => b.slot === 'evening' || b.slot === 'full_day'
              );
              const isElapsed = isSlotElapsed(dateStr, 'evening');
              return eveningBooking ? (
                <SlotCard
                  key={`e-${eveningBooking.booking_id}`}
                  booking={eveningBooking}
                  dateStr={dateStr}
                  currencySymbol={currencySymbol}
                  isDark={isDark}
                  isElapsed={isElapsed}
                  onPress={onPressBooking}
                />
              ) : (
                <FreeSlotPlusCard
                  key={`free-e-${dateStr}`}
                  slot="evening"
                  dateStr={dateStr}
                  isDark={isDark}
                  isElapsed={isElapsed}
                  onPress={onPressFreeSlot}
                />
              );
            })()}
          </>
        ) : (
          /* Full Day Mode */
          (() => {
            const fullDayBooking = activeBookings.find(b => b.slot === 'full_day');
            const isElapsed = isSlotElapsed(dateStr, 'full_day');
            return fullDayBooking ? (
              <SlotCard
                key={`f-${fullDayBooking.booking_id}`}
                booking={fullDayBooking}
                dateStr={dateStr}
                currencySymbol={currencySymbol}
                isDark={isDark}
                isElapsed={isElapsed}
                onPress={onPressBooking}
              />
            ) : (
              <FreeSlotPlusCard
                key={`free-f-${dateStr}`}
                slot="full_day"
                dateStr={dateStr}
                isDark={isDark}
                isElapsed={isElapsed}
                onPress={onPressFreeSlot}
              />
            );
          })()
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 6,
  },
  dateColWrapper: {
    width: 78,
    marginBottom: 8,
  },
  todayDateBadge: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  todayDayNameText: {
    color: 'rgba(255, 255, 255, 0.90)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  todayDayNumberText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 2,
  },
  todayPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  todayPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  normalDateBadge: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dayNumberText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 2,
  },
  monthNameText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  slotsCol: {
    flex: 1,
    minWidth: 0,
  },
});
