import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { X, KeyRound, Eye, EyeOff, AlertCircle, Check } from 'lucide-react-native';
import { TeamMemberItem } from '../../types/staff';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface ResetPasswordModalProps {
  visible: boolean;
  member: TeamMemberItem | null;
  onClose: () => void;
  onSuccess: () => void;
  isDark?: boolean;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  member,
  onClose,
  onSuccess,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Entrance & feedback physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && member) {
      setNewPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      setSubmitState('idle');

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
      ]).start();
    } else {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
      shakeAnim.setValue(0);
    }
  }, [visible, member, backdropAnim, sheetAnim, shakeAnim]);

  if (!member) return null;

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

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
      setNewPassword('');
      setShowPassword(false);
      setErrorMsg(null);
      setSubmitState('idle');
      onClose();
    });
  };

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters');
      triggerErrorShake();
      return;
    }

    try {
      setIsLoading(true);
      setSubmitState('saving');
      setErrorMsg(null);

      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          action: 'reset_password',
          member_id: member.id,
          new_password: newPassword,
        },
      });

      if (error || data?.error) {
        const errorText = error?.message || data?.error || 'Failed to reset password';
        setErrorMsg(errorText);
        setSubmitState('idle');
        triggerErrorShake();
      } else {
        setSubmitState('saved');
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 600);
      }
    } catch (err: any) {
      const errorText = err.message || 'Failed to reset password';
      setErrorMsg(errorText);
      setSubmitState('idle');
      triggerErrorShake();
    } finally {
      setIsLoading(false);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
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
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#18171B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.25)',
              transform: [
                { translateY: sheetTranslateY },
                { scale: sheetScale },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(198, 151, 73, 0.15)',
              },
            ]}
          >
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                ]}
              >
                <KeyRound size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: t.text }]}>Reset Password</Text>
                <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                  @{member.username}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
              accessibilityLabel="Close dialog"
            >
              <X size={20} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {errorMsg && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark
                      ? colors.status.danger.bgDark
                      : colors.status.danger.bgLight,
                  },
                ]}
              >
                <AlertCircle
                  size={16}
                  color={isDark ? colors.status.danger.dark : colors.status.danger.light}
                />
                <Text
                  style={[
                    styles.errorText,
                    {
                      color: isDark
                        ? colors.status.danger.dark
                        : colors.status.danger.light,
                    },
                  ]}
                >
                  {errorMsg}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: t.text }]}>
                New Password <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.passwordInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={t.textSubtle}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.eyeBtn,
                    { transform: [{ scale: pressed ? 0.90 : 1 }] },
                  ]}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={18} color={t.textMuted} />
                  ) : (
                    <Eye size={18} color={t.textMuted} />
                  )}
                </Pressable>
              </View>
              <Text style={[styles.helperText, { color: t.textSubtle }]}>
                Changes take effect immediately. No email verification required.
              </Text>
            </View>

            <View style={styles.actionsWrap}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(28, 25, 23, 0.08)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(28, 25, 23, 0.12)',
                    transform: [{ scale: pressed && !isLoading ? 0.95 : 1 }],
                  },
                ]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={[styles.cancelBtnText, { color: t.text }]}>Cancel</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={handleReset}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    submitState === 'saved'
                      ? { backgroundColor: '#059669', borderColor: '#10B981' }
                      : {
                          backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                          borderColor: isDark ? colors.gold[400] : colors.gold[700],
                        },
                    { transform: [{ scale: pressed && !isLoading ? 0.965 : 1 }] },
                  ]}
                >
                  {submitState === 'saving' ? (
                    <View style={styles.ctaRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.ctaButtonText}>Resetting Security PIN...</Text>
                    </View>
                  ) : submitState === 'saved' ? (
                    <View style={styles.ctaRow}>
                      <Check size={18} color="#FFFFFF" />
                      <Text style={styles.ctaButtonText}>Password Updated ✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.ctaButtonText}>Save New Password</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 2,
  },
  actionsWrap: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ctaButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});


