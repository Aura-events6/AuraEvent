import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { KeyRound, Check, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { PinDots, PinKeypad } from '../../components';

export const PinSetupScreen: React.FC = () => {
  const { theme, setupPin, user } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [createdPin, setCreatedPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Micro-interaction: Animated step transition slide & fade
  const stepAnim = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef<'create' | 'confirm'>(step);

  useEffect(() => {
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      stepAnim.setValue(0);
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [step, stepAnim]);

  // Micro-interaction: Animated shake & fade on error message
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const errorFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasError && errorMessage) {
      errorFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(errorFadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(errorShakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [hasError, errorMessage]);

  const currentPin = step === 'create' ? createdPin : confirmPin;

  const handleDigitPress = (digit: string) => {
    if (currentPin.length >= 4) return;
    setHasError(false);
    setErrorMessage('');

    const updated = currentPin + digit;

    if (step === 'create') {
      setCreatedPin(updated);
      if (updated.length === 4) {
        // Move to confirm step automatically after a brief visual cue
        setTimeout(() => {
          setStep('confirm');
        }, 200);
      }
    } else {
      setConfirmPin(updated);
      if (updated.length === 4) {
        // Validate match
        if (updated === createdPin) {
          // Success! Setup pin in context via live Bcrypt RPC
          setTimeout(async () => {
            const res = await setupPin(updated);
            if (!res.success) {
              setHasError(true);
              const friendlyMessage =
                res.error?.includes('gen_salt') || res.error?.includes('42883')
                  ? 'Server database setup required: Run SQL migration for pgcrypto.'
                  : (res.error || 'Failed to save PIN.');
              setErrorMessage(friendlyMessage);
              setTimeout(() => {
                setConfirmPin('');
              }, 400);
            }
          }, 250);
        } else {
          // Mismatch error
          setHasError(true);
          setErrorMessage('PINs do not match. Please try again.');
          setTimeout(() => {
            setConfirmPin('');
          }, 400);
        }
      }
    }
  };

  const handleBackspace = () => {
    setHasError(false);
    setErrorMessage('');
    if (step === 'create') {
      setCreatedPin(prev => prev.slice(0, -1));
    } else {
      if (confirmPin.length === 0) {
        // Back to create step if empty
        setStep('create');
        setCreatedPin('');
      } else {
        setConfirmPin(prev => prev.slice(0, -1));
      }
    }
  };

  const handleQuickSetup = () => {
    setupPin('1234');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Step Indicator Header with animated transition */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: stepAnim,
              transform: [
                {
                  translateY: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDark
                  ? 'rgba(229, 184, 66, 0.15)'
                  : 'rgba(198, 151, 73, 0.18)',
                borderColor: isDark
                  ? 'rgba(229, 184, 66, 0.3)'
                  : 'rgba(198, 151, 73, 0.35)',
              },
            ]}
          >
            <KeyRound size={26} color={isDark ? colors.gold[400] : colors.gold[600]} />
          </View>

          <Text style={[styles.title, { color: t.text }]}>
            {step === 'create' ? 'Set Your 4-Digit PIN' : 'Confirm Your PIN'}
          </Text>

          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {step === 'create'
              ? `Fast, secure daily unlock for ${user?.name || 'Owner'}. No OTP needed.`
              : 'Re-enter the same 4-digit PIN to confirm'}
          </Text>

          {/* Step Pill */}
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(198, 151, 73, 0.12)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(198, 151, 73, 0.25)',
              },
            ]}
          >
            <Text
              style={[
                styles.stepBadgeText,
                { color: isDark ? colors.gold[400] : colors.gold[600] },
              ]}
            >
              Step {step === 'create' ? '1' : '2'} of 2: {step === 'create' ? 'Enter PIN' : 'Verify PIN'}
            </Text>
          </View>
        </Animated.View>

        {/* 4 Dots Visual Indicator */}
        <PinDots pinLength={currentPin.length} hasError={hasError} />

        {/* Error / Instruction message */}
        <Animated.View
          style={[
            styles.messageBox,
            Boolean(hasError) && {
              opacity: errorFadeAnim,
              transform: [{ translateX: errorShakeAnim }],
            },
          ]}
        >
          {Boolean(errorMessage) ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : (
            <Text style={[styles.helperText, { color: t.textMuted }]}>
              {step === 'create'
                ? 'Choose 4 digits you will remember easily'
                : 'Both PINs must match to secure your device'}
            </Text>
          )}
        </Animated.View>

        {/* Numeric Keypad */}
        <PinKeypad onDigitPress={handleDigitPress} onBackspace={handleBackspace} />

        {/* Quick Demo Fill Helper */}
        <Pressable
          onPress={handleQuickSetup}
          style={({ pressed }) => [
            styles.quickDemoPill,
            glassStyles.getCardStyle(isDark),
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Sparkles size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
          <Text style={[styles.quickDemoText, { color: t.textMuted }]}>
            Quick Set Demo PIN:{' '}
            <Text
              style={[
                styles.quickDemoBold,
                { color: isDark ? colors.gold[400] : colors.gold[600] },
              ]}
            >
              1234
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingVertical: 24,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(229, 184, 66, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 184, 66, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 18,
  },
  stepBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageBox: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  quickDemoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  quickDemoText: {
    color: '#D4D4D8',
    fontSize: 13,
  },
  quickDemoBold: {
    color: colors.gold[400],
    fontWeight: '700',
  },
});

