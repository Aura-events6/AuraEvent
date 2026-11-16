import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar, ChevronRight, FileText } from 'lucide-react-native';
import { BookingSearchResult } from '../../types/search';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

interface BookingSearchResultCardProps {
  booking: BookingSearchResult;
  onPress: (booking: BookingSearchResult) => void;
  isDark?: boolean;
}

export const BookingSearchResultCard: React.FC<BookingSearchResultCardProps> = ({
  booking,
  onPress,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const status = booking.payment_status || 'upcoming';
  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue';
  const isCancelled = booking.status === 'cancelled';

  const badgeBg = isCancelled
    ? isDark
      ? colors.status.danger.bgDark
      : colors.status.danger.bgLight
    : isOverdue
    ? isDark
      ? colors.status.danger.bgDark
      : colors.status.danger.bgLight
    : isPaid
    ? isDark
      ? colors.status.success.bgDark
      : colors.status.success.bgLight
    : isDark
    ? colors.dark.accentBg
    : colors.light.accentBg;

  const badgeColor = isCancelled
    ? isDark
      ? colors.status.danger.dark
      : colors.status.danger.light
    : isOverdue
    ? isDark
      ? colors.status.danger.dark
      : colors.status.danger.light
    : isPaid
    ? isDark
      ? colors.status.success.dark
      : colors.status.success.light
    : isDark
    ? colors.gold[400]
    : colors.gold[600];

  const statusLabel = isCancelled
    ? 'Cancelled'
    : isOverdue
    ? 'Overdue'
    : isPaid
    ? 'Paid in Full'
    : 'Pending Due';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        glassStyles.getCardStyle(isDark),
        {
          transform: [{ scale: pressed ? 0.965 : 1 }],
        },
      ]}
      onPress={() => onPress(booking)}
      accessibilityRole="button"
      accessibilityLabel={`View details for bill ${booking.bill_number}`}
    >
      {({ pressed }) => (
        <>
          <View style={styles.contentCol}>
            <View style={styles.topRow}>
              <View style={styles.billBadge}>
                <FileText size={11} color={isDark ? colors.gold[400] : colors.gold[600]} />
                <Text
                  style={[
                    styles.billText,
                    { color: isDark ? colors.gold[400] : colors.gold[600] },
                  ]}
                >
                  {booking.bill_number}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.statusText, { color: badgeColor }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <Text style={[styles.customerName, { color: t.text }]} numberOfLines={1}>
              {booking.customer_name}
            </Text>

            <View style={styles.metaRow}>
              <Calendar size={12} color={t.textSubtle} />
              <Text style={[styles.metaText, { color: t.textMuted }]}>
                {booking.event_type} • {booking.start_date} ({booking.slot})
              </Text>
            </View>
          </View>

          <View style={styles.rightCol}>
            <RollingNumberTicker
              targetValue={Number(booking.total_contract_amount || 0)}
              isCurrency
              prefix="₹"
              style={[
                styles.amount,
                { color: isDark ? colors.gold[400] : colors.gold[600] },
              ]}
            />
            <View style={{ transform: [{ translateX: pressed ? 3 : 0 }] }}>
              <ChevronRight size={18} color={t.textSubtle} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 10,
    minHeight: 74,
  },
  contentCol: {
    flex: 1,
    marginRight: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  billBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

