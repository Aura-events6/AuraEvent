import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
  LayoutAnimation,
} from 'react-native';
import {
  CreditCard,
  DollarSign,
  Smartphone,
  Banknote,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Check,
  Zap,
} from 'lucide-react-native';
import { recordPayment } from '../../services/khatabookService';
import { AuthInput } from '../AuthInput';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { formatCurrency } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface RecordPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
  billNumber: string;
  customerName: string;
  customerMobile: string;
  pendingBalance: number;
  currencySymbol?: string;
  isDark?: boolean;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  bookingId,
  billNumber,
  customerName,
  customerMobile,
  pendingBalance,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const { logout } = useAuth();
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [amount, setAmount] = useState<string>(() => pendingBalance.toString());
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi' | 'credit'>('upi');
  const [promisedDate, setPromisedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Motion physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sync amount with pending balance when modal opens
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

      setAmount(pendingBalance.toString());
      setPaymentMode('upi');
      setPromisedDate('');
      setNotes('');
      setSubmitState('idle');
      setErrorMsg(null);
    }
  }, [visible, pendingBalance]);

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

  const numericAmount = Number(amount) || 0;
  const isPartial = numericAmount < pendingBalance && numericAmount > 0;
  const isOverpaying = numericAmount > pendingBalance && pendingBalance > 0;

  const handleConfirm = async () => {
    if (numericAmount <= 0) {
      setErrorMsg('Please enter a payment amount greater than zero.');
      triggerErrorShake();
      return;
    }

    try {
      setSubmitState('saving');
      setErrorMsg(null);

      await recordPayment(
        {
          bookingId,
          amount: numericAmount,
          paymentMode,
          promisedPayByDate: promisedDate.trim() || null,
          notes: notes.trim() || undefined,
        },
        logout
      );

      setSubmitState('saved');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('[RecordPaymentModal] Error:', err);
      setSubmitState('idle');
      setErrorMsg(err?.message || 'Failed to record payment.');
      triggerErrorShake();
    }
  };

  const paymentModes: {
    key: 'upi' | 'cash' | 'card' | 'credit';
    label: string;
    icon: typeof Smartphone;
  }[] = [
    { key: 'upi', label: 'UPI', icon: Smartphone },
    { key: 'cash', label: 'Cash', icon: Banknote },
    { key: 'card', label: 'Card', icon: CreditCard },
    { key: 'credit', label: 'Credit', icon: Clock },
  ];

  // Quick preset amounts
  const presets: { label: string; value: number }[] = [];
  if (pendingBalance > 0) {
    presets.push({ label: 'Full Due', value: pendingBalance });
    const half = Math.round(pendingBalance / 2);
    if (half > 0 && half !== pendingBalance) {
      presets.push({ label: '50%', value: half });
    }
    if (pendingBalance >= 25000 && 25000 !== pendingBalance && 25000 !== half) {
      presets.push({ label: `${currencySymbol}25,000`, value: 25000 });
    } else if (pendingBalance >= 10000 && 10000 !== pendingBalance && 10000 !== half) {
      presets.push({ label: `${currencySymbol}10,000`, value: 10000 });
    }
  }

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
  });

  const sheetScale = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContent,
            glassStyles.getCardStyle(isDark),
            {
              backgroundColor: isDark
                ? 'rgba(28, 26, 24, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark
                ? 'rgba(214, 174, 107, 0.35)'
                : 'rgba(198, 151, 73, 0.35)',
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: t.text }]}>
                Record Payment
              </Text>
              <Text style={[styles.subtitle, { color: t.textMuted }]}>
                {billNumber} • {customerName}
              </Text>
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
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <X size={18} color={t.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Due Balance Pill with RollingNumberTicker */}
            <View
              style={[
                styles.dueBanner,
                {
                  backgroundColor: isDark
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(245, 158, 11, 0.12)',
                  borderColor: isDark
                    ? 'rgba(245, 158, 11, 0.35)'
                    : 'rgba(245, 158, 11, 0.30)',
                },
              ]}
            >
              <Text style={[styles.dueBannerLabel, { color: t.text }]}>
                Current Pending Due:
              </Text>
              <RollingNumberTicker
                targetValue={pendingBalance}
                isCurrency
                prefix={currencySymbol}
                style={[styles.dueBannerAmount, { color: '#D97706' }]}
              />
            </View>

            {/* Error Banner with Horizontal Error Shake */}
            {errorMsg && (
              <Animated.View
                style={[
                  styles.errorBanner,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </Animated.View>
            )}

            {/* Payment Amount Input */}
            <AuthInput
              label="Amount to Collect * (₹)"
              placeholder="e.g. 25000"
              value={amount}
              onChangeText={val => {
                setAmount(val.replace(/[^0-9]/g, ''));
                setErrorMsg(null);
              }}
              keyboardType="numeric"
              leftIcon={<DollarSign size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />}
            />

            {/* Quick Fill Preset Buttons */}
            {presets.length > 0 && (
              <View style={styles.presetRow}>
                {presets.map(p => {
                  const isActive = numericAmount === p.value;
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setAmount(p.value.toString());
                        setErrorMsg(null);
                      }}
                      style={({ pressed }) => [
                        styles.presetChip,
                        {
                          backgroundColor: isActive
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.28)'
                              : 'rgba(198, 151, 73, 0.22)'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.04)',
                          borderColor: isActive
                            ? isDark
                              ? colors.gold[400]
                              : colors.gold[600]
                            : isDark
                              ? 'rgba(255, 255, 255, 0.10)'
                              : 'rgba(0, 0, 0, 0.08)',
                          transform: [{ scale: pressed ? 0.94 : 1 }],
                        },
                      ]}
                    >
                      <Zap size={11} color={isActive ? (isDark ? colors.gold[400] : colors.gold[600]) : t.textMuted} />
                      <Text
                        style={[
                          styles.presetText,
                          {
                            color: isActive
                              ? isDark
                                ? colors.gold[400]
                                : colors.gold[600]
                              : t.textMuted,
                            fontWeight: isActive ? '800' : '600',
                          },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Overpaying Alert */}
            {isOverpaying && (
              <View style={styles.warningPill}>
                <AlertCircle size={14} color="#D97706" />
                <Text style={styles.warningText}>
                  Amount exceeds current due balance by {formatCurrency(numericAmount - pendingBalance, currencySymbol)}.
                </Text>
              </View>
            )}

            {/* Payment Mode Selector with Tactile Chips */}
            <View style={styles.modeSection}>
              <Text style={[styles.modeSectionLabel, { color: t.text }]}>
                Payment Mode *
              </Text>
              <View style={styles.modeRow}>
                {paymentModes.map(m => {
                  const isSelected = paymentMode === m.key;
                  const Icon = m.icon;

                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setPaymentMode(m.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        styles.modeChip,
                        {
                          transform: [{ scale: pressed ? 0.94 : 1 }],
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.25)'
                              : 'rgba(198, 151, 73, 0.20)'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.04)',
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
                      <Icon
                        size={14}
                        color={
                          isSelected
                            ? isDark
                              ? colors.gold[400]
                              : colors.gold[600]
                            : t.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.modeText,
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
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Promised Pay-By Date (Conditional for Credit or Partial Payment) */}
            {(paymentMode === 'credit' || isPartial) && (
              <AuthInput
                label="Promised Pay-By Date (YYYY-MM-DD)"
                placeholder="2026-11-30"
                value={promisedDate}
                onChangeText={setPromisedDate}
                leftIcon={<Calendar size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />}
              />
            )}

            {/* Operational Notes */}
            <AuthInput
              label="Payment Remarks / Notes"
              placeholder="e.g. 2nd installment paid via PhonePe"
              value={notes}
              onChangeText={setNotes}
              leftIcon={<FileText size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />}
            />
          </ScrollView>

          {/* Action Footer with Multi-State CTA Button Morph */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleConfirm}
              disabled={submitState !== 'idle'}
              style={({ pressed }) => [
                styles.primaryCtaBtn,
                {
                  backgroundColor:
                    submitState === 'saved'
                      ? '#059669'
                      : isDark
                        ? colors.gold[500]
                        : colors.gold[600],
                  transform: [{ scale: pressed && submitState === 'idle' ? 0.965 : 1 }],
                  opacity: submitState === 'saving' ? 0.88 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm Payment"
            >
              {submitState === 'saving' ? (
                <View style={styles.ctaLoadingRow}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.primaryCtaText}>Recording Payment...</Text>
                </View>
              ) : submitState === 'saved' ? (
                <View style={styles.ctaLoadingRow}>
                  <Check size={18} color="#FFF" strokeWidth={3} />
                  <Text style={[styles.primaryCtaText, { color: '#FFF' }]}>Payment Recorded ✓</Text>
                </View>
              ) : (
                <Text style={styles.primaryCtaText}>
                  Confirm Payment ({formatCurrency(numericAmount, currencySymbol)})
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  modalContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
    gap: 12,
  },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  dueBannerLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  dueBannerAmount: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  warningText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  modeSection: {
    gap: 6,
  },
  modeSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 44,
  },
  modeText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  primaryCtaBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCtaText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
