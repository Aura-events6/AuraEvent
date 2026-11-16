import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Pressable,
} from 'react-native';
import { X, Eye, EyeOff, AlertCircle, ShieldPlus, Lightbulb, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_STAFF_SCREEN_ACCESS, ScreenAccessConfig } from '../../types/staff';
import { createStaffMember } from '../../services/staffService';
import { PermissionToggleGroup } from './PermissionToggleGroup';
import { colors } from '../../theme/colors';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface AddStaffModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (created?: { username: string; password?: string; staffName: string }) => void;
  canAddMore: boolean;
  existingUsernames?: string[];
  isDark?: boolean;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  visible,
  onClose,
  onSuccess,
  canAddMore,
  existingUsernames = [],
  isDark = true,
}) => {
  const { hall, user } = useAuth();
  const hallPhone = hall?.phone || user?.phone || '+91 98860 44521';
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<ScreenAccessConfig>(DEFAULT_STAFF_SCREEN_ACCESS);
  const [isLoading, setIsLoading] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Entrance & feedback physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSubmitState('idle');
      setErrorMsg(null);
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
  }, [visible, backdropAnim, sheetAnim, shakeAnim]);

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const cleanUsername = username.trim().toLowerCase();
  const isUsernameTaken = Boolean(
    cleanUsername && existingUsernames.map((u) => u.toLowerCase()).includes(cleanUsername)
  );

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setPermissions(DEFAULT_STAFF_SCREEN_ACCESS);
    setErrorMsg(null);
    setSubmitState('idle');
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
      resetForm();
      onClose();
    });
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    const targetUsername = username.trim().toLowerCase();
    if (!targetUsername) {
      setErrorMsg('Please enter a username for the staff member');
      triggerErrorShake();
      return;
    }
    if (targetUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters');
      triggerErrorShake();
      return;
    }
    if (isUsernameTaken) {
      setErrorMsg(`Staff username '${targetUsername}' already exists in your hall. Please choose another username.`);
      triggerErrorShake();
      return;
    }
    if (!/^[a-z0-9_]+$/.test(targetUsername)) {
      setErrorMsg('Username can only contain lowercase letters, numbers, and underscores');
      triggerErrorShake();
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      triggerErrorShake();
      return;
    }

    try {
      setIsLoading(true);
      setSubmitState('saving');
      await createStaffMember({
        username: targetUsername,
        password,
        screenAccess: permissions,
      });

      const staffInfo = {
        username: targetUsername,
        password,
        staffName: targetUsername,
      };

      setSubmitState('saved');
      setTimeout(() => {
        handleClose();
        onSuccess(staffInfo);
      }, 600);
    } catch (err: any) {
      setSubmitState('idle');
      setErrorMsg(err.message || 'Failed to create staff member');
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
                <ShieldPlus size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: t.text }]}>Add Team Member</Text>
                <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                  Provision credentials & screen access
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

            {!canAddMore && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark
                      ? colors.status.warning.bgDark
                      : colors.status.warning.bgLight,
                  },
                ]}
              >
                <AlertCircle
                  size={16}
                  color={isDark ? colors.status.warning.dark : colors.status.warning.light}
                />
                <Text
                  style={[
                    styles.errorText,
                    {
                      color: isDark
                        ? colors.status.warning.dark
                        : colors.status.warning.light,
                    },
                  ]}
                >
                  Hall has reached the maximum 5 active team members.
                </Text>
              </View>
            )}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: t.text }]}>
                Username <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.dark.input : colors.light.input,
                    borderColor: isUsernameTaken
                      ? isDark
                        ? colors.status.warning.dark
                        : colors.status.warning.light
                      : isDark
                      ? colors.dark.inputBorder
                      : colors.light.inputBorder,
                    color: t.text,
                  },
                ]}
                placeholder="e.g. suresh_reception"
                placeholderTextColor={t.textSubtle}
                value={username}
                onChangeText={(val) => setUsername(val.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading && canAddMore}
              />
              {isUsernameTaken ? (
                <View style={styles.inlineWarningRow}>
                  <AlertCircle
                    size={13}
                    color={isDark ? colors.status.warning.dark : colors.status.warning.light}
                  />
                  <Text
                    style={[
                      styles.inlineWarningText,
                      {
                        color: isDark
                          ? colors.status.warning.dark
                          : colors.status.warning.light,
                      },
                    ]}
                  >
                    Username "@{cleanUsername}" is already registered in your hall.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.helperText, { color: t.textSubtle }]}>
                  Used by staff to sign in on their mobile device
                </Text>
              )}
            </View>

            {/* Temporary Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: t.text }]}>
                Temporary Password <Text style={styles.requiredStar}>*</Text>
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
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && canAddMore}
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
            </View>

            {/* Helpful Tip Banner */}
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: isDark
                    ? colors.dark.accentBg
                    : colors.light.accentBg,
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.28)'
                    : 'rgba(198, 151, 73, 0.35)',
                },
              ]}
            >
              <Lightbulb
                size={18}
                color={isDark ? colors.gold[400] : colors.gold[600]}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.infoBannerTitle,
                    { color: isDark ? colors.gold[400] : colors.gold[600] },
                  ]}
                >
                  💡 How your staff will log in:
                </Text>
                <Text style={[styles.infoBannerText, { color: t.text }]}>
                  Staff members will log in using your hall's phone number (
                  <Text style={styles.infoBannerBold}>{hallPhone}</Text>) and the
                  username created here.
                </Text>
              </View>
            </View>

            {/* Granular Screen Permissions */}
            <View style={styles.permissionsGroup}>
              <Text style={[styles.sectionHeading, { color: t.text }]}>
                Screen Permissions
              </Text>
              <Text style={[styles.sectionSubheading, { color: t.textMuted }]}>
                Select which app screens this team member can access
              </Text>

              <PermissionToggleGroup
                permissions={permissions}
                onChange={setPermissions}
                disabled={isLoading || !canAddMore}
                isDark={isDark}
              />
            </View>

            {/* Multi-state Morph CTA Button */}
            <View style={styles.actionsWrap}>
              <Pressable
                onPress={handleSubmit}
                disabled={isLoading || !canAddMore || isUsernameTaken}
                style={({ pressed }) => [
                  styles.ctaButton,
                  submitState === 'saved'
                    ? { backgroundColor: '#059669', borderColor: '#10B981' }
                    : isUsernameTaken || !canAddMore
                    ? {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderColor: 'transparent',
                        opacity: 0.6,
                      }
                    : {
                        backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                        borderColor: isDark ? colors.gold[400] : colors.gold[700],
                      },
                  { transform: [{ scale: pressed && !isLoading && canAddMore && !isUsernameTaken ? 0.965 : 1 }] },
                ]}
              >
                {submitState === 'saving' ? (
                  <View style={styles.ctaRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.ctaButtonText}>Provisioning Credentials...</Text>
                  </View>
                ) : submitState === 'saved' ? (
                  <View style={styles.ctaRow}>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.ctaButtonText}>Staff Account Created ✓</Text>
                  </View>
                ) : (
                  <Text style={styles.ctaButtonText}>
                    {isUsernameTaken
                      ? 'Username Already Taken'
                      : !canAddMore
                      ? 'Team Limit Reached (5/5)'
                      : 'Create Staff Account'}
                  </Text>
                )}
              </Pressable>
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
    maxWidth: 520,
    maxHeight: '90%',
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
    marginBottom: 16,
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
  helperText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  infoBannerText: {
    fontSize: 11,
    lineHeight: 16,
  },
  infoBannerBold: {
    fontWeight: '800',
  },
  permissionsGroup: {
    marginTop: 8,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubheading: {
    fontSize: 11,
    marginBottom: 12,
  },
  actionsWrap: {
    marginTop: 8,
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
  inlineWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 2,
  },
  inlineWarningText: {
    fontSize: 12,
    fontWeight: '600',
  },
});


