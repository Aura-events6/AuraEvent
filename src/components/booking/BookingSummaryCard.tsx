import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';
import { BookingSlot } from '../../types/calendar';
import { DynamicExpenseItem } from './DynamicExpensesList';
import { RollingNumberTicker } from '../dashboard';

export interface BookingSummaryData {
  customerName: string;
  customerMobile: string;
  eventType: string;
  startDate: string;
  endDate: string;
  isMultiDay: boolean;
  slot: BookingSlot;
  packageName: string;
  basePackageCost: number;
  dynamicExpenses?: DynamicExpenseItem[];
  totalContract: number;
  advanceAmount: number;
  advanceMode: string;
  remainingBalance: number;
  expectedGuests?: string;
  notes?: string;
}

interface BookingSummaryCardProps {
  data: BookingSummaryData;
  onEditSection: (step: number) => void;
  currencySymbol?: string;
  isDark?: boolean;
}

const slotDisplayNames: Record<BookingSlot, string> = {
  full_day: 'Full Day',
  morning: 'Morning',
  evening: 'Evening',
};

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  data,
  onEditSection,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const isFullyPaid = data.remainingBalance === 0 && data.totalContract > 0;
  const slotName = slotDisplayNames[data.slot] || data.slot.replace('_', ' ');

  const formatDisplayDate = (dStr: string) => {
    try {
      if (!dStr) return '—';
      const d = new Date(dStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dStr;
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header matching lines 462-472 */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.stepPreTitle, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
            Step 3 of 3 • Review
          </Text>
          <Text style={[styles.stepMainTitle, { color: t.text }]}>
            Booking Summary
          </Text>
          <Text style={[styles.stepSubtitle, { color: isDark ? '#A8A29E' : '#78716C' }]}>
            Quick check before the slot is locked.
          </Text>
        </View>

        <View style={styles.slotFreePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.slotFreeText}>Slot Free</Text>
        </View>
      </View>

      <View style={styles.contentStack}>
        {/* Customer & Event Inset Group matching lines 476-502 */}
        <View
          style={[
            styles.insetGroup,
            {
              backgroundColor: isDark ? 'rgba(22, 20, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              borderColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.15)',
            },
          ]}
        >
          {/* Customer Row */}
          <View
            style={[
              styles.insetRow,
              styles.customerRow,
              {
                borderBottomColor: isDark
                  ? 'rgba(214, 174, 107, 0.12)'
                  : 'rgba(198, 151, 73, 0.12)',
              },
            ]}
          >
            <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
              Customer
            </Text>
            <View style={styles.customerValueCol}>
              <Text style={[styles.customerNameText, { color: t.text }]}>
                {data.customerName || '—'}
              </Text>
              <Text style={[styles.customerMobileText, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                {data.customerMobile ? `+91 ${data.customerMobile}` : '—'}
              </Text>
            </View>
          </View>

          {/* Event Row */}
          <View
            style={[
              styles.insetRow,
              {
                borderBottomColor: isDark
                  ? 'rgba(214, 174, 107, 0.12)'
                  : 'rgba(198, 151, 73, 0.12)',
              },
            ]}
          >
            <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
              Event
            </Text>
            <View style={styles.eventValueRow}>
              <View
                style={[
                  styles.eventTypeBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(198, 151, 73, 0.18)'
                      : 'rgba(198, 151, 73, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.eventTypeText,
                    { color: isDark ? colors.gold[400] : '#8E6227' },
                  ]}
                >
                  {data.eventType}
                </Text>
              </View>
              <Text style={[styles.insetValue, { color: t.text }]}>
                {formatDisplayDate(data.startDate)}
              </Text>
            </View>
          </View>

          {/* Time & Guests Row */}
          <View
            style={[
              styles.insetRow,
              data.notes && data.notes.trim()
                ? {
                    borderBottomColor: isDark
                      ? 'rgba(214, 174, 107, 0.12)'
                      : 'rgba(198, 151, 73, 0.12)',
                  }
                : styles.lastRow,
            ]}
          >
            <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
              Time & Guests
            </Text>
            <Text style={[styles.insetValue, { color: t.text }]}>
              {slotName} • {data.expectedGuests || '0'} pax
            </Text>
          </View>

          {/* Optional Notes Row */}
          {Boolean(data.notes && data.notes.trim()) && (
            <View style={[styles.insetRow, styles.lastRow]}>
              <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                Notes
              </Text>
              <Text
                style={[
                  styles.insetValue,
                  styles.notesValue,
                  { color: isDark ? '#D6D3D1' : '#44403C' },
                ]}
                numberOfLines={2}
              >
                {data.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Financial Summary Card (card-gold-tint) matching lines 505-548 */}
        <View
          style={[
            styles.paymentCard,
            {
              backgroundColor: isDark
                ? 'rgba(214, 174, 107, 0.10)'
                : 'rgba(198, 151, 73, 0.08)',
              borderColor: isDark
                ? 'rgba(214, 174, 107, 0.25)'
                : 'rgba(198, 151, 73, 0.30)',
            },
          ]}
        >
          {/* Header with Edit Button */}
          <View style={styles.paymentHeaderRow}>
            <Text
              style={[
                styles.paymentHeaderLabel,
                { color: isDark ? colors.gold[400] : '#8E6227' },
              ]}
            >
              PAYMENT SUMMARY
            </Text>
            <Pressable
              onPress={() => onEditSection(2)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.editButtonRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Payment"
            >
              <Pencil size={11} color={isDark ? colors.gold[400] : '#8E6227'} strokeWidth={2.4} />
              <Text
                style={[
                  styles.editButtonText,
                  { color: isDark ? colors.gold[400] : '#8E6227' },
                ]}
              >
                Edit
              </Text>
            </Pressable>
          </View>

          {/* Line Items */}
          <View style={styles.paymentLineItems}>
            {/* Package */}
            <View style={styles.payLineRow}>
              <Text style={[styles.payLineLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                Package
              </Text>
              <Text
                style={[
                  styles.payLineValBold,
                  { color: isDark ? colors.gold[400] : '#8E6227' },
                ]}
                numberOfLines={1}
              >
                {data.packageName}
              </Text>
            </View>

            {/* Base Price */}
            <View style={styles.payLineRow}>
              <Text style={[styles.payLineLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                Base Price
              </Text>
              <Text style={[styles.payLineValBold, { color: t.text }]}>
                {formatCurrency(data.basePackageCost, currencySymbol)}
              </Text>
            </View>

            {/* Extra Expenses */}
            {data.dynamicExpenses?.map(exp => {
              const amt = parseFloat(exp.amount) || 0;
              if (amt <= 0 && !exp.reason.trim()) return null;
              return (
                <View key={exp.id} style={styles.payLineRow}>
                  <Text
                    style={[styles.payLineLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}
                    numberOfLines={1}
                  >
                    {exp.reason.trim() || 'Extra Expense'}
                  </Text>
                  <Text style={[styles.payLineValBold, { color: isDark ? '#D6D3D1' : '#44403C' }]}>
                    +{formatCurrency(amt, currencySymbol)}
                  </Text>
                </View>
              );
            })}

            {/* Total Cost with separator */}
            <View
              style={[
                styles.totalCostRow,
                {
                  borderTopColor: isDark
                    ? 'rgba(214, 174, 107, 0.20)'
                    : 'rgba(198, 151, 73, 0.20)',
                },
              ]}
            >
              <Text style={[styles.totalCostLabel, { color: t.text }]}>Total Cost</Text>
              <Text
                style={[
                  styles.totalCostVal,
                  { color: isDark ? colors.gold[400] : '#6F4D22' },
                ]}
              >
                {formatCurrency(data.totalContract, currencySymbol)}
              </Text>
            </View>

            {/* Advance Paid */}
            <View style={styles.advancePaidRow}>
              <View style={styles.advanceLabelBadgeGroup}>
                <Text style={[styles.payLineLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                  Advance Paid
                </Text>
                <View
                  style={[
                    styles.advanceModeBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.20)'
                        : 'rgba(16, 185, 129, 0.15)',
                    },
                  ]}
                >
                  <Text style={styles.advanceModeBadgeText}>{data.advanceMode}</Text>
                </View>
              </View>
              <Text style={styles.advancePaidAmount}>
                − {formatCurrency(data.advanceAmount, currencySymbol)}
              </Text>
            </View>
          </View>

          {/* Dashed Border & Balance Due Hero matching lines 539-547 */}
          <View
            style={[
              styles.dashedHeroContainer,
              {
                borderTopColor: isDark
                  ? 'rgba(214, 174, 107, 0.35)'
                  : 'rgba(198, 151, 73, 0.35)',
              },
            ]}
          >
            <View style={styles.heroRow}>
              <View>
                <Text
                  style={[
                    styles.heroLabel,
                    {
                      color: isFullyPaid
                        ? '#059669'
                        : isDark
                        ? colors.gold[400]
                        : '#8E6227',
                    },
                  ]}
                >
                  {isFullyPaid ? 'FULLY PAID' : 'BALANCE DUE'}
                </Text>
                <Text
                  style={[
                    styles.heroHint,
                    { color: isFullyPaid ? '#059669' : t.textMuted },
                  ]}
                >
                  {isFullyPaid ? 'No balance due' : 'Added to Khatabook'}
                </Text>
              </View>

              <RollingNumberTicker
                targetValue={data.remainingBalance}
                isCurrency
                prefix={currencySymbol}
                style={[
                  styles.heroAmount,
                  {
                    color: isFullyPaid
                      ? '#059669'
                      : isDark
                      ? colors.gold[400]
                      : '#8E6227',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Edit Details Button matching lines 551-555 */}
        <View style={styles.editDetailsRow}>
          <Pressable
            onPress={() => onEditSection(1)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.editDetailsBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit Details"
          >
            <Pencil size={14} color={isDark ? colors.gold[400] : '#8E6227'} strokeWidth={2.4} />
            <Text
              style={[
                styles.editDetailsText,
                { color: isDark ? colors.gold[400] : '#8E6227' },
              ]}
            >
              Edit Details
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 4,
  },
  titleCol: {
    flex: 1,
  },
  stepPreTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepMainTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  slotFreePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    marginTop: 2,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  slotFreeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  contentStack: {
    gap: 16,
  },
  insetGroup: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  insetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  customerRow: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  insetLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  insetValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  customerValueCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  customerNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  customerMobileText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  notesValue: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    maxWidth: '65%',
  },
  paymentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  editButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentLineItems: {
    gap: 8,
  },
  payLineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  payLineLabel: {
    fontSize: 13,
    opacity: 0.65,
    fontWeight: '500',
  },
  payLineValBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalCostRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalCostLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalCostVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  advancePaidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  advanceLabelBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advanceModeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  advanceModeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
  },
  advancePaidAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  dashedHeroContainer: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    paddingTop: 14,
    marginTop: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroHint: {
    fontSize: 10,
    opacity: 0.55,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  editDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  editDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editDetailsText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
