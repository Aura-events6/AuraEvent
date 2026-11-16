import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { X, AlertTriangle, Check, ShieldAlert } from 'lucide-react-native';
import { cancelBooking } from '../../services/bookingService';
import { BookingDetailsData } from '../../types/booking';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { formatCurrency } from '../../utils/dateUtils';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import { Alert } from 'react-native';

interface CancelBookingModalProps {
  visible: boolean;
  booking: BookingDetailsData;
  currencySymbol?: string;
  isDark?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  visible,
  booking,
  currencySymbol = '₹',
  isDark = false,
  onClose,
  onSuccess,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('0');
  const [refundMode, setRefundMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('upi');
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [cancelState, setCancelState] = useState<'idle' | 'cancelling' | 'cancelled'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalPaid = Number(booking.total_paid || 0);

  // LIFO overlay stack registration with unsaved changes prompt (Rule 1)
  useBackOverlay(visible, onClose, {
    hasUnsavedChanges: () => Boolean(reason.trim().length > 0 || isAcknowledged),
    onUnsavedChangesPrompt: async () => {
      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Discard Cancellation?',
          'You have unsaved cancellation details. Are you sure you want to discard them?',
          [
            { text: 'Keep Editing', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Discard', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    },
  });

  // Motion physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
      setIsAcknowledged(false);
      setCancelState('idle');
      setReason('');
      setRefundAmount('0');
      setRefundMode('upi');
      setErrorMessage(null);
    }
  }, [visible]);

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDismiss = () => {
    Animated.timing(backdropAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleConfirmCancel = async () => {
    if (!isAcknowledged) {
      setErrorMessage('Please acknowledge the irreversible slot release safety gate below.');
      triggerErrorShake();
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage('Please provide a valid cancellation reason (min 5 characters).');
      triggerErrorShake();
      return;
    }

    const refundNum = Number(refundAmount) || 0;
    if (refundNum < 0) {
      setErrorMessage('Refund amount cannot be negative.');
      triggerErrorShake();
      return;
    }

    if (refundNum > totalPaid) {
      setErrorMessage(
        `Refund cannot exceed total paid advance (${formatCurrency(totalPaid, currencySymbol)}).`
      );
      triggerErrorShake();
      return;
    }

    try {
      setCancelState('cancelling');
      setErrorMessage(null);

      await cancelBooking({
        bookingId: booking.id,
        reason: reason.trim(),
        refundAmount: refundNum,
        refundPaymentMode: refundMode,
      });

      setCancelState('cancelled');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      setCancelState('idle');
      setErrorMessage(err?.message || 'Failed to cancel booking.');
      triggerErrorShake();
    }
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  const sheetScale = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />

        <Animated.View
          style={[
            styles.modalContent,
            glassStyles.getCardStyle(isDark),
            {
              backgroundColor: isDark
                ? 'rgba(28, 25, 23, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
              borderColor: '#EF4444',
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.warningIconCircle}>
                <AlertTriangle size={18} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.title, { color: t.text }]}>Cancel Booking</Text>
                <Text style={[styles.subtitle, { color: t.textMuted }]}>
                  Bill #{booking.bill_number} • {booking.customers?.name || 'Customer'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close cancellation modal"
            >
              <X size={18} color={t.text} />
            </Pressable>
          </View>

          {/* Slot release notice */}
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(239, 68, 68, 0.08)',
                borderColor: isDark
                  ? 'rgba(239, 68, 68, 0.28)'
                  : 'rgba(239, 68, 68, 0.25)',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <ShieldAlert size={16} color={isDark ? '#FCA5A5' : '#B91C1C'} style={{ marginTop: 1 }} />
              <Text style={[styles.noticeText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                Releasing this slot will immediately make{' '}
                <Text style={{ fontWeight: '800' }}>{booking.start_date}</Text> available for new bookings. This action is irreversible.
              </Text>
            </View>
          </View>

          {/* Validation Error Banner with Error Shake */}
          {errorMessage && (
            <Animated.View
              style={[
                styles.errorBox,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Animated.View>
          )}

          {/* Cancellation Reason Input */}
          <View style={styles.formField}>
            <Text style={[styles.fieldLabel, { color: t.text }]}>
              Cancellation Reason *
            </Text>
            <TextInput
              value={reason}
              onChangeText={val => {
                setReason(val);
                setErrorMessage(null);
              }}
              placeholder="e.g. Customer requested cancellation due to family conflict"
              placeholderTextColor={t.textMuted}
              multiline
              numberOfLines={2}
              style={[
                styles.textArea,
                {
                  color: t.text,
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.12)',
                },
              ]}
            />
          </View>

          {/* Refund Input if advance was paid */}
          {totalPaid > 0 && (
            <View style={styles.formField}>
              <View style={styles.refundHeaderRow}>
                <Text style={[styles.fieldLabel, { color: t.text }]}>
                  Refund Amount (Advance Paid: {formatCurrency(totalPaid, currencySymbol)})
                </Text>
              </View>
              <View
                style={[
                  styles.refundInputWrapper,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.12)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyPrefix,
                    { color: isDark ? colors.gold[400] : colors.gold[600] },
                  ]}
                >
                  {currencySymbol}
                </Text>
                <TextInput
                  value={refundAmount}
                  onChangeText={val => {
                    setRefundAmount(val.replace(/[^0-9]/g, ''));
                    setErrorMessage(null);
                  }}
                  keyboardType="numeric"
                  style={[styles.refundInput, { color: t.text }]}
                />
              </View>

              {/* Refund Mode Selector with Tactile Chips */}
              <View style={styles.refundModeRow}>
                {(['upi', 'cash', 'card', 'credit'] as const).map(mode => {
                  const isSelected = refundMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setRefundMode(mode)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        styles.modePill,
                        {
                          transform: [{ scale: pressed ? 0.94 : 1 }],
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.25)'
                              : 'rgba(198, 151, 73, 0.18)'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.04)'
                              : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isSelected
                            ? isDark
                              ? colors.gold[400]
                              : colors.gold[600]
                            : isDark
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.08)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modePillText,
                          {
                            color: isSelected
                              ? isDark
                                ? colors.gold[400]
                                : colors.gold[600]
                              : t.textMuted,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {mode.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tactile Irreversible Action Safety Gate Checkbox */}
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsAcknowledged(prev => !prev);
              setErrorMessage(null);
            }}
            style={({ pressed }) => [
              styles.safetyGateRow,
              {
                backgroundColor: isAcknowledged
                  ? isDark
                    ? 'rgba(239, 68, 68, 0.18)'
                    : 'rgba(239, 68, 68, 0.12)'
                  : isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.03)',
                borderColor: isAcknowledged
                  ? '#EF4444'
                  : isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.12)',
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isAcknowledged }}
            accessibilityLabel="Safety gate: acknowledge slot release"
          >
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: isAcknowledged ? '#EF4444' : t.textMuted,
                  backgroundColor: isAcknowledged ? '#EF4444' : 'transparent',
                },
              ]}
            >
              {isAcknowledged && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text
              style={[
                styles.safetyGateText,
                {
                  color: isAcknowledged
                    ? isDark
                      ? '#FCA5A5'
                      : '#991B1B'
                    : t.text,
                },
              ]}
            >
              I understand this slot will be released immediately and this action cannot be undone.
            </Text>
          </Pressable>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleDismiss}
              disabled={cancelState === 'cancelling'}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dismiss cancellation"
            >
              <Text style={[styles.cancelBtnText, { color: t.text }]}>Dismiss</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmCancel}
              disabled={!isAcknowledged || cancelState !== 'idle'}
              style={({ pressed }) => [
                styles.confirmDeleteBtn,
                {
                  opacity: !isAcknowledged ? 0.45 : cancelState === 'cancelling' ? 0.85 : 1,
                  backgroundColor:
                    cancelState === 'cancelled'
                      ? '#059669'
                      : '#DC2626',
                  transform: [{ scale: pressed && isAcknowledged && cancelState === 'idle' ? 0.965 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm Cancellation"
            >
              {cancelState === 'cancelling' ? (
                <View style={styles.ctaLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.confirmDeleteText}>Cancelling & Releasing...</Text>
                </View>
              ) : cancelState === 'cancelled' ? (
                <View style={styles.ctaLoadingRow}>
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.confirmDeleteText}>Booking Cancelled ✓</Text>
                </View>
              ) : (
                <Text style={styles.confirmDeleteText}>Confirm Cancellation</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  warningIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  formField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 56,
  },
  refundHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refundInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  refundInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
  refundModeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  modePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  modePillText: {
    fontSize: 11,
  },
  safetyGateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyGateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmDeleteBtn: {
    flex: 1.6,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
