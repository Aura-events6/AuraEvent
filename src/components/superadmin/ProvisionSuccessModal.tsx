import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Phone,
  User,
  KeyRound,
  X,
  Building,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { CreateHallResponse } from '../../types/superadmin';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface ProvisionSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  creationData: CreateHallResponse | null;
  rawPassword?: string;
  isDark?: boolean;
}

export const ProvisionSuccessModal: React.FC<ProvisionSuccessModalProps> = ({
  visible,
  onClose,
  creationData,
  rawPassword,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const [copied, setCopied] = useState(false);

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && creationData) {
      sheetAnim.setValue(0);
      checkAnim.setValue(0);
      Animated.parallel([
        Animated.spring(sheetAnim, {
          toValue: 1,
          tension: motionTokens.springSheet.tension,
          friction: motionTokens.springSheet.friction,
          useNativeDriver: true,
        }),
        Animated.spring(checkAnim, {
          toValue: 1,
          tension: 120,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, creationData]);

  if (!creationData) return null;

  const { hall, owner } = creationData;
  const displayPass = rawPassword || '••••••••';

  const credentialText = `🏛️ *Welcome to Aura — Function Hall Operating System*

Your function hall has been provisioned with *Lifetime Free Access (Bypass Mode)*:

📍 *Hall Name:* ${hall.name}
📞 *Registered Phone:* ${hall.phone}
👤 *Owner Username:* ${owner.username}
✉️ *Owner Email:* ${owner.email}
🔑 *Initial Password:* ${displayPass}

📲 *Login Instructions:*
1. Open the Aura Portal application.
2. Select "Owner / Admin" login.
3. Sign in using your email and password above.`;

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(credentialText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Notice', 'Unable to copy to clipboard.');
    }
  };

  const handleWhatsApp = async () => {
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(credentialText)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await handleCopy();
        Alert.alert(
          'WhatsApp Not Found',
          'Credentials copied to clipboard! You can paste them manually into any messaging app.'
        );
      }
    } catch {
      await handleCopy();
      Alert.alert(
        'Credentials Copied',
        'Login instructions copied to clipboard.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            glassStyles.getCardStyle(isDark),
            {
              transform: [
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
              opacity: sheetAnim,
            },
          ]}
        >
          {/* Header with Close */}
          <View style={styles.topRow}>
            <View style={styles.badgeRow}>
              <Animated.View
                style={[
                  styles.checkCircle,
                  {
                    transform: [
                      {
                        scale: checkAnim.interpolate({
                          inputRange: [0, 0.6, 1],
                          outputRange: [0.7, 1.15, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <CheckCircle2 size={20} color="#10B981" strokeWidth={2.5} />
              </Animated.View>
              <Text style={[styles.successTitle, { color: t.text }]}>
                Hall Successfully Provisioned!
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { transform: [{ scale: pressed ? 0.88 : 1 }] },
              ]}
              accessibilityLabel="Close dialog"
            >
              <X size={18} color={t.textMuted} />
            </Pressable>
          </View>

          {/* Subtitle & Bypass Tag */}
          <View style={styles.bypassTagRow}>
            <View style={styles.bypassTag}>
              <Sparkles size={11} color="#10B981" />
              <Text style={styles.bypassTagText}>LIFETIME ACCESS • BYPASS ACTIVE</Text>
            </View>
            <Text style={[styles.subtext, { color: t.textMuted }]}>
              The hall is live with zero paywall restrictions.
            </Text>
          </View>

          {/* Credential Box */}
          <View
            style={[
              styles.credentialsBox,
              {
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.3)',
              },
            ]}
          >
            {/* Hall Name */}
            <View style={styles.credentialRow}>
              <Building size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.fieldLabel, { color: t.textMuted }]}>Hall:</Text>
              <Text style={[styles.fieldValue, { color: t.text }]} numberOfLines={1}>
                {hall.name}
              </Text>
            </View>

            {/* Hall Phone */}
            <View style={styles.credentialRow}>
              <Phone size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.fieldLabel, { color: t.textMuted }]}>Phone:</Text>
              <Text style={[styles.fieldValue, { color: t.text }]}>
                {hall.phone}
              </Text>
            </View>

            {/* Owner Username */}
            <View style={styles.credentialRow}>
              <User size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.fieldLabel, { color: t.textMuted }]}>Username:</Text>
              <Text style={[styles.fieldValue, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                @{owner.username}
              </Text>
            </View>

            {/* Owner Email */}
            <View style={styles.credentialRow}>
              <User size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.fieldLabel, { color: t.textMuted }]}>Email:</Text>
              <Text style={[styles.fieldValue, { color: t.text }]} numberOfLines={1}>
                {owner.email}
              </Text>
            </View>

            {/* Initial Password */}
            <View style={styles.credentialRow}>
              <KeyRound size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.fieldLabel, { color: t.textMuted }]}>Password:</Text>
              <Text style={[styles.fieldValue, { color: t.text, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {displayPass}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            {/* 1-Tap Copy Button */}
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.copyButton,
                copied
                  ? styles.copyButtonActive
                  : {
                      backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg,
                      borderColor: isDark ? colors.gold[500] : colors.gold[600],
                    },
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              {copied ? (
                <>
                  <Check size={16} color="#10B981" />
                  <Text style={[styles.copyButtonText, { color: '#10B981' }]}>
                    Credentials Copied to Clipboard!
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
                  <Text
                    style={[
                      styles.copyButtonText,
                      { color: isDark ? colors.gold[400] : colors.gold[700] },
                    ]}
                  >
                    Copy Login Credentials
                  </Text>
                </>
              )}
            </Pressable>

            {/* WhatsApp Share Button */}
            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [
                styles.whatsAppButton,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Share2 size={16} color="#FFFFFF" />
              <Text style={styles.whatsAppButtonText}>
                Share with Owner via WhatsApp
              </Text>
            </Pressable>

            {/* Done Primary Button */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.donePressable,
                { transform: [{ scale: pressed ? 0.965 : 1 }] },
              ]}
            >
              <Text style={styles.donePressableText}>Return to Console</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: 24,
    borderRadius: 26,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    padding: 6,
  },
  bypassTagRow: {
    marginBottom: 16,
    marginTop: 4,
  },
  bypassTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  bypassTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  credentialsBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 18,
  },
  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 72,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  actionsColumn: {
    gap: 10,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: 46,
  },
  copyButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    minHeight: 46,
  },
  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  doneBtn: {
    marginTop: 4,
    minHeight: 46,
  },
  donePressable: {
    marginTop: 4,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.gold[500],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  donePressableText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
