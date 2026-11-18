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
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronDown, Check, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { DashboardDueCardItem } from '../../types/dashboard';
import { colors } from '../../theme/colors';
import { useBackOverlay } from '../../hooks/useBackOverlay';

export type DashboardPaymentMode = 'UPI' | 'Cash' | 'Card' | 'Credit';

interface DashboardPaymentModalProps {
  visible: boolean;
  selectedDue: DashboardDueCardItem | null;
  onClose: () => void;
  onConfirm: (
    amount: number,
    mode: DashboardPaymentMode,
    note: string,
    isSplit: boolean
  ) => Promise<void>;
  isDark: boolean;
  originCoords?: { x: number; y: number } | null;
}

const PAYMENT_MODES: DashboardPaymentMode[] = ['UPI', 'Cash', 'Card', 'Credit'];

export const DashboardPaymentModal: React.FC<DashboardPaymentModalProps> = ({
  visible,
  selectedDue,
  onClose,
  onConfirm,
  isDark,
  originCoords,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const modalBgSolid = isDark ? '#26231F' : '#FFFDFA';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<DashboardPaymentMode>('UPI');
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
  const sheetScaleAnim = useRef(new Animated.Value(0.92)).current;
  const sheetTranslateX = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(28)).current;
  const chevronRotateAnim = useRef(new Animated.Value(0)).current;
  const splitToggleAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const errorHeightAnim = useRef(new Animated.Value(0)).current;

  // Floating Label Anims
  const amountLabelAnim = useRef(new Animated.Value(0)).current;
  const noteLabelAnim = useRef(new Animated.Value(0)).current;

  // Initialize values when opened
  useEffect(() => {
    if (visible && selectedDue) {
      const initialAmt = selectedDue.rawDue ? selectedDue.rawDue.toString() : '';
      setAmount(initialAmt);
      setNote('');
      setPaymentMode('UPI');
      setIsSplitMode(false);
      setIsBillAccordionOpen(false);
      setErrorMessage('');
      setSubmitState('idle');
      setIsAmountFocused(false);
      setIsNoteFocused(false);

      amountLabelAnim.setValue(initialAmt.length > 0 ? 1 : 0);
      noteLabelAnim.setValue(0);

      if (originCoords) {
        const dx = (originCoords.x - windowWidth / 2) * 0.25;
        const dy = (originCoords.y - windowHeight / 2) * 0.25;
        sheetTranslateX.setValue(dx);
        sheetTranslateY.setValue(dy);
      } else {
        sheetTranslateX.setValue(0);
        sheetTranslateY.setValue(28);
      }

      backdropFadeAnim.setValue(0);
      sheetScaleAnim.setValue(0.92);

      Animated.parallel([
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(sheetScaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 9,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(sheetTranslateX, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible, selectedDue]);

  // Animate Floating Labels
  const isAmountLifted = isAmountFocused || amount.length > 0;
  const isNoteLifted = isNoteFocused || note.length > 0;

  useEffect(() => {
    Animated.timing(amountLabelAnim, {
      toValue: isAmountLifted ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isAmountLifted]);

  useEffect(() => {
    Animated.timing(noteLabelAnim, {
      toValue: isNoteLifted ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isNoteLifted]);

  // Accordion Chevron rotation
  useEffect(() => {
    Animated.spring(chevronRotateAnim, {
      toValue: isBillAccordionOpen ? 1 : 0,
      tension: 80,
      friction: 8,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isBillAccordionOpen]);

  // Split Toggle Spring
  useEffect(() => {
    Animated.spring(splitToggleAnim, {
      toValue: isSplitMode ? 1 : 0,
      tension: 80,
      friction: 7,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isSplitMode]);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    errorShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(errorShakeAnim, { toValue: 8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(errorShakeAnim, { toValue: -8, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(errorShakeAnim, { toValue: 6, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(errorShakeAnim, { toValue: -4, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(errorShakeAnim, { toValue: 0, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    Animated.timing(errorHeightAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleSave = async () => {
    if (!selectedDue || submitState !== 'idle') return;
    const numericAmount = parseFloat(amount.replace(/,/g, ''));

    if (isNaN(numericAmount) || numericAmount <= 0) {
      triggerError('Enter a valid amount greater than 0.');
      return;
    }

    setErrorMessage('');
    setSubmitState('recording');

    try {
      await onConfirm(numericAmount, paymentMode, note.trim(), isSplitMode);
      setSubmitState('success');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: backdropFadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: modalBgSolid,
                borderColor: t.controlBorder,
                transform: [
                  { scale: sheetScaleAnim },
                  { translateX: sheetTranslateX },
                  { translateY: sheetTranslateY },
                ],
              },
            ]}
          >
            {/* 1. Header: RECORD PAYMENT eyebrow + Customer Name + 44x44 Circular Close */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.modalEyebrow, { color: t.goldText }]}>
                  RECORD PAYMENT
                </Text>
                <Text style={[styles.modalTitle, { color: t.text }]} numberOfLines={1}>
                  {selectedDue.customerName}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: t.controlSurface,
                    borderColor: t.controlBorder,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close payment modal"
              >
                <X size={16} color={t.text} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* 2. Pending Balance Summary Accordion Box (Gold-Tinted, Zero Shadow) */}
            <View
              style={[
                styles.balanceBox,
                {
                  backgroundColor: t.goldPillBg,
                  borderColor: isDark
                    ? 'rgba(229, 198, 135, 0.25)'
                    : 'rgba(214, 174, 107, 0.25)',
                },
              ]}
            >
              <Pressable
                onPress={() => setIsBillAccordionOpen(prev => !prev)}
                style={styles.balanceHeaderRow}
                accessibilityRole="button"
                accessibilityLabel="Toggle bill breakdown"
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.balanceDateText, { color: t.textSecondary }]}>
                    Event Date:{' '}
                    <Text style={{ fontWeight: '700', color: t.text }}>
                      {selectedDue.eventDate}
                    </Text>
                  </Text>
                  <View style={styles.balanceLabelRow}>
                    <Text style={[styles.balanceDueLabel, { color: t.text }]}>
                      Balance Due
                    </Text>
                    <Animated.View style={{ transform: [{ rotate: chevronInterpolate }] }}>
                      <ChevronDown size={14} color={t.goldText} strokeWidth={2.4} />
                    </Animated.View>
                  </View>
                </View>

                <Text style={[styles.balanceAmountText, { color: t.text }]}>
                  {selectedDue.dueAmount}
                </Text>
              </Pressable>

              {isBillAccordionOpen && (
                <View
                  style={[
                    styles.accordionBody,
                    {
                      borderTopColor: isDark
                        ? 'rgba(229, 198, 135, 0.20)'
                        : 'rgba(198, 151, 73, 0.20)',
                    },
                  ]}
                >
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: t.textSecondary }]}>
                      Total Contract
                    </Text>
                    <Text style={[styles.billVal, { color: t.text }]}>
                      {selectedDue.totalContract || '—'}
                    </Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={[styles.billLabel, { color: t.emeraldText }]}>
                      Already Paid
                    </Text>
                    <Text style={[styles.billVal, { color: t.emeraldText }]}>
                      - {selectedDue.advancePaid || '₹0'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* 3. Floating Label Amount Input */}
            <Animated.View
              style={[
                styles.floatingInputContainer,
                { transform: [{ translateX: errorShakeAnim }] },
              ]}
            >
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: t.controlSurface,
                    borderColor: Boolean(errorMessage)
                      ? t.roseText
                      : isAmountFocused
                        ? colors.gold[500]
                        : t.controlBorder,
                  },
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.floatingLabel,
                    {
                      top: amountLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, -9],
                      }),
                      backgroundColor: isAmountLifted ? modalBgSolid : 'transparent',
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: Boolean(errorMessage)
                        ? t.roseText
                        : isAmountFocused
                          ? t.goldText
                          : t.textMuted,
                      fontWeight: isAmountLifted ? '600' : '500',
                      fontSize: amountLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [13, 11],
                      }),
                    }}
                  >
                    Amount Received (₹)
                  </Animated.Text>
                </Animated.View>
                <TextInput
                  value={amount}
                  onChangeText={text => {
                    setAmount(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  onFocus={() => setIsAmountFocused(true)}
                  onBlur={() => setIsAmountFocused(false)}
                  keyboardType="numeric"
                  style={[styles.textInput, styles.amountInputText, { color: t.text }]}
                />
              </View>

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
                            outputRange: [-4, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <AlertCircle size={13} color={t.roseText} />
                  <Text style={[styles.errorText, { color: t.roseText }]}>
                    {errorMessage}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* 4. Payment Mode Header + Inline Split Mode Switch + 4-Column Grid */}
            <View style={styles.modeSection}>
              <View style={styles.modeHeaderRow}>
                <Text style={[styles.modeHeaderLabel, { color: t.textSecondary }]}>
                  Payment Mode
                </Text>

                <Pressable
                  onPress={() => setIsSplitMode(prev => !prev)}
                  style={styles.splitToggleWrap}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isSplitMode }}
                  accessibilityLabel="Toggle split payment mode"
                >
                  <Text style={[styles.splitToggleLabel, { color: t.textSecondary }]}>
                    Split Mode
                  </Text>
                  <View
                    style={[
                      styles.switchTrack,
                      {
                        backgroundColor: isSplitMode
                          ? colors.gold[500]
                          : isDark
                            ? 'rgba(255, 255, 255, 0.16)'
                            : 'rgba(120, 113, 108, 0.25)',
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
                                outputRange: [2, 18],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={styles.modeGrid}>
                {PAYMENT_MODES.map(mode => {
                  const isActive = paymentMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setPaymentMode(mode)}
                      style={({ pressed }) => [
                        styles.modeBtnWrap,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`Payment mode ${mode}`}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={isDark ? colors.goldGradientDark : colors.goldGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.modeBtnActive}
                        >
                          <Text style={styles.modeBtnTextActive}>{mode}</Text>
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            styles.modeBtnInactive,
                            {
                              backgroundColor: t.controlSurface,
                              borderColor: t.controlBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.modeBtnTextInactive, { color: t.text }]}>
                            {mode}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 5. Floating Label Note Input + Character Counter */}
            <View style={styles.floatingInputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: t.controlSurface,
                    borderColor: isNoteFocused ? colors.gold[500] : t.controlBorder,
                  },
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.floatingLabel,
                    {
                      top: noteLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, -9],
                      }),
                      backgroundColor: isNoteLifted ? modalBgSolid : 'transparent',
                    },
                  ]}
                >
                  <Animated.Text
                    style={{
                      color: isNoteFocused ? t.goldText : t.textMuted,
                      fontWeight: isNoteLifted ? '600' : '500',
                      fontSize: noteLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [13, 11],
                      }),
                    }}
                  >
                    Note (Optional)
                  </Animated.Text>
                </Animated.View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  maxLength={60}
                  onFocus={() => setIsNoteFocused(true)}
                  onBlur={() => setIsNoteFocused(false)}
                  placeholderTextColor="transparent"
                  style={[styles.textInput, styles.noteInputText, { color: t.text }]}
                />
              </View>

              <View style={styles.charCountRow}>
                <Text
                  style={[
                    styles.charCountText,
                    {
                      color: isCharDanger
                        ? t.roseText
                        : isCharWarning
                          ? t.amberText
                          : t.textMuted,
                      fontWeight: isCharWarning || isCharDanger ? '700' : '600',
                    },
                  ]}
                >
                  {charCount} / 60
                </Text>
              </View>
            </View>

            {/* 6. Primary Save CTA (.btn-gold 135deg Metallic Gradient + Pure White Bold Text) */}
            <Pressable
              onPress={handleSave}
              disabled={submitState !== 'idle'}
              style={({ pressed }) => [
                styles.submitBtnWrapper,
                { transform: [{ scale: pressed && submitState === 'idle' ? 0.965 : 1 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save Payment"
            >
              <LinearGradient
                colors={
                  submitState === 'success'
                    ? ['#10B981', '#059669']
                    : isDark
                      ? colors.goldGradientDark
                      : colors.goldGradient
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtnGradient}
              >
                {submitState === 'recording' && (
                  <View style={styles.btnContentRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Recording...</Text>
                  </View>
                )}

                {submitState === 'success' && (
                  <View style={styles.btnContentRow}>
                    <Check size={17} color="#FFFFFF" strokeWidth={3} />
                    <Text style={styles.submitBtnText}>Payment Saved</Text>
                  </View>
                )}

                {submitState === 'idle' && (
                  <View style={styles.btnContentRow}>
                    <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.submitBtnText}>Save Payment</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceDateText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  balanceDueLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  balanceAmountText: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  accordionBody: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  billVal: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  floatingInputContainer: {
    marginBottom: 14,
  },
  inputWrapper: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    justifyContent: 'center',
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 6,
    zIndex: 2,
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingTop: 4,
  },
  amountInputText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  noteInputText: {
    fontSize: 13,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modeSection: {
    marginBottom: 16,
  },
  modeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  splitToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  splitToggleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtnWrap: {
    flex: 1,
    height: 44,
  },
  modeBtnActive: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.36,
    shadowRadius: 8,
    elevation: 4,
  },
  modeBtnInactive: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modeBtnTextInactive: {
    fontSize: 12,
    fontWeight: '600',
  },
  charCountRow: {
    alignItems: 'flex-end',
    marginTop: 4,
    paddingRight: 4,
  },
  charCountText: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  submitBtnWrapper: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
    elevation: 5,
  },
  submitBtnGradient: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
