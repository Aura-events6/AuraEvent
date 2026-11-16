import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  BackHandler,
  Platform,
} from 'react-native';
import { Power, CheckCircle2, X, Building2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { motionTokens } from '../../theme/motion';
import { useAuth } from '../../context/AuthContext';
import { useBackOverlay } from '../../hooks/useBackOverlay';

export interface ExitAppModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmExit?: () => void;
  isDark?: boolean;
  hallName?: string;
}

export const ExitAppModal: React.FC<ExitAppModalProps> = ({
  visible,
  onClose,
  onConfirmExit,
  isDark: propIsDark,
  hallName: propHallName,
}) => {
  const { hall, user, theme } = useAuth();
  const isDark = propIsDark !== undefined ? propIsDark : theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const resolvedHallName =
    propHallName ||
    hall?.name ||
    (user && 'hallName' in user ? (user as any).hallName : undefined) ||
    'Aura Convention';

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  // Motion physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(backdropAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleConfirmExit = () => {
    if (onConfirmExit) {
      onConfirmExit();
      return;
    }

    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      // On iOS / Web, closing app programmatically is either not supported or requires dismiss
      handleDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Animated Dim Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(28, 25, 23, 0.65)',
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Modal Card Content */}
        <Animated.View
          style={[
            styles.sheetCard,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
              borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : '#ECE8E1',
              transform: [
                {
                  scale: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
                {
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Close button */}
          <Pressable
            onPress={handleDismiss}
            hitSlop={8}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6',
                transform: [{ scale: pressed ? 0.90 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={16} color={t.textMuted} />
          </Pressable>

          {/* Power / Exit Icon Box */}
          <View
            style={[
              styles.iconEmblemBox,
              {
                backgroundColor: isDark
                  ? 'rgba(214, 174, 107, 0.16)'
                  : '#FAF5EB',
                borderColor: isDark
                  ? 'rgba(214, 174, 107, 0.35)'
                  : 'rgba(198, 151, 73, 0.30)',
              },
            ]}
          >
            <Power
              size={26}
              color={isDark ? colors.gold[400] : colors.gold[600]}
              strokeWidth={2.4}
            />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleBlock}>
            <Text style={[styles.mainTitle, { color: t.text }]}>
              Exit Application?
            </Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              Are you sure you want to close Aura? Your active workspace and entries will be safely preserved.
            </Text>
          </View>

          {/* Hall & Preserved Status Badge */}
          <View
            style={[
              styles.hallStatusCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FBF9F5',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.18)' : '#F0EAE1',
              },
            ]}
          >
            <View style={styles.hallRow}>
              <Building2 size={16} color={colors.gold[500]} />
              <Text
                style={[styles.hallNameText, { color: t.text }]}
                numberOfLines={1}
              >
                {resolvedHallName}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <CheckCircle2 size={14} color="#059669" />
              <Text style={styles.statusText}>
                All changes saved • Ready to resume
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Primary Action: Exit App */}
            <Pressable
              onPress={handleConfirmExit}
              style={({ pressed }) => [
                styles.primaryExitBtn,
                {
                  backgroundColor: isDark ? colors.gold[500] : '#1C1917',
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm Exit Application"
            >
              <View style={styles.btnRow}>
                <Power
                  size={16}
                  color={isDark ? '#1C1917' : '#FFFFFF'}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.primaryExitBtnText,
                    { color: isDark ? '#1C1917' : '#FFFFFF' },
                  ]}
                >
                  Exit App
                </Text>
              </View>
            </Pressable>

            {/* Ghost Cancel: Stay in App */}
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel and keep using app"
            >
              <Text style={[styles.cancelBtnText, { color: t.textMuted }]}>
                Keep Using App
              </Text>
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
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 8,
    position: 'relative',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconEmblemBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.8,
  },
  hallStatusCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginBottom: 20,
  },
  hallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hallNameText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#059669',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  primaryExitBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryExitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

