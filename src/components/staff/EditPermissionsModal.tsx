import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { X, AlertCircle, ShieldCheck, Check } from 'lucide-react-native';
import { DEFAULT_STAFF_SCREEN_ACCESS, ScreenAccessConfig, TeamMemberItem } from '../../types/staff';
import { updateStaffPermissions } from '../../services/staffService';
import { PermissionToggleGroup } from './PermissionToggleGroup';
import { colors } from '../../theme/colors';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface EditPermissionsModalProps {
  visible: boolean;
  member: TeamMemberItem | null;
  onClose: () => void;
  onSuccess: (updated: TeamMemberItem) => void;
  isDark?: boolean;
}

export const EditPermissionsModal: React.FC<EditPermissionsModalProps> = ({
  visible,
  member,
  onClose,
  onSuccess,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const [permissions, setPermissions] = useState<ScreenAccessConfig>(DEFAULT_STAFF_SCREEN_ACCESS);
  const [isLoading, setIsLoading] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Entrance & feedback physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && member) {
      setPermissions({
        ...DEFAULT_STAFF_SCREEN_ACCESS,
        ...(member.screen_access || {}),
      });
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
    }
  }, [visible, member, backdropAnim, sheetAnim]);

  if (!member) return null;

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
      setSubmitState('idle');
      onClose();
    });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setSubmitState('saving');
      setErrorMsg(null);
      const updated = await updateStaffPermissions(member.id, permissions);
      setSubmitState('saved');
      setTimeout(() => {
        onSuccess(updated);
        handleClose();
      }, 600);
    } catch (err: any) {
      setSubmitState('idle');
      setErrorMsg(err.message || 'Failed to update permissions');
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
                <ShieldCheck size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: t.text }]}>Edit Permissions</Text>
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

            <View style={styles.permissionsGroup}>
              <Text style={[styles.sectionHeading, { color: t.text }]}>
                Screen Access Controls
              </Text>
              <Text style={[styles.sectionSubheading, { color: t.textMuted }]}>
                Toggle screens accessible to @{member.username}
              </Text>

              <PermissionToggleGroup
                permissions={permissions}
                onChange={setPermissions}
                disabled={isLoading}
                isDark={isDark}
              />
            </View>

            <View style={styles.actionsWrap}>
              <Pressable
                onPress={handleSave}
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
                    <Text style={styles.ctaButtonText}>Updating Access...</Text>
                  </View>
                ) : submitState === 'saved' ? (
                  <View style={styles.ctaRow}>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.ctaButtonText}>Permissions Updated ✓</Text>
                  </View>
                ) : (
                  <Text style={styles.ctaButtonText}>Save Permissions</Text>
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
  permissionsGroup: {
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
});


