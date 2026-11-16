import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Calendar,
  MessageCircle,
  CreditCard,
  Phone,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { KhatabookDueItem } from '../../types/khatabook';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { formatCurrency } from '../../utils/dateUtils';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

interface KhatabookCardProps {
  item: KhatabookDueItem;
  currencySymbol?: string;
  isDark?: boolean;
  onPressCard: () => void;
  onPressWhatsApp: () => void;
  onPressRecordPayment: () => void;
}

export const KhatabookCard: React.FC<KhatabookCardProps> = ({
  item,
  currencySymbol = '₹',
  isDark = false,
  onPressCard,
  onPressWhatsApp,
  onPressRecordPayment,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const isOverdue = item.payment_status === 'overdue';
  const hasPromisedDate = Boolean(item.latest_promised_pay_by_date);

  const slotLabel =
    item.slot === 'full_day'
      ? 'Full Day'
      : item.slot === 'morning'
      ? 'Morning Slot'
      : 'Evening Slot';

  const formattedDate = new Date(item.start_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View
      style={[
        styles.card,
        glassStyles.getCardStyle(isDark),
        {
          borderColor: isOverdue
            ? isDark
              ? 'rgba(239, 68, 68, 0.40)'
              : 'rgba(220, 38, 38, 0.35)'
            : isDark
            ? 'rgba(214, 174, 107, 0.30)'
            : 'rgba(198, 151, 73, 0.25)',
        },
      ]}
    >
      {/* Tappable Card Body (Navigates to Booking Details) with Tactile Feedback */}
      <Pressable
        onPress={onPressCard}
        accessibilityRole="button"
        accessibilityLabel={`Booking ${item.bill_number} for ${item.customer_name}. Due amount: ${formatCurrency(item.pending_balance, currencySymbol)}`}
        style={({ pressed }) => [
          styles.cardClickableBody,
          {
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {/* Top Header Row: Status Badge & Bill Number */}
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            {isOverdue ? (
              <View style={[styles.statusBadge, { backgroundColor: '#EF4444' }]}>
                <AlertCircle size={11} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>OVERDUE</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(245, 158, 11, 0.20)',
                  },
                ]}
              >
                <Clock size={11} color="#D97706" />
                <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>
                  UPCOMING
                </Text>
              </View>
            )}

            {hasPromisedDate && (
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(59, 130, 246, 0.25)'
                      : 'rgba(59, 130, 246, 0.18)',
                  },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: '#3B82F6' }]}>
                  CREDIT
                </Text>
              </View>
            )}
          </View>

          <View style={styles.billBox}>
            <Text style={[styles.billText, { color: t.textMuted }]}>
              {item.bill_number}
            </Text>
            <ChevronRight size={14} color={t.textMuted} />
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, { color: t.text }]}>
              {item.customer_name}
            </Text>
            <View style={styles.phoneRow}>
              <Phone size={12} color={t.textMuted} />
              <Text style={[styles.customerPhone, { color: t.textMuted }]}>
                +91 {item.customer_mobile}
              </Text>
            </View>
          </View>

          <View style={styles.eventInfoCol}>
            <View style={styles.eventDateRow}>
              <Calendar
                size={13}
                color={isDark ? colors.gold[400] : colors.gold[600]}
              />
              <Text
                style={[
                  styles.eventDateText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                {formattedDate}
              </Text>
            </View>
            <Text style={[styles.eventTypeSlot, { color: t.textMuted }]}>
              {item.event_type} • {slotLabel}
            </Text>
          </View>
        </View>

        {/* Financial Bar */}
        <View
          style={[
            styles.financialBox,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.03)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <View style={styles.finCol}>
            <Text style={[styles.finLabel, { color: t.textMuted }]}>
              Total Contract
            </Text>
            <Text style={[styles.finValue, { color: t.text }]}>
              {formatCurrency(item.total_contract_amount, currencySymbol)}
            </Text>
          </View>

          <View style={styles.finCol}>
            <Text style={[styles.finLabel, { color: t.textMuted }]}>Paid</Text>
            <Text style={[styles.finValue, { color: '#10B981' }]}>
              {formatCurrency(item.total_paid, currencySymbol)}
            </Text>
          </View>

          <View style={styles.finColRight}>
            <Text
              style={[
                styles.finLabel,
                { color: isOverdue ? '#EF4444' : '#D97706', fontWeight: '800' },
              ]}
            >
              DUE BALANCE
            </Text>
            <RollingNumberTicker
              targetValue={item.pending_balance}
              isCurrency
              prefix={currencySymbol}
              duration={480}
              style={[
                styles.dueValue,
                { color: isOverdue ? '#EF4444' : '#D97706' },
              ]}
            />
          </View>
        </View>

        {/* Promised Pay By Date Notice if set */}
        {hasPromisedDate && (
          <View style={styles.promisedNoticeRow}>
            <Clock size={12} color="#3B82F6" />
            <Text style={styles.promisedNoticeText}>
              Promised Pay-by: {item.latest_promised_pay_by_date}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Action Buttons Row (Sibling to Card Body: prevents invalid nested button HTML on Web) */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={onPressWhatsApp}
          style={({ pressed }) => [
            styles.whatsAppBtn,
            {
              backgroundColor: isDark
                ? 'rgba(37, 211, 102, 0.15)'
                : 'rgba(37, 211, 102, 0.12)',
              borderColor: isDark
                ? 'rgba(37, 211, 102, 0.40)'
                : 'rgba(37, 211, 102, 0.45)',
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share invoice on WhatsApp"
        >
          <MessageCircle size={15} color="#25D366" />
          <Text style={styles.whatsAppBtnText}>WhatsApp Bill</Text>
        </Pressable>

        <Pressable
          onPress={onPressRecordPayment}
          style={({ pressed }) => [
            styles.recordPaymentBtn,
            {
              backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Record payment installment"
        >
          <CreditCard size={15} color="#FFFFFF" />
          <Text style={styles.recordPaymentBtnText}>Record Payment</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  cardClickableBody: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  billBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  billText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventInfoCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDateText: {
    fontSize: 13,
    fontWeight: '800',
  },
  eventTypeSlot: {
    fontSize: 11,
    marginTop: 1,
  },
  financialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  finCol: {
    gap: 2,
  },
  finColRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  finLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  finValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  dueValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  promisedNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  promisedNoticeText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  whatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 46,
  },
  whatsAppBtnText: {
    color: '#25D366',
    fontSize: 13,
    fontWeight: '800',
  },
  recordPaymentBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    minHeight: 46,
  },
  recordPaymentBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
