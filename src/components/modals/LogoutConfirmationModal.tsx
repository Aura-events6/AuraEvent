import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LogOut, Lock, ShieldCheck, X, Building2, User } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { motionTokens } from '../../theme/motion';
import { useAuth } from '../../context/AuthContext';
import { useBackOverlay } from '../../hooks/useBackOverlay';

export interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmLogout?: () => Promise<void> | void;
  onLockApp?: () => void;
  allowPinLock?: boolean;
  isDark?: boolean;
  userName?: string;
  userRole?: string;
  hallName?: string;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirmLogout,
  onLockApp,
  allowPinLock = true,
  isDark: propIsDark,
  userName: propUserName,
  userRole: propUserRole,
  hallName: propHallName,
}) => {
  const { user, hall, theme, logout, lockApp, isPinSet } = useAuth();
  const isDark = propIsDark !== undefined ? propIsDark : theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const resolvedUserName =
    propUserName ||
    (user && ('name' in user ? user.name : (user as any).fullName)) ||
    'Active User';
  const resolvedRole = propUserRole || user?.role || 'Staff';
  const resolvedHallName =
    propHallName ||
    hall?.name ||
    (user && 'hallName' in user ? (user as any).hallName : undefined) ||
    'Aura Convention';
  const canLockWithPin = allowPinLock && isPinSet;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Motion physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsLoggingOut(false);
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
    if (isLoggingOut) return;
    Animated.timing(backdropAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (onConfirmLogout) {
        await onConfirmLogout();
      } else {
        await logout();
      }
    } catch (err) {
      console.warn('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  const handleLockInstead = () => {
    handleDismiss();
    setTimeout(() => {
      if (onLockApp) {
        onLockApp();
      } else {
        lockApp();
      }
    }, 180);
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
            disabled={isLoggingOut}
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

          {/* Emblem Icon Box */}
          <View
            style={[
              styles.iconEmblemBox,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.16)'
                  : '#FEE2E2',
                borderColor: isDark
                  ? 'rgba(239, 68, 68, 0.35)'
                  : '#FECACA',
              },
            ]}
          >
            <LogOut
              size={26}
              color={isDark ? '#F87171' : '#DC2626'}
              strokeWidth={2.2}
            />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleBlock}>
            <Text style={[styles.mainTitle, { color: t.text }]}>
              Log Out of Account?
            </Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              Are you sure you want to log out? You will need your credentials or PIN to access this hall again.
            </Text>
          </View>

          {/* User & Hall Context Card */}
          <View
            style={[
              styles.userContextCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FBF9F5',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.18)' : '#F0EAE1',
              },
            ]}
          >
            <View style={styles.userAvatarCircle}>
              <User size={16} color={colors.gold[500]} />
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.userNameRow}>
                <Text
                  style={[styles.userNameText, { color: t.text }]}
                  numberOfLines={1}
                >
                  {resolvedUserName}
                </Text>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(214, 174, 107, 0.15)'
                        : '#F5EFEB',
                    },
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {resolvedRole.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.hallRow}>
                <Building2 size={12} color={t.textMuted} />
                <Text
                  style={[styles.hallNameText, { color: t.textMuted }]}
                  numberOfLines={1}
                >
                  {resolvedHallName}
                </Text>
              </View>
            </View>
          </View>

          {/* Cloud Sync Reassurance Note */}
          <View style={styles.syncNoticeRow}>
            <ShieldCheck size={14} color="#059669" />
            <Text style={styles.syncNoticeText}>
              All offline bookings and ledger entries are synchronized.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Primary Danger: Log Out */}
            <Pressable
              onPress={handleConfirmLogout}
              disabled={isLoggingOut}
              style={({ pressed }) => [
                styles.primaryLogoutBtn,
                {
                  transform: [{ scale: pressed && !isLoggingOut ? 0.97 : 1 }],
                  opacity: isLoggingOut ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Confirm Log Out"
            >
              {isLoggingOut ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryLogoutBtnText}>Signing out...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <LogOut size={16} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.primaryLogoutBtnText}>Log Out</Text>
                </View>
              )}
            </Pressable>

            {/* Quick Option: Lock with PIN instead */}
            {canLockWithPin && (
              <Pressable
                onPress={handleLockInstead}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.lockInsteadBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F5F2ED',
                    borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.30)',
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Lock App with PIN Instead"
              >
                <Lock size={15} color={isDark ? colors.gold[400] : colors.gold[600]} />
                <Text
                  style={[
                    styles.lockInsteadBtnText,
                    { color: isDark ? colors.gold[400] : '#8E6227' },
                  ]}
                >
                  Lock App with PIN Instead
                </Text>
              </Pressable>
            )}

            {/* Ghost Cancel Button */}
            <Pressable
              onPress={handleDismiss}
              disabled={isLoggingOut}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel and stay logged in"
            >
              <Text style={[styles.cancelBtnText, { color: t.textMuted }]}>
                Stay Logged In
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
  userContextCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(214, 174, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoCol: {
    flex: 1,
    gap: 3,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E6227',
  },
  hallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hallNameText: {
    fontSize: 12,
    fontWeight: '500',
  },
  syncNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  syncNoticeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#059669',
    flex: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  primaryLogoutBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  lockInsteadBtn: {
    width: '100%',
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockInsteadBtnText: {
    fontSize: 13,
    fontWeight: '700',
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

