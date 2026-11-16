import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  CheckCircle2,
  Copy,
  Check,
  Share2,
  User,
  KeyRound,
  X,
  Smartphone,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface StaffCredentialsSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  staffName: string;
  username: string;
  password?: string;
  hallPhone: string;
  isDark?: boolean;
}

export const StaffCredentialsSuccessModal: React.FC<
  StaffCredentialsSuccessModalProps
> = ({
  visible,
  onClose,
  staffName,
  username,
  password,
  hallPhone,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const [copied, setCopied] = useState(false);

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  // Entrance & feedback physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (visible) {
      setCopied(false);
      checkScaleAnim.setValue(0.7);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: motionTokens.durHover,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
        Animated.spring(checkScaleAnim, {
          toValue: 1,
          ...motionTokens.springOvershoot,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
      checkScaleAnim.setValue(0.7);
    }
  }, [visible, backdropAnim, sheetAnim, checkScaleAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const formatCredentialsText = () => {
    return (
      `*Aura Staff Access Credentials*\n\n` +
      `Staff Member: ${staffName}\n` +
      `---------------------------\n` +
      `📱 Hall Phone: ${hallPhone}\n` +
      `👤 Username: ${username}\n` +
      (password ? `🔑 Password: ${password}\n` : '') +
      `---------------------------\n` +
      `*How to Login:*\n` +
      `1. Open Aura app on your phone.\n` +
      `2. Switch to the *Staff Login* tab.\n` +
      `3. Enter the Hall Phone, your Username, and Password.`
    );
  };

  const handleCopy = async () => {
    const textToCopy = formatCredentialsText();
    try {
      if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
        await Clipboard.setStringAsync(textToCopy);
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const nav = navigator as any;
        if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
          await nav.clipboard.writeText(textToCopy);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
      Alert.alert('Copy failed', 'Please select and copy manually.');
    }
  };

  const handleShareWhatsApp = async () => {
    const text = formatCredentialsText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported || Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Unavailable', 'Unable to open WhatsApp on this device.');
      }
    } catch (e) {
      console.warn('Failed to open WhatsApp', e);
    }
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const sheetScale = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropAnim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContent,
            glassStyles.getCardStyle(isDark),
            {
              backgroundColor: isDark ? '#141414' : '#FFFFFF',
              borderColor: isDark ? colors.gold[500] : colors.gold[600],
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Animated.View
              style={[
                styles.successIconWrapper,
                { transform: [{ scale: checkScaleAnim }] },
              ]}
            >
              <CheckCircle2
                size={32}
                color={isDark ? colors.status.success.dark : colors.status.success.light}
              />
            </Animated.View>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              accessibilityLabel="Close dialog"
            >
              <X size={18} color={t.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: t.text }]}>
            Staff Account Created!
          </Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            Share these login credentials with <Text style={{ fontWeight: '700', color: t.text }}>{staffName}</Text>.
          </Text>

          {/* Credentials Card */}
          <View
            style={[
              styles.credentialsCard,
              {
                backgroundColor: isDark ? '#0A0A0A' : '#F8F9FA',
                borderColor: t.cardBorder,
              },
            ]}
          >
            {/* Hall Phone */}
            <View style={styles.credentialRow}>
              <View style={styles.credLabelGroup}>
                <Smartphone size={16} color={colors.gold[500]} />
                <Text style={[styles.credLabel, { color: t.textMuted }]}>
                  Hall Phone (ID)
                </Text>
              </View>
              <Text style={[styles.credValue, { color: t.text }]} selectable>
                {hallPhone || 'Not set in profile'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: t.cardBorder }]} />

            {/* Username */}
            <View style={styles.credentialRow}>
              <View style={styles.credLabelGroup}>
                <User size={16} color={colors.gold[500]} />
                <Text style={[styles.credLabel, { color: t.textMuted }]}>
                  Username
                </Text>
              </View>
              <Text
                style={[
                  styles.credValue,
                  { color: isDark ? colors.gold[300] : colors.gold[700], fontWeight: '700' },
                ]}
                selectable
              >
                {username}
              </Text>
            </View>

            {password ? (
              <>
                <View style={[styles.divider, { backgroundColor: t.cardBorder }]} />
                {/* Password */}
                <View style={styles.credentialRow}>
                  <View style={styles.credLabelGroup}>
                    <KeyRound size={16} color={colors.gold[500]} />
                    <Text style={[styles.credLabel, { color: t.textMuted }]}>
                      Password
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.credValue,
                      { color: isDark ? colors.gold[300] : colors.gold[700], fontWeight: '700' },
                    ]}
                    selectable
                  >
                    {password}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Step Guide Banner */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark
                  ? 'rgba(214, 174, 107, 0.12)'
                  : 'rgba(198, 151, 73, 0.1)',
                borderColor: isDark
                  ? 'rgba(214, 174, 107, 0.3)'
                  : 'rgba(198, 151, 73, 0.25)',
              },
            ]}
          >
            <Text style={[styles.infoBannerText, { color: isDark ? colors.gold[300] : colors.gold[800] }]}>
              💡 Staff must choose the <Text style={{ fontWeight: '700' }}>Staff Login</Text> tab on the login screen and enter the Hall Phone, Username & Password above.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.copyBtn,
                {
                  backgroundColor: copied
                    ? isDark
                      ? colors.status.success.bgDark
                      : colors.status.success.bgLight
                    : isDark
                    ? colors.dark.card
                    : colors.light.card,
                  borderColor: copied
                    ? colors.status.success.dark
                    : t.cardBorder,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel="Copy credentials to clipboard"
            >
              {copied ? (
                <>
                  <Check size={18} color={isDark ? colors.status.success.dark : colors.status.success.light} />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: isDark ? colors.status.success.dark : colors.status.success.light, fontWeight: '700' },
                    ]}
                  >
                    Copied!
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={18} color={t.text} />
                  <Text style={[styles.actionBtnText, { color: t.text }]}>
                    Copy Info
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.shareBtn,
                {
                  backgroundColor: isDark ? 'rgba(37, 211, 102, 0.15)' : 'rgba(37, 211, 102, 0.1)',
                  borderColor: 'rgba(37, 211, 102, 0.35)',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={handleShareWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="Share credentials via WhatsApp"
            >
              <Share2 size={18} color="#25D366" />
              <Text style={[styles.actionBtnText, { color: '#25D366', fontWeight: '700' }]}>
                WhatsApp
              </Text>
            </Pressable>
          </View>

          <View style={styles.doneBtnContainer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.doneBtn,
                {
                  backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                  borderColor: isDark ? colors.gold[400] : colors.gold[700],
                  transform: [{ scale: pressed ? 0.965 : 1 }],
                },
              ]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  successIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  credentialsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  credLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  credLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  credValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoBannerText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  copyBtn: {},
  shareBtn: {},
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  doneBtnContainer: {
    marginTop: 4,
  },
  doneBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

