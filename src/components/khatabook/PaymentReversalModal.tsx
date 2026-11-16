import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  X,
  History,
  AlertCircle,
  FileText,
  Check,
} from 'lucide-react-native';
import { reversePayment } from '../../services/khatabookService';
import { AuthInput } from '../AuthInput';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { formatCurrency } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface PaymentReversalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  paymentId: string;
  amount: number;
  paymentMode: string;
  recordedAt: string;
  recordedBy?: string;
  currencySymbol?: string;
  isDark?: boolean;
}

export const PaymentReversalModal: React.FC<PaymentReversalModalProps> = ({
  visible,
  onClose,
  onSuccess,
  paymentId,
  amount,
  paymentMode,
  recordedAt,
  recordedBy = 'Staff',
  currencySymbol = '₹',
  isDark = false,
}) => {
  const { logout } = useAuth();
  const t = isDark ? colors.dark : colors.light;
   
  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [reason, setReason] = useState('');
  const [reversalState, setReversalState] = useState<'idle' | 'reversing' | 'reversed'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Motion physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

      setReason('');
      setReversalState('idle');
      setErrorMsg(null);
    }
  }, [visible]);

  // Ambient pulse on high-risk warning icon
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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

  const formattedDate = recordedAt
    ? new Date(recordedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const handleConfirmReversal = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Please enter a valid reversal reason (min 5 characters).');
      triggerErrorShake();
      return;
    }

    try {
      setReversalState('reversing');
      setErrorMsg(null);

      await reversePayment(
        {
          paymentId,
          reason: reason.trim(),
        },
        logout
      );

      setReversalState('reversed');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('[PaymentReversalModal] Error:', err);
      setReversalState('idle');
      setErrorMsg(err?.message || 'Failed to reverse payment.');
      triggerErrorShake();
    }
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
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
            <View style={styles.headerLeft}>
              <Animated.View
                style={[
                  styles.warningCircle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <AlertTriangle size={18} color="#EF4444" />
              </Animated.View>
              <View>
                <Text style={[styles.title, { color: t.text }]}>
                  Reverse Payment
                </Text>
                <Text style={[styles.subtitle, { color: t.textMuted }]}>
                  Record an auditable ledger correction
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
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <X size={18} color={t.text} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Target Payment Info Card */}
            <View
              style={[
                styles.paymentPreviewBox,
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
              <View>
                <Text style={[styles.previewLabel, { color: t.textMuted }]}>
                  Payment to Reverse
                </Text>
                <Text style={styles.previewAmount}>
                  {formatCurrency(amount, currencySymbol)}
                </Text>
              </View>

              <View style={styles.previewRight}>
                <Text style={[styles.previewModeText, { color: t.text }]}>
                  {paymentMode.toUpperCase()}
                </Text>
                <Text style={[styles.previewSubtext, { color: t.textMuted }]}>
                  {formattedDate} • by {recordedBy}
                </Text>
              </View>
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

            {/* Mandatory Reason Input */}
            <AuthInput
              label="Mandatory Reason for Reversal *"
              placeholder="e.g. Double entry made by mistake, bank transaction failed"
              value={reason}
              onChangeText={val => {
                setReason(val);
                setErrorMsg(null);
              }}
              multiline
              numberOfLines={3}
              leftIcon={<FileText size={18} color="#EF4444" />}
            />

            {/* Immutable Warning Notice */}
            <View style={styles.warningNotice}>
              <AlertCircle size={15} color="#DC2626" />
              <Text style={styles.warningNoticeText}>
                Payments are immutable. This will record a balancing reversal row in the ledger and notify the hall owner. This action cannot be undone.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable
                onPress={handleDismiss}
                disabled={reversalState === 'reversing'}
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
                accessibilityLabel="Cancel Reversal"
              >
                <Text style={[styles.cancelBtnText, { color: t.text }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmReversal}
                disabled={reversalState !== 'idle'}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  {
                    backgroundColor:
                      reversalState === 'reversed'
                        ? '#059669'
                        : '#DC2626',
                    transform: [{ scale: pressed && reversalState === 'idle' ? 0.965 : 1 }],
                    opacity: reversalState === 'reversing' ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirm Reversal"
              >
                {reversalState === 'reversing' ? (
                  <View style={styles.ctaLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Reversing Ledger...</Text>
                  </View>
                ) : reversalState === 'reversed' ? (
                  <View style={styles.ctaLoadingRow}>
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    <Text style={styles.confirmBtnText}>Ledger Corrected ✓</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Reversal</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  warningCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
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
    gap: 14,
  },
  paymentPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  previewAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  previewRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  previewModeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  previewSubtext: {
    fontSize: 11,
    fontWeight: '500',
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
  warningNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    borderRadius: 12,
    padding: 12,
  },
  warningNoticeText: {
    color: '#EF4444',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
  confirmBtn: {
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
  confirmBtnText: {
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
