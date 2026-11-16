import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Calendar, Clock, Sparkles } from 'lucide-react-native';
import { BookingSlot } from '../../types/calendar';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { AuthInput } from '../AuthInput';
import { PrimaryButton } from '../PrimaryButton';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface BookingActionModalProps {
  visible: boolean;
  dateStr: string;
  slot: BookingSlot;
  isDark?: boolean;
  onClose: () => void;
  onSubmitMock?: (details: any) => void;
}

export const BookingActionModal: React.FC<BookingActionModalProps> = ({
  visible,
  dateStr,
  slot,
  isDark = false,
  onClose,
  onSubmitMock,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [eventType, setEventType] = useState('Marriage Function');
  const [amount, setAmount] = useState('50000');

  const slotTitle = {
    morning: 'Morning Slot (06:00 AM – 03:00 PM)',
    evening: 'Evening Slot (04:00 PM – 11:59 PM)',
    full_day: 'Full Day (24 Hours)',
  }[slot];

  const handleConfirm = () => {
    onSubmitMock?.({
      customerName: customerName.trim() || 'New Customer',
      mobile: mobile.trim() || '9876543210',
      eventType,
      amount: parseInt(amount, 10) || 50000,
      dateStr,
      slot,
    });
    onClose();
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
              <Text style={[styles.title, { color: t.text }]}>New Booking</Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>
                Pre-filled from slot selection
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close booking modal"
            >
              <X size={18} color={t.text} />
            </TouchableOpacity>
          </View>

          {/* Slot summary pill */}
          <View
            style={[
              styles.summaryPill,
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
            <View style={styles.pillRow}>
              <Calendar size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text
                style={[
                  styles.pillText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                Date: {dateStr}
              </Text>
            </View>
            <View style={styles.pillRow}>
              <Clock size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text
                style={[
                  styles.pillText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                {slotTitle}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <AuthInput
              label="Customer Full Name *"
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. Anand Murthy"
            />

            <AuthInput
              label="Mobile Number *"
              value={mobile}
              onChangeText={setMobile}
              placeholder="e.g. 9845012345"
              keyboardType="phone-pad"
            />

            <AuthInput
              label="Event Type"
              value={eventType}
              onChangeText={setEventType}
              placeholder="e.g. Wedding Reception, Engagement"
            />

            <AuthInput
              label="Contract Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 50000"
              keyboardType="numeric"
            />

            <View style={styles.phase3Notice}>
              <Sparkles size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.phase3Text, { color: t.textMuted }]}>
                Full GiST atomic conflict checking & advance payment ledger activates in Phase 3.
              </Text>
            </View>

            <PrimaryButton
              title="Confirm Booking"
              onPress={handleConfirm}
              style={{ marginTop: 12, marginBottom: Platform.OS === 'ios' ? 24 : 12 }}
            />
          </ScrollView>
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
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  summaryPill: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formScroll: {
    maxHeight: 400,
  },
  phase3Notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    marginVertical: 8,
  },
  phase3Text: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
});

