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
} from 'react-native';
import { Lock, LogOut, Sparkles, Building2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import {
  PinDots,
  PinKeypad,
  RoleBadge,
  LogoutConfirmationModal,
  ExitAppModal,
} from '../../components';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import { backDispatcher } from '../../navigation/backDispatcher';

export const PinUnlockScreen: React.FC = () => {
  const { theme, user, hall, verifyPin, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Wire modals to Central BackDispatcher (Rule 1)
  useBackOverlay(showLogoutModal, () => setShowLogoutModal(false));
  useBackOverlay(showExitModal, () => setShowExitModal(false));

  // Lock screen back behavior: prompt ExitAppModal without directly using BackHandler
  useEffect(() => {
    return backDispatcher.registerOverlay({
      id: 'pin_unlock_screen_exit',
      close: () => {
        setShowExitModal(true);
        return true;
      },
    });
  }, []);

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

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 4) return;
    setHasError(false);
    setErrorMessage('');

    const updated = pin + digit;
    setPin(updated);

    if (updated.length === 4) {
      setTimeout(async () => {
        const success = await verifyPin(updated);
        if (!success) {
          setHasError(true);
          setErrorMessage('Incorrect PIN. Try again.');
          setTimeout(() => {
            setPin('');
          }, 350);
        }
      }, 150);
    }
  };

  const handleBackspace = () => {
    setHasError(false);
    setErrorMessage('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleQuickUnlock = () => {
    verifyPin('1234');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* User Card Header */}
        <View style={styles.header}>
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
            <Lock size={26} color={isDark ? colors.gold[400] : colors.gold[600]} />
          </View>

          <Text
            style={[
              styles.hallName,
              { color: isDark ? colors.gold[400] : colors.gold[600] },
            ]}
          >
            {hall?.name || user?.hallName || 'Royal Palace Conventions'}
          </Text>

          <View style={styles.userRow}>
            <Text style={[styles.userName, { color: t.text }]}>
              {user?.name || 'Authorized Member'}
            </Text>
            {user?.role && <RoleBadge role={user.role} />}
          </View>

          <Text style={[styles.instruction, { color: t.textMuted }]}>
            Enter 4-digit PIN for instant access
          </Text>
        </View>

        {/* Pin Dots */}
        <PinDots pinLength={pin.length} hasError={hasError} />

        {/* Message / Error */}
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
              Default PIN is{' '}
              <Text
                style={{
                  color: isDark ? colors.gold[400] : colors.gold[600],
                  fontWeight: '700',
                }}
              >
                1234
              </Text>
            </Text>
          )}
        </Animated.View>

        {/* Keypad */}
        <PinKeypad onDigitPress={handleDigitPress} onBackspace={handleBackspace} />

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Pressable
            onPress={handleQuickUnlock}
            style={({ pressed }) => [
              styles.quickUnlockPill,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Sparkles size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.quickUnlockText, { color: t.textMuted }]}>
              Quick Unlock:{' '}
              <Text
                style={[
                  styles.quickUnlockBold,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                1234
              </Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowLogoutModal(true)}
            style={({ pressed }) => [
              styles.switchAccountButton,
              { transform: [{ scale: pressed ? 0.96 : 1 }], opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <LogOut size={15} color={isDark ? '#A1A1AA' : '#78716C'} />
            <Text style={[styles.switchAccountText, { color: isDark ? '#A1A1AA' : '#78716C' }]}>
              Switch Account / Re-login
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* MODAL: LOGOUT CONFIRMATION */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        allowPinLock={false}
        isDark={isDark}
      />

      {/* MODAL: EXIT APPLICATION */}
      <ExitAppModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        isDark={isDark}
      />
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
    marginTop: 16,
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
    marginBottom: 14,
  },
  hallName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  instruction: {
    fontSize: 13,
    marginTop: 6,
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
  bottomActions: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  quickUnlockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickUnlockText: {
    color: '#D4D4D8',
    fontSize: 13,
  },
  quickUnlockBold: {
    color: colors.gold[400],
    fontWeight: '700',
  },
  switchAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  switchAccountText: {
    color: '#A1A1AA',
    fontSize: 13,
  },
});

