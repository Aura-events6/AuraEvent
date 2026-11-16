import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronDown, Check, Coins } from 'lucide-react-native';
import { DashboardDueCardItem } from '../../types/dashboard';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface DashboardPaymentModalProps {
  visible: boolean;
  selectedDue: DashboardDueCardItem | null;
  onClose: () => void;
  onConfirm: (amount: number, mode: 'UPI' | 'Cash' | 'Card', note: string, isSplit: boolean) => Promise<void>;
  isDark: boolean;
  originCoords?: { x: number; y: number } | null;
}

export const DashboardPaymentModal: React.FC<DashboardPaymentModalProps> = ({
  visible,
  selectedDue,
  onClose,
  onConfirm,
  isDark,
  originCoords,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Card'>('UPI');
  const [note, setNote] = useState<string>('');
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [isBillAccordionOpen, setIsBillAccordionOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Button Morph State: 'idle' | 'recording' | 'success'
  const [submitState, setSubmitState] = useState<'idle' | 'recording' | 'success'>('idle');

  // Input Focus States for Floating Labels
  const [isAmountFocused, setIsAmountFocused] = useState<boolean>(false);
  const [isNoteFocused, setIsNoteFocused] = useState<boolean>(false);

  // Animations
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;
  const sheetScaleAnim = useRef(new Animated.Value(0.85)).current;
  const sheetTranslateX = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(30)).current;
  const chevronRotateAnim = useRef(new Animated.Value(0)).current;
  const splitToggleAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const errorHeightAnim = useRef(new Animated.Value(0)).current;

  // Amount Floating Label Anim
  const amountLabelAnim = useRef(new Animated.Value(0)).current;
  // Note Floating Label Anim
  const noteLabelAnim = useRef(new Animated.Value(0)).current;

  // Initialize values when opened
  useEffect(() => {
    if (visible && selectedDue) {
      setAmount(selectedDue.rawDue ? selectedDue.rawDue.toString() : '');
      setNote('');
      setPaymentMode('UPI');
      setIsSplitMode(false);
      setIsBillAccordionOpen(false);
      setErrorMessage('');
      setSubmitState('idle');

      // Calculate origin offset for shared-element morph
      if (originCoords) {
        const dx = (originCoords.x - windowWidth / 2) * 0.3;
        const dy = (originCoords.y - windowHeight / 2) * 0.3;
        sheetTranslateX.setValue(dx);
        sheetTranslateY.setValue(dy);
      } else {
        sheetTranslateX.setValue(0);
        sheetTranslateY.setValue(30);
      }

      backdropFadeAnim.setValue(0);
      sheetScaleAnim.setValue(0.85);

      Animated.parallel([
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(sheetScaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(sheetTranslateX, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible, selectedDue]);

  // Floating label for Amount
  useEffect(() => {
    const isRaised = isAmountFocused || amount.length > 0;
    Animated.timing(amountLabelAnim, {
      toValue: isRaised ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isAmountFocused, amount]);

  // Floating label for Note
  useEffect(() => {
    const isRaised = isNoteFocused || note.length > 0;
    Animated.timing(noteLabelAnim, {
      toValue: isRaised ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isNoteFocused, note]);

  // Accordion Chevron Rotation
  useEffect(() => {
    Animated.timing(chevronRotateAnim, {
      toValue: isBillAccordionOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isBillAccordionOpen]);

  // Split Mode Toggle Thumb Spring
  useEffect(() => {
    Animated.spring(splitToggleAnim, {
      toValue: isSplitMode ? 1 : 0,
      tension: 65,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [isSplitMode]);

  // Trigger Error Shake & Inline Height Reveal
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    errorHeightAnim.setValue(0);
    Animated.parallel([
      Animated.timing(errorHeightAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(errorShakeAnim, { toValue: 7, duration: 40, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(errorShakeAnim, { toValue: -7, duration: 40, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(errorShakeAnim, { toValue: 5, duration: 40, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(errorShakeAnim, { toValue: -5, duration: 40, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(errorShakeAnim, { toValue: 0, duration: 40, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();
  };

  const handleSave = async () => {
    const val = parseInt(amount, 10);
    if (isNaN(val) || val <= 0) {
      triggerError('Please enter a valid payment amount greater than ₹0');
      return;
    }

    setErrorMessage('');
    setSubmitState('recording');

    try {
      await onConfirm(val, paymentMode, note, isSplitMode);

      // Morph into animated checkmark state
      setSubmitState('success');

      // Auto dismiss modal after 500ms
      setTimeout(() => {
        onClose();
      }, 500);
    } catch {
      setSubmitState('idle');
      triggerError('Failed to record payment. Please retry.');
    }
  };

  if (!visible || !selectedDue) return null;

  const chevronInterpolate = chevronRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const charCount = note.length;
  const isCharWarning = charCount >= 40 && charCount < 52;
  const isCharDanger = charCount >= 52;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: backdropFadeAnim }]}>
        <Animated.View
          style={[
            styles.modalCard,
            glassStyles.getCardStyle(isDark),
            {
              transform: [
                { scale: sheetScaleAnim },
                { translateX: sheetTranslateX },
                { translateY: sheetTranslateY },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <View style={[styles.emblemIcon, { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg }]}>
                <Coins size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: t.text }]}>Record Payment</Text>
                <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>
                  {selectedDue.customerName} • {selectedDue.eventType}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { transform: [{ scale: pressed ? 0.90 : 1 }] },
              ]}
              hitSlop={8}
            >
              <X size={18} color={t.textMuted} />
            </Pressable>
          </View>

          {/* 3.4 Accordion Bill Breakdown */}
          <Pressable
            onPress={() => setIsBillAccordionOpen(prev => !prev)}
            style={({ pressed }) => [
              styles.accordionHeader,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View>
              <Text style={[styles.accordionSubtitle, { color: t.textMuted }]}>
                CURRENT PENDING BALANCE
              </Text>
              <Text
                style={[
                  styles.accordionAmount,
                  {
                    color:
                      selectedDue.status === 'Overdue'
                        ? isDark
                          ? colors.status.danger.dark
                          : colors.status.danger.light
                        : isDark
                        ? colors.gold[400]
                        : colors.gold[600],
                  },
                ]}
              >
                {selectedDue.dueAmount}
              </Text>
            </View>

            <View style={styles.accordionRightCol}>
              <Text style={[styles.accordionToggleText, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                {isBillAccordionOpen ? 'Hide Bill' : 'View Bill'}
              </Text>
              <Animated.View style={{ transform: [{ rotate: chevronInterpolate }] }}>
                <ChevronDown size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </Animated.View>
            </View>
          </Pressable>

          {/* Accordion Expanded Content */}
          {isBillAccordionOpen && (
            <View style={[styles.accordionBody, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' }]}>
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: t.textMuted }]}>Total Contract Package:</Text>
                <Text style={[styles.billVal, { color: t.text }]}>{selectedDue.totalContract || '₹2,50,000'}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: t.textMuted }]}>Advance Already Settled:</Text>
                <Text style={[styles.billVal, { color: isDark ? colors.status.success.dark : colors.status.success.light }]}>
                  - {selectedDue.advancePaid || '₹1,30,000'}
                </Text>
              </View>
              <View style={[styles.billRow, styles.billRowDivider, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(198,151,73,0.2)' }]}>
                <Text style={[styles.billLabel, { color: t.text, fontWeight: '700' }]}>Remaining Due Balance:</Text>
                <Text style={[styles.billVal, { color: isDark ? colors.gold[400] : colors.gold[600], fontWeight: '800' }]}>
                  {selectedDue.dueAmount}
                </Text>
              </View>
            </View>
          )}

          {/* 4.1 Floating Label Amount Input */}
          <Animated.View
            style={[
              styles.floatingInputContainer,
              { transform: [{ translateX: errorShakeAnim }] },
            ]}
          >
            <View
              style={[
                styles.inputWrapper,
                glassStyles.getInputStyle(isDark),
                isAmountFocused && { borderColor: colors.gold[500] },
                Boolean(errorMessage) && { borderColor: '#EF4444' },
              ]}
            >
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    color: Boolean(errorMessage)
                      ? '#EF4444'
                      : isAmountFocused
                      ? isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                      : t.textMuted,
                    top: amountLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, -8],
                    }),
                    fontSize: amountLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 11],
                    }),
                    backgroundColor: t.background,
                  },
                ]}
              >
                Amount Received Now (₹) *
              </Animated.Text>
              <TextInput
                value={amount}
                onChangeText={text => {
                  setAmount(text);
                  if (errorMessage) setErrorMessage('');
                }}
                onFocus={() => setIsAmountFocused(true)}
                onBlur={() => setIsAmountFocused(false)}
                keyboardType="numeric"
                style={[styles.textInput, { color: t.text }]}
              />
            </View>

            {/* 4.2 Error Shake & Inline Reveal */}
            {Boolean(errorMessage) && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  {
                    opacity: errorHeightAnim,
                    transform: [
                      {
                        translateY: errorHeightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-6, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.errorText}>{errorMessage}</Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Payment Mode Selector */}
          <Text style={[styles.fieldLabel, { color: t.textMuted, marginTop: 10 }]}>Payment Mode</Text>
          <View style={styles.modeChipsRow}>
            {(['UPI', 'Cash', 'Card'] as const).map(mode => (
              <Pressable
                key={mode}
                onPress={() => setPaymentMode(mode)}
                style={({ pressed }) => [
                  styles.modeChip,
                  paymentMode === mode
                    ? {
                        backgroundColor: isDark ? colors.gold[400] : colors.gold[600],
                        borderColor: isDark ? colors.gold[300] : colors.gold[700],
                      }
                    : {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: 'transparent',
                      },
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    { color: paymentMode === mode ? '#121212' : t.text },
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 1.3 Spring Toggle: Split Mode */}
          <View style={styles.splitRow}>
            <View>
              <Text style={[styles.splitTitle, { color: t.text }]}>Split Mode</Text>
              <Text style={[styles.splitSub, { color: t.textMuted }]}>Multiple payments or installments</Text>
            </View>
            <Pressable
              onPress={() => setIsSplitMode(prev => !prev)}
              style={[
                styles.switchTrack,
                {
                  backgroundColor: isSplitMode
                    ? isDark
                      ? colors.gold[500]
                      : colors.gold[600]
                    : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(0,0,0,0.1)',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.switchThumb,
                  {
                    transform: [
                      {
                        translateX: splitToggleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [2, 20],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </Pressable>
          </View>

          {/* 4.1 Floating Label Note Input + 4.4 Character Count Pulse */}
          <View style={styles.floatingInputContainer}>
            <View
              style={[
                styles.inputWrapper,
                glassStyles.getInputStyle(isDark),
                isNoteFocused && { borderColor: colors.gold[500] },
              ]}
            >
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    color: isNoteFocused ? (isDark ? colors.gold[400] : colors.gold[600]) : t.textMuted,
                    top: noteLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, -8],
                    }),
                    fontSize: noteLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 11],
                    }),
                    backgroundColor: t.background,
                  },
                ]}
              >
                Payment Reference / Note
              </Animated.Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={60}
                onFocus={() => setIsNoteFocused(true)}
                onBlur={() => setIsNoteFocused(false)}
                placeholderTextColor="transparent"
                style={[styles.textInput, { color: t.text }]}
              />
            </View>

            {/* Character Count Pulse */}
            <View style={styles.charCountRow}>
              <Text
                style={[
                  styles.charCountText,
                  {
                    color: isCharDanger
                      ? '#EF4444'
                      : isCharWarning
                      ? '#F59E0B'
                      : t.textSubtle,
                    fontWeight: isCharWarning || isCharDanger ? '700' : '500',
                  },
                ]}
              >
                {charCount} / 60
              </Text>
            </View>
          </View>

          {/* 2.2 Multi-State Button Morph: Label -> Spinner -> SVG Checkmark */}
          <Pressable
            onPress={handleSave}
            disabled={submitState !== 'idle'}
            style={({ pressed }) => [
              styles.submitBtnWrapper,
              { transform: [{ scale: pressed && submitState === 'idle' ? 0.965 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={
                submitState === 'success'
                  ? ['#10B981', '#059669']
                  : ['#F5D372', '#E5B842', '#C9971D']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtnGradient}
            >
              {submitState === 'recording' && (
                <View style={styles.btnContentRow}>
                  <ActivityIndicator size="small" color="#1A1500" />
                  <Text style={styles.submitBtnText}>Recording...</Text>
                </View>
              )}

              {submitState === 'success' && (
                <View style={styles.btnContentRow}>
                  <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  <Text style={[styles.submitBtnText, { color: '#FFFFFF' }]}>Saved to Khatabook ✓</Text>
                </View>
              )}

              {submitState === 'idle' && (
                <Text style={styles.submitBtnText}>Save Payment & Update Khatabook</Text>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emblemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  accordionSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accordionAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  accordionRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accordionToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accordionBody: {
    padding: 12,
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 14,
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billRowDivider: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2,
  },
  billLabel: {
    fontSize: 11,
  },
  billVal: {
    fontSize: 11,
    fontWeight: '600',
  },
  floatingInputContainer: {
    marginBottom: 12,
  },
  inputWrapper: {
    position: 'relative',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  floatingLabel: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 4,
    fontWeight: '600',
    zIndex: 2,
  },
  textInput: {
    height: '100%',
    fontSize: 16,
    fontWeight: '700',
  },
  errorContainer: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modeChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modeChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 12,
  },
  splitTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  splitSub: {
    fontSize: 11,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 4,
    paddingRight: 4,
  },
  charCountText: {
    fontSize: 10,
  },
  submitBtnWrapper: {
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
  },
  submitBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1500',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

