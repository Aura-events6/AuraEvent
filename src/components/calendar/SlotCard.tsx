import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Clock, Sun, Moon, CheckCircle2 } from 'lucide-react-native';
import { CalendarBooking } from '../../types/calendar';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';

interface SlotCardProps {
  booking: CalendarBooking;
  dateStr: string;
  currencySymbol?: string;
  isDark?: boolean;
  isElapsed?: boolean;
  onPress: (bookingId: string) => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  booking,
  currencySymbol = '₹',
  isDark = false,
  isElapsed = false,
  onPress,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // Slot badge config
  const getSlotConfig = () => {
    switch (booking.slot) {
      case 'morning':
        return {
          label: 'MORNING',
          icon: Sun,
          bg: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.15)',
          color: isDark ? '#FBBF24' : '#D97706',
        };
      case 'evening':
        return {
          label: 'EVENING',
          icon: Moon,
          bg: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.15)',
          color: isDark ? '#A5B4FC' : '#6366F1',
        };
      case 'full_day':
      default:
        return {
          label: 'FULL DAY',
          icon: Clock,
          bg: isDark ? 'rgba(214, 174, 107, 0.18)' : 'rgba(198, 151, 73, 0.15)',
          color: isDark ? '#D6AE6B' : '#B07E34',
        };
    }
  };

  const slotConfig = getSlotConfig();
  const SlotIcon = slotConfig.icon;

  // Payment Status & Amount
  const isPaid = booking.payment_status === 'paid' || booking.pending_balance <= 0;
  const amountToShow = isPaid ? booking.total_contract_amount : booking.pending_balance;
  const amountStr = formatCurrency(amountToShow, currencySymbol);

  // Subtitle: Package & Event combo
  const packageName = booking.package_name || 'Standard Package';
  const eventName = booking.event_type || 'Event';
  const subtitle = `${packageName} • ${eventName}`;

  const goldPrimary = isDark ? '#D6AE6B' : '#B07E34';

  return (
    <Pressable
      onPress={() => onPress(booking.booking_id)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isDark
            ? isElapsed
              ? 'rgba(28, 26, 24, 0.88)'
              : 'rgba(35, 33, 30, 0.82)'
            : isElapsed
              ? '#F5F5F4'
              : '#FFFFFF',
          borderColor: isDark
            ? isElapsed
              ? 'rgba(214, 174, 107, 0.22)'
              : 'rgba(255, 255, 255, 0.08)'
            : isElapsed
              ? 'rgba(198, 151, 73, 0.25)'
              : 'rgba(198, 151, 73, 0.22)',
          transform: [{ scale: pressed ? (isElapsed ? 0.985 : 0.965) : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${isElapsed ? 'Elapsed booking' : 'Booking'} for ${booking.customer_name}, ${subtitle}, ${isPaid ? 'Fully Paid' : 'Pending'} ${amountStr}. Tap to view details.`}
    >
      {/* 1. Header: Customer Name (left) + Slot badge & Elapsed pill (right) */}
      <View style={styles.headerRow}>
        <Text style={[styles.customerName, { color: t.text }]} numberOfLines={1}>
          {booking.customer_name}
        </Text>

        <View style={styles.badgeRow}>
          <View style={[styles.slotBadge, { backgroundColor: slotConfig.bg }]}>
            <SlotIcon size={10} color={slotConfig.color} strokeWidth={2.4} />
            <Text style={[styles.slotBadgeText, { color: slotConfig.color }]}>
              {slotConfig.label}
            </Text>
          </View>

          {isElapsed && (
            <View
              style={[
                styles.elapsedBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.16)'
                    : 'rgba(198, 151, 73, 0.16)',
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.30)'
                    : 'rgba(198, 151, 73, 0.35)',
                },
              ]}
            >
              <Clock
                size={9}
                color={isDark ? colors.gold[400] : colors.gold[600]}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.elapsedBadgeText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                ELAPSED
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Middle: Package Tier & Event Subtitle */}
      <View style={styles.subtitleRow}>
        <Text style={[styles.packageSubtitle, { color: goldPrimary }]} numberOfLines={1}>
          {subtitle}
        </Text>
        {isElapsed && (
          <Text
            style={[
              styles.elapsedLabel,
              { color: isDark ? 'rgba(245, 245, 244, 0.45)' : 'rgba(28, 25, 23, 0.45)' },
            ]}
          >
            • Past Event
          </Text>
        )}
      </View>

      {/* 3. Divider + Status / Amount Row */}
      <View style={styles.footerRow}>
        {isPaid ? (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(16, 185, 129, 0.14)',
              },
            ]}
          >
            <CheckCircle2
              size={11}
              color={isDark ? '#34D399' : '#059669'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isDark ? '#34D399' : '#059669' },
              ]}
            >
              {isElapsed ? 'Paid & Settled' : 'Fully Paid'}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(244, 63, 94, 0.16)'
                  : 'rgba(244, 63, 94, 0.14)',
              },
            ]}
          >
            <Clock
              size={11}
              color={isDark ? '#FB7185' : '#E11D48'}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isDark ? '#FB7185' : '#E11D48' },
              ]}
            >
              {isElapsed ? 'Overdue Due' : 'Pending'}
            </Text>
          </View>
        )}

        <Text
          style={[
            styles.amountText,
            { color: isPaid ? (isDark ? '#34D399' : '#059669') : (isDark ? '#FB7185' : '#E11D48') },
          ]}
        >
          {amountStr}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  customerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    backgroundColor: 'transparent',
  },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    backgroundColor: 'transparent',
  },
  elapsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  elapsedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    backgroundColor: 'transparent',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  packageSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  elapsedLabel: {
    fontSize: 10,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 151, 73, 0.20)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    backgroundColor: 'transparent',
  },
});
