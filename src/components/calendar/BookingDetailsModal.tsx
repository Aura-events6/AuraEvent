import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { X, User, Phone, Calendar, Clock, DollarSign, MessageCircle } from 'lucide-react-native';
import { CalendarBooking } from '../../types/calendar';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { formatCurrency } from '../../utils/dateUtils';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

interface BookingDetailsModalProps {
  visible: boolean;
  booking?: CalendarBooking | null;
  currencySymbol?: string;
  isDark?: boolean;
  onClose: () => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  visible,
  booking,
  currencySymbol = '₹',
  isDark = false,
  onClose,
}) => {
  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  if (!booking) return null;

  const t = isDark ? colors.dark : colors.light;

  const handleCall = () => {
    if (booking.customer_mobile) {
      Linking.openURL(`tel:${booking.customer_mobile}`);
    }
  };

  const handleWhatsApp = () => {
    if (booking.customer_mobile) {
      const cleanPhone = booking.customer_mobile.replace(/[^0-9]/g, '');
      let extrasText = '';
      if (booking.extra_charges_items && booking.extra_charges_items.length > 0) {
        const lines = booking.extra_charges_items
          .map(i => `${i.title}: ${formatCurrency(i.amount, currencySymbol)}`)
          .join(', ');
        extrasText = ` [Extras: ${lines}]`;
      }
      const text = encodeURIComponent(
        `Hello ${booking.customer_name}, here is your booking update for ${booking.event_type} on ${booking.start_date} at our hall. Total: ${formatCurrency(booking.total_contract_amount, currencySymbol)}${extrasText}, Paid: ${formatCurrency(booking.total_paid, currencySymbol)}, Pending: ${formatCurrency(booking.pending_balance, currencySymbol)}.`
      );
      Linking.openURL(`https://wa.me/91${cleanPhone}?text=${text}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, glassStyles.getCardStyle(isDark)]}
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: t.text }]}>Booking Details</Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>
                Bill #{booking.bill_number}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close details modal"
            >
              <X size={18} color={t.text} />
            </TouchableOpacity>
          </View>

          {/* Customer Card */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View style={styles.infoRow}>
              <User size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.customerName, { color: t.text }]}>
                {booking.customer_name}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Phone size={14} color={t.textMuted} />
              <Text style={[styles.infoText, { color: t.textMuted }]}>
                {booking.customer_mobile || 'No contact specified'}
              </Text>
            </View>
          </View>

          {/* Event & Slot Details */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View style={styles.infoRow}>
              <Calendar size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.infoText, { color: t.text, fontWeight: '700' }]}>
                {booking.start_date === booking.end_date
                  ? booking.start_date
                  : `${booking.start_date} to ${booking.end_date}`}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Clock size={14} color={t.textMuted} />
              <Text style={[styles.infoText, { color: t.textMuted }]}>
                Slot: <Text style={{ textTransform: 'capitalize', color: t.text }}>{booking.slot.replace('_', ' ')}</Text> • {booking.event_type}
              </Text>
            </View>
          </View>

          {/* Financial Summary */}
          <View
            style={[
              styles.financialSummaryBox,
              {
                backgroundColor: isDark
                  ? 'rgba(229, 184, 66, 0.12)'
                  : 'rgba(198, 151, 73, 0.14)',
                borderColor: isDark
                  ? 'rgba(229, 184, 66, 0.25)'
                  : 'rgba(198, 151, 73, 0.35)',
              },
            ]}
          >
            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { color: t.textMuted }]}>Base Hall Price</Text>
              <Text style={[styles.finValue, { color: t.text }]}>
                {formatCurrency(booking.booking_price, currencySymbol)}
              </Text>
            </View>

            {(Number(booking.extra_charges) > 0 || (booking.extra_charges_items && booking.extra_charges_items.length > 0)) && (
              <>
                <View style={styles.finRow}>
                  <Text style={[styles.finLabel, { color: t.textMuted }]}>Extra Charges</Text>
                  <Text style={[styles.finValue, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                    +{formatCurrency(booking.extra_charges, currencySymbol)}
                  </Text>
                </View>

                {booking.extra_charges_items?.map((item, idx) => (
                  <View key={item.id || idx} style={[styles.finRow, { paddingLeft: 12 }]}>
                    <Text style={[styles.finSubLabel, { color: t.textSubtle }]}>• {item.title}</Text>
                    <Text style={[styles.finSubValue, { color: t.textMuted }]}>
                      {formatCurrency(item.amount, currencySymbol)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={[styles.finRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' }]}>
              <Text style={[styles.finLabel, { fontWeight: '700', color: t.text }]}>Total Contract</Text>
              <Text style={[styles.finValue, { fontWeight: '800', color: t.text }]}>
                {formatCurrency(booking.total_contract_amount, currencySymbol)}
              </Text>
            </View>

            <View style={styles.finRow}>
              <Text style={[styles.finLabel, { color: t.textMuted }]}>Amount Paid</Text>
              <Text
                style={[
                  styles.finValue,
                  { color: isDark ? colors.status.success.dark : colors.status.success.light },
                ]}
              >
                {formatCurrency(booking.total_paid, currencySymbol)}
              </Text>
            </View>

            <View style={[styles.finRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' }]}>
              <Text style={[styles.finLabel, { fontWeight: '700', color: t.text }]}>Pending Due</Text>
              <Text
                style={[
                  styles.finValue,
                  {
                    fontWeight: '800',
                    color:
                      booking.pending_balance > 0
                        ? isDark
                          ? colors.status.warning.dark
                          : colors.status.warning.light
                        : t.text,
                  },
                ]}
              >
                {formatCurrency(booking.pending_balance, currencySymbol)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {Boolean(booking.customer_mobile) && (
              <>
                <SecondaryButton
                  title="Call Customer"
                  onPress={handleCall}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="WhatsApp"
                  onPress={handleWhatsApp}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoText: {
    fontSize: 13,
  },
  financialSummaryBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 16,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finLabel: {
    fontSize: 13,
  },
  finValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  finSubLabel: {
    fontSize: 12,
  },
  finSubValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
});

