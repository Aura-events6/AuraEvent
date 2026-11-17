import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  Crown,
  ChevronRight,
  Shield,
  ShieldCheck,
  LogOut,
  Moon,
  Sun,
  Edit3,
  Users,
  Building2,
  Clock,
  Bell,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Receipt,
  Power,
  Plus,
  RotateCcw,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { glassStyles } from '../theme/glass';
import { useBackOverlay } from '../hooks/useBackOverlay';
import {
  GoldSwitch,
  PrimaryButton,
  RoleBadge,
  LogoutConfirmationModal,
  ExitAppModal,
} from '../components';
import { motionTokens } from '../theme/motion';
import { ScreenBackground } from '../components/common';
import {
  fetchHallSettings,
  updateHallSettings,
  updateHallEventTypes,
} from '../services/hallSettingsService';
import { HallSettingsPayload } from '../types/settings';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, hall, theme, toggleTheme, lockApp, logout, refreshContext, updateHallState } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const hasAnalyticsAccess = isOwner || Boolean((user as any)?.screenAccess?.analytics);
  const hallId = hall?.id || (user && 'hallId' in user ? user.hallId : undefined);

  // Settings State
  const [settings, setSettings] = useState<HallSettingsPayload>({
    name: hall?.name || user?.hallName || 'Royal Palace Conventions',
    phone: hall?.phone || user?.phone || '+91 98860 44521',
    address: hall?.address || 'Plot 42, Outer Ring Road, Mahadevapura, Bengaluru',
    gstNumber: hall?.gstNumber || '29ABCDE1234F1Z5',
    billPrefix: hall?.billPrefix || 'RPC-',
    slotMode: 'two_slots',
    multiDayEnabled: true,
    morningStart: '06:00:00',
    morningEnd: '15:00:00',
    eveningStart: '16:00:00',
    eveningEnd: '23:59:59',
    notificationSettings: {
      notify_owner_on_price_edit: true,
      notify_owner_on_cancel: true,
      notify_owner_on_reversal: true,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTimingsModalOpen, setIsTimingsModalOpen] = useState(false);
  const [isEventTypesModalOpen, setIsEventTypesModalOpen] = useState(false);

  // Slot Mode Warning Modal State
  const [isSlotWarningModalOpen, setIsSlotWarningModalOpen] = useState(false);
  const [pendingSlotMode, setPendingSlotMode] = useState<'two_slots' | 'full_day' | null>(null);

  // Logout & Exit Confirmation Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Wire all Settings modals to Central BackDispatcher (Rule 1)
  useBackOverlay(isProfileModalOpen, () => setIsProfileModalOpen(false));
  useBackOverlay(isTimingsModalOpen, () => setIsTimingsModalOpen(false));
  useBackOverlay(isEventTypesModalOpen, () => setIsEventTypesModalOpen(false));
  useBackOverlay(isSlotWarningModalOpen, () => {
    setIsSlotWarningModalOpen(false);
    setPendingSlotMode(null);
  });
  useBackOverlay(showLogoutModal, () => setShowLogoutModal(false));
  useBackOverlay(showExitModal, () => setShowExitModal(false));

  // Modal Animation & Interaction Refs
  const profileAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [profileSaveState, setProfileSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const timingsAnim = useRef(new Animated.Value(0)).current;
  const [timingsSaveState, setTimingsSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const eventTypesAnim = useRef(new Animated.Value(0)).current;

  const warningAnim = useRef(new Animated.Value(0)).current;
  const warningBadgeAnim = useRef(new Animated.Value(0)).current;
  const [warningConfirmState, setWarningConfirmState] = useState<'idle' | 'confirming' | 'confirmed'>('idle');

  // Trigger Sheet Springs on Modal Open
  useEffect(() => {
    if (isProfileModalOpen) {
      profileAnim.setValue(0);
      setProfileSaveState('idle');
      Animated.spring(profileAnim, {
        toValue: 1,
        tension: motionTokens.springSheet.tension,
        friction: motionTokens.springSheet.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [isProfileModalOpen]);

  useEffect(() => {
    if (isTimingsModalOpen) {
      timingsAnim.setValue(0);
      setTimingsSaveState('idle');
      Animated.spring(timingsAnim, {
        toValue: 1,
        tension: motionTokens.springSheet.tension,
        friction: motionTokens.springSheet.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [isTimingsModalOpen]);

  useEffect(() => {
    if (isEventTypesModalOpen) {
      eventTypesAnim.setValue(0);
      Animated.spring(eventTypesAnim, {
        toValue: 1,
        tension: motionTokens.springSheet.tension,
        friction: motionTokens.springSheet.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [isEventTypesModalOpen]);

  useEffect(() => {
    if (isSlotWarningModalOpen) {
      warningAnim.setValue(0);
      warningBadgeAnim.setValue(0);
      setWarningConfirmState('idle');
      Animated.parallel([
        Animated.spring(warningAnim, {
          toValue: 1,
          tension: motionTokens.springSheet.tension,
          friction: motionTokens.springSheet.friction,
          useNativeDriver: true,
        }),
        Animated.spring(warningBadgeAnim, {
          toValue: 1,
          tension: 120,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSlotWarningModalOpen]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  // Temporary edit states
  const [tempProfile, setTempProfile] = useState({
    name: '',
    phone: '',
    address: '',
    gstNumber: '',
    billPrefix: '',
  });

  const [tempTimings, setTempTimings] = useState({
    morningStart: '',
    morningEnd: '',
    eveningStart: '',
    eveningEnd: '',
  });

  const DEFAULT_EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Birthday Party', 'Corporate Event'];
  const [eventTypes, setEventTypes] = useState<string[]>(
    hall?.event_types && hall.event_types.length > 0
      ? hall.event_types
      : DEFAULT_EVENT_TYPES
  );
  const [newEventTypeInput, setNewEventTypeInput] = useState('');
  const [savingEventTypes, setSavingEventTypes] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!hallId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchHallSettings(hallId);
      setSettings(data);
      if (data.eventTypes && data.eventTypes.length > 0) {
        setEventTypes(data.eventTypes);
      }
    } catch (err: any) {
      console.warn('Could not load live settings, using fallback context:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hallId]);

  const handleAddEventType = async () => {
    const trimmed = newEventTypeInput.trim();
    if (!trimmed) return;
    if (eventTypes.length >= 7) {
      Alert.alert('Limit Reached', 'Maximum 7 event types allowed per hall.');
      return;
    }
    if (eventTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate Event Type', `"${trimmed}" already exists.`);
      return;
    }

    const updated = [...eventTypes, trimmed];
    setSavingEventTypes(true);
    try {
      if (hallId) {
        await updateHallEventTypes(hallId, updated);
      }
      setEventTypes(updated);
      updateHallState({ event_types: updated });
      setNewEventTypeInput('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update event types.');
    } finally {
      setSavingEventTypes(false);
    }
  };

  const handleRemoveEventType = async (typeToRemove: string) => {
    if (eventTypes.length <= 1) {
      Alert.alert('Cannot Remove', 'You must have at least one event type configured.');
      return;
    }
    const updated = eventTypes.filter(t => t !== typeToRemove);
    setSavingEventTypes(true);
    try {
      if (hallId) {
        await updateHallEventTypes(hallId, updated);
      }
      setEventTypes(updated);
      updateHallState({ event_types: updated });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update event types.');
    } finally {
      setSavingEventTypes(false);
    }
  };

  const handleResetEventTypes = () => {
    Alert.alert(
      'Reset Event Types',
      'Reset to standard 5 default event types (Wedding, Reception, Engagement, Birthday Party, Corporate Event)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            setSavingEventTypes(true);
            try {
              if (hallId) {
                await updateHallEventTypes(hallId, DEFAULT_EVENT_TYPES);
              }
              setEventTypes(DEFAULT_EVENT_TYPES);
              updateHallState({ event_types: DEFAULT_EVENT_TYPES });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reset event types.');
            } finally {
              setSavingEventTypes(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSettings();
  };

  const persistSettings = async (updated: HallSettingsPayload) => {
    if (!hallId) return;

    // 1. Optimistic Local React Context Update (Pattern 1: 0ms latency across all mounted screens)
    const prevHallSnapshot = hall;
    updateHallState({
      name: updated.name,
      phone: updated.phone,
      address: updated.address || '',
      slotMode: updated.slotMode,
      billPrefix: updated.billPrefix,
      multiDayEnabled: updated.multiDayEnabled,
      morningStart: updated.morningStart,
      morningEnd: updated.morningEnd,
      eveningStart: updated.eveningStart,
      eveningEnd: updated.eveningEnd,
    });
    setSettings(updated);

    try {
      setIsSaving(true);
      await updateHallSettings(hallId, updated);
      if (refreshContext) {
        await refreshContext();
      }
    } catch (err: any) {
      // Revert optimistic update on network failure
      if (prevHallSnapshot) {
        updateHallState(prevHallSnapshot);
      }
      Alert.alert('Error', err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle handlers
  const handleToggleTwoSlot = (val: boolean) => {
    const nextMode: 'two_slots' | 'full_day' = val ? 'two_slots' : 'full_day';
    if (nextMode === settings.slotMode) return;
    setPendingSlotMode(nextMode);
    setIsSlotWarningModalOpen(true);
  };

  const confirmSlotModeChange = async () => {
    if (!pendingSlotMode) return;
    setWarningConfirmState('confirming');
    const targetMode = pendingSlotMode;
    const updated: HallSettingsPayload = {
      ...settings,
      slotMode: targetMode,
    };
    await persistSettings(updated);
    setWarningConfirmState('confirmed');
    setTimeout(() => {
      setIsSlotWarningModalOpen(false);
      setPendingSlotMode(null);
      setWarningConfirmState('idle');
    }, 650);
  };

  const cancelSlotModeChange = () => {
    setIsSlotWarningModalOpen(false);
    setPendingSlotMode(null);
  };

  const handleToggleMultiDay = (val: boolean) => {
    const updated: HallSettingsPayload = {
      ...settings,
      multiDayEnabled: val,
    };
    persistSettings(updated);
  };

  const handleToggleNotification = (key: keyof HallSettingsPayload['notificationSettings'], val: boolean) => {
    const updated: HallSettingsPayload = {
      ...settings,
      notificationSettings: {
        ...settings.notificationSettings,
        [key]: val,
      },
    };
    persistSettings(updated);
  };

  // Modal open helpers
  const openProfileModal = () => {
    setTempProfile({
      name: settings.name,
      phone: settings.phone,
      address: settings.address || '',
      gstNumber: settings.gstNumber || '',
      billPrefix: settings.billPrefix,
    });
    setIsProfileModalOpen(true);
  };

  const saveProfileModal = async () => {
    if (!tempProfile.name.trim() || !tempProfile.phone.trim()) {
      triggerShake();
      Alert.alert('Validation Error', 'Hall Name and Phone are required.');
      return;
    }
    setProfileSaveState('saving');
    const updated: HallSettingsPayload = {
      ...settings,
      name: tempProfile.name.trim(),
      phone: tempProfile.phone.trim(),
      address: tempProfile.address.trim() || null,
      gstNumber: tempProfile.gstNumber.trim() || null,
      billPrefix: tempProfile.billPrefix.trim().toUpperCase() || 'AURA-',
    };
    await persistSettings(updated);
    setProfileSaveState('saved');
    setTimeout(() => {
      setIsProfileModalOpen(false);
      setProfileSaveState('idle');
    }, 650);
  };

  const openTimingsModal = () => {
    setTempTimings({
      morningStart: settings.morningStart,
      morningEnd: settings.morningEnd,
      eveningStart: settings.eveningStart,
      eveningEnd: settings.eveningEnd,
    });
    setIsTimingsModalOpen(true);
  };

  const saveTimingsModal = async () => {
    setTimingsSaveState('saving');
    const updated: HallSettingsPayload = {
      ...settings,
      morningStart: tempTimings.morningStart,
      morningEnd: tempTimings.morningEnd,
      eveningStart: tempTimings.eveningStart,
      eveningEnd: tempTimings.eveningEnd,
    };
    await persistSettings(updated);
    setTimingsSaveState('saved');
    setTimeout(() => {
      setIsTimingsModalOpen(false);
      setTimingsSaveState('idle');
    }, 650);
  };

  // Tactile Row Wrapper Component with micro-press physics
  const TactileRow: React.FC<{
    onPress?: () => void;
    style?: any;
    disabled?: boolean;
    accessibilityRole?: any;
    accessibilityLabel?: string;
    children: React.ReactNode | ((props: { chevronX: Animated.Value }) => React.ReactNode);
  }> = ({ onPress, style, disabled, accessibilityRole, accessibilityLabel, children }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const chevronX = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
      if (disabled || !onPress) return;
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.965,
          duration: motionTokens.durPress,
          useNativeDriver: true,
        }),
        Animated.timing(chevronX, {
          toValue: 3,
          duration: motionTokens.durPress,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const handlePressOut = () => {
      if (disabled || !onPress) return;
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(chevronX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View style={[style, { transform: [{ scale }] }]}>
          {typeof children === 'function' ? (children as any)({ chevronX }) : children}
        </Animated.View>
      </Pressable>
    );
  };

  // User initials
  const initials = (user?.name || 'Owner User')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* 1. MINIMAL TITLE BAR */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Platform.OS === 'android' ? 24 : 12,
            paddingHorizontal: isMobile ? 16 : 24,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: t.text }]}>Settings</Text>
          {isSaving && (
            <ActivityIndicator
              size="small"
              color={isDark ? colors.gold[400] : colors.gold[600]}
            />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isMobile ? 16 : 24,
            paddingBottom: 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? colors.gold[400] : colors.gold[600]}
          />
        }
      >
        {/* 1. OWNER PROFILE CARD */}
        <Pressable
          style={({ pressed }) => [
            styles.profileCard,
            {
              backgroundColor: isDark ? colors.dark.card : colors.light.card,
              borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
          onPress={isOwner ? openProfileModal : undefined}
          accessibilityRole="button"
          accessibilityLabel="Edit Owner Profile"
        >
          <View style={styles.profileLeft}>
            <LinearGradient
              colors={colors.goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileAvatarSquircle}
            >
              <Text style={styles.profileAvatarInitial}>{initials}</Text>
            </LinearGradient>
            <View style={styles.profileTextCol}>
              <View style={styles.profileNameRow}>
                <Text numberOfLines={1} style={[styles.profileName, { color: t.text }]}>
                  {user?.name || 'Administrator'}
                </Text>
                <View
                  style={[
                    styles.rolePill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(214, 174, 107, 0.16)'
                        : 'rgba(198, 151, 73, 0.14)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      { color: isDark ? colors.gold[400] : colors.gold[700] },
                    ]}
                  >
                    {user?.role ? user.role.toUpperCase() : 'OWNER'}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={1} style={[styles.profileSubtext, { color: t.textMuted }]}>
                {settings.name} · {settings.phone}
              </Text>
            </View>
          </View>
          {isOwner && (
            <ChevronRight
              size={16}
              color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
            />
          )}
        </Pressable>

        {/* 2. WORKSPACE */}
        {(isOwner || hasAnalyticsAccess) && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Workspace</Text>
            <View
              style={[
                styles.groupedCard,
                {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
                },
              ]}
            >
              {isOwner && (
                <Pressable
                  style={({ pressed }) => [
                    styles.iosRow,
                    {
                      backgroundColor: pressed
                        ? isDark
                          ? 'rgba(214, 174, 107, 0.08)'
                          : 'rgba(198, 151, 73, 0.06)'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => navigation.navigate('Users')}
                  accessibilityRole="button"
                  accessibilityLabel="Team & Access"
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.settingIconBox,
                        {
                          backgroundColor: isDark
                            ? 'rgba(214, 174, 107, 0.16)'
                            : 'rgba(198, 151, 73, 0.14)',
                        },
                      ]}
                    >
                      <Users size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
                    </View>
                    <Text style={[styles.rowTitle, { color: t.text }]}>Team & Access</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowRightBadge, { color: t.textMuted }]}>5 max</Text>
                    <ChevronRight
                      size={14}
                      color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                    />
                  </View>
                </Pressable>
              )}

              {isOwner && hasAnalyticsAccess && (
                <View
                  style={[
                    styles.rowDivider,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(198, 151, 73, 0.12)',
                    },
                  ]}
                />
              )}

              {hasAnalyticsAccess && (
                <Pressable
                  style={({ pressed }) => [
                    styles.iosRow,
                    {
                      backgroundColor: pressed
                        ? isDark
                          ? 'rgba(214, 174, 107, 0.08)'
                          : 'rgba(198, 151, 73, 0.06)'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => navigation.navigate('Analytics')}
                  accessibilityRole="button"
                  accessibilityLabel="Analytics & Reports"
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.settingIconBox,
                        {
                          backgroundColor: isDark
                            ? 'rgba(214, 174, 107, 0.16)'
                            : 'rgba(198, 151, 73, 0.14)',
                        },
                      ]}
                    >
                      <BarChart3 size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
                    </View>
                    <Text style={[styles.rowTitle, { color: t.text }]}>Analytics & Reports</Text>
                  </View>
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                </Pressable>
              )}

              {isOwner && (
                <>
                  <View
                    style={[
                      styles.rowDivider,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(198, 151, 73, 0.12)',
                      },
                    ]}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.iosRow,
                      {
                        backgroundColor: pressed
                          ? isDark
                            ? 'rgba(214, 174, 107, 0.08)'
                            : 'rgba(198, 151, 73, 0.06)'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => navigation.navigate('ExpenseTracker')}
                    accessibilityRole="button"
                    accessibilityLabel="Expense Ledger"
                  >
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.settingIconBox,
                          {
                            backgroundColor: isDark
                              ? 'rgba(214, 174, 107, 0.16)'
                              : 'rgba(198, 151, 73, 0.14)',
                          },
                        ]}
                      >
                        <Receipt size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
                      </View>
                      <Text style={[styles.rowTitle, { color: t.text }]}>Expense Ledger</Text>
                    </View>
                    <ChevronRight
                      size={14}
                      color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

        {/* 3. HALL PROFILE */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Hall Profile</Text>
          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor: isDark ? colors.dark.card : colors.light.card,
                borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
              },
            ]}
          >
            {/* Hall Name */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed && isOwner
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.08)'
                      : 'rgba(198, 151, 73, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={isOwner ? openProfileModal : undefined}
              disabled={!isOwner}
              accessibilityRole="button"
              accessibilityLabel="Hall Name"
            >
              <Text style={[styles.rowTitle, { color: t.text }]}>Hall Name</Text>
              <View style={styles.rowRight}>
                <Text numberOfLines={1} style={[styles.rowValueText, { color: t.textMuted }]}>
                  {settings.name}
                </Text>
                {isOwner && (
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                )}
              </View>
            </Pressable>

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(198, 151, 73, 0.12)',
                },
              ]}
            />

            {/* Primary Phone */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed && isOwner
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.08)'
                      : 'rgba(198, 151, 73, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={isOwner ? openProfileModal : undefined}
              disabled={!isOwner}
              accessibilityRole="button"
              accessibilityLabel="Primary Phone"
            >
              <Text style={[styles.rowTitle, { color: t.text }]}>Primary Phone</Text>
              <View style={styles.rowRight}>
                <Text numberOfLines={1} style={[styles.rowValueText, { color: t.textMuted }]}>
                  {settings.phone}
                </Text>
                {isOwner && (
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                )}
              </View>
            </Pressable>

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(198, 151, 73, 0.12)',
                },
              ]}
            />

            {/* GST Number */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed && isOwner
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.08)'
                      : 'rgba(198, 151, 73, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={isOwner ? openProfileModal : undefined}
              disabled={!isOwner}
              accessibilityRole="button"
              accessibilityLabel="GST Number"
            >
              <Text style={[styles.rowTitle, { color: t.text }]}>GST Number</Text>
              <View style={styles.rowRight}>
                <Text numberOfLines={1} style={[styles.rowValueText, { color: t.textMuted }]}>
                  {settings.gstNumber || 'None'}
                </Text>
                {isOwner && (
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                )}
              </View>
            </Pressable>

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(198, 151, 73, 0.12)',
                },
              ]}
            />

            {/* Invoice Prefix */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed && isOwner
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.08)'
                      : 'rgba(198, 151, 73, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={isOwner ? openProfileModal : undefined}
              disabled={!isOwner}
              accessibilityRole="button"
              accessibilityLabel="Invoice Prefix"
            >
              <Text style={[styles.rowTitle, { color: t.text }]}>Invoice Prefix</Text>
              <View style={styles.rowRight}>
                <Text numberOfLines={1} style={[styles.rowValueText, { color: t.textMuted }]}>
                  {settings.billPrefix}
                </Text>
                {isOwner && (
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                )}
              </View>
            </Pressable>
          </View>
        </View>

        {/* 4. BOOKINGS & SLOTS (OWNER ONLY) */}
        {isOwner && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Bookings & Slots</Text>
            <View
              style={[
                styles.groupedCard,
                {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
                },
              ]}
            >
              {/* Full-Day Mode Switch */}
              <View style={styles.iosRow}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Full-Day Mode</Text>
                <GoldSwitch
                  value={settings.slotMode === 'full_day'}
                  onValueChange={(val) => handleToggleTwoSlot(!val)}
                />
              </View>

              <View
                style={[
                  styles.rowDivider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(198, 151, 73, 0.12)',
                  },
                ]}
              />

              {/* Multi-Day Booking Switch */}
              <View style={styles.iosRow}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Multi-Day Booking</Text>
                <GoldSwitch
                  value={settings.multiDayEnabled}
                  onValueChange={handleToggleMultiDay}
                />
              </View>

              <View
                style={[
                  styles.rowDivider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(198, 151, 73, 0.12)',
                  },
                ]}
              />

              {/* Slot Timings */}
              <Pressable
                style={({ pressed }) => [
                  styles.iosRow,
                  {
                    backgroundColor: pressed
                      ? isDark
                        ? 'rgba(214, 174, 107, 0.08)'
                        : 'rgba(198, 151, 73, 0.06)'
                      : 'transparent',
                  },
                ]}
                onPress={openTimingsModal}
                accessibilityRole="button"
                accessibilityLabel="Slot Timings"
              >
                <Text style={[styles.rowTitle, { color: t.text }]}>Slot Timings</Text>
                <View style={styles.rowRight}>
                  <Text numberOfLines={1} style={[styles.rowValueText, { color: t.textMuted }]}>
                    {settings.morningStart.slice(0, 5)}–{settings.morningEnd.slice(0, 5)} · {settings.eveningStart.slice(0, 5)}–{settings.eveningEnd.slice(0, 5)}
                  </Text>
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                </View>
              </Pressable>

              <View
                style={[
                  styles.rowDivider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(198, 151, 73, 0.12)',
                  },
                ]}
              />

              {/* Event Types */}
              <Pressable
                style={({ pressed }) => [
                  styles.iosRow,
                  {
                    backgroundColor: pressed
                      ? isDark
                        ? 'rgba(214, 174, 107, 0.08)'
                        : 'rgba(198, 151, 73, 0.06)'
                      : 'transparent',
                  },
                ]}
                onPress={() => setIsEventTypesModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Event Types"
              >
                <Text style={[styles.rowTitle, { color: t.text }]}>Event Types</Text>
                <View style={styles.rowRight}>
                  <Text numberOfLines={1} style={[styles.rowValueText, { color: t.textMuted }]}>
                    {eventTypes.slice(0, 2).join(', ')}{eventTypes.length > 2 ? ` +${eventTypes.length - 2}` : ''}
                  </Text>
                  <ChevronRight
                    size={14}
                    color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* 5. PREFERENCES & ALERTS */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Preferences & Alerts</Text>
          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor: isDark ? colors.dark.card : colors.light.card,
                borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
              },
            ]}
          >
            {/* Dark Mode Switch */}
            <View style={styles.iosRow}>
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.settingIconBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(214, 174, 107, 0.16)'
                        : 'rgba(198, 151, 73, 0.14)',
                    },
                  ]}
                >
                  {isDark ? (
                    <Moon size={16} color={colors.gold[400]} />
                  ) : (
                    <Sun size={16} color={colors.gold[600]} />
                  )}
                </View>
                <Text style={[styles.rowTitle, { color: t.text }]}>Dark Mode</Text>
              </View>
              <GoldSwitch value={isDark} onValueChange={toggleTheme} />
            </View>

            {isOwner && (
              <>
                <View
                  style={[
                    styles.rowDivider,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(198, 151, 73, 0.12)',
                    },
                  ]}
                />

                {/* Price Change Alerts */}
                <View style={styles.iosRow}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Price Change Alerts</Text>
                  <GoldSwitch
                    value={settings.notificationSettings.notify_owner_on_price_edit}
                    onValueChange={(val) =>
                      handleToggleNotification('notify_owner_on_price_edit', val)
                    }
                  />
                </View>

                <View
                  style={[
                    styles.rowDivider,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(198, 151, 73, 0.12)',
                    },
                  ]}
                />

                {/* Cancellation Alerts */}
                <View style={styles.iosRow}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Cancellation Alerts</Text>
                  <GoldSwitch
                    value={settings.notificationSettings.notify_owner_on_cancel}
                    onValueChange={(val) =>
                      handleToggleNotification('notify_owner_on_cancel', val)
                    }
                  />
                </View>

                <View
                  style={[
                    styles.rowDivider,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(198, 151, 73, 0.12)',
                    },
                  ]}
                />

                {/* Payment Reversal Alerts */}
                <View style={styles.iosRow}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Payment Reversal Alerts</Text>
                  <GoldSwitch
                    value={settings.notificationSettings.notify_owner_on_reversal}
                    onValueChange={(val) =>
                      handleToggleNotification('notify_owner_on_reversal', val)
                    }
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* 6. SECURITY */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Security</Text>
          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor: isDark ? colors.dark.card : colors.light.card,
                borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
              },
            ]}
          >
            {/* App Lock PIN */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.08)'
                      : 'rgba(198, 151, 73, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={lockApp}
              accessibilityRole="button"
              accessibilityLabel="App Lock (PIN)"
            >
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.settingIconBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(214, 174, 107, 0.16)'
                        : 'rgba(198, 151, 73, 0.14)',
                    },
                  ]}
                >
                  <ShieldCheck size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
                </View>
                <Text style={[styles.rowTitle, { color: t.text }]}>App Lock (PIN)</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowRightBadge, { color: t.textMuted }]}>Active</Text>
                <ChevronRight
                  size={14}
                  color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
                />
              </View>
            </Pressable>

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(198, 151, 73, 0.12)',
                },
              ]}
            />

            {/* Exit App */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.08)'
                      : 'rgba(198, 151, 73, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={() => setShowExitModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Exit App"
            >
              <Text style={[styles.rowTitle, { color: t.text }]}>Exit App</Text>
              <ChevronRight
                size={14}
                color={isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.35)'}
              />
            </Pressable>

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(198, 151, 73, 0.12)',
                },
              ]}
            />

            {/* Sign Out */}
            <Pressable
              style={({ pressed }) => [
                styles.iosRow,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(220, 38, 38, 0.06)'
                    : 'transparent',
                },
              ]}
              onPress={() => setShowLogoutModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: isDark ? colors.status.danger.dark : colors.status.danger.light,
                    fontWeight: '600',
                  },
                ]}
              >
                Sign Out
              </Text>
              <LogOut
                size={16}
                color={isDark ? colors.status.danger.dark : colors.status.danger.light}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* MODAL: EVENT TYPES (Progressive Disclosure Sheet) */}
      <Modal
        visible={isEventTypesModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEventTypesModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsEventTypesModalOpen(false)}
          />
          <Animated.View
            style={[
              styles.eventTypesModalCard,
              {
                backgroundColor: isDark ? '#18171B' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.25)',
                transform: [
                  {
                    translateY: eventTypesAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeaderRow}>
              {eventTypes.length < 5 ? (
                <TouchableOpacity
                  onPress={handleResetEventTypes}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.sheetHeaderAction, { color: colors.gold[500] }]}>Reset</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <Text style={[styles.sheetHeaderTitle, { color: t.text }]}>
                Event Types ({eventTypes.length}/7)
              </Text>
              <TouchableOpacity
                onPress={() => setIsEventTypesModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.sheetHeaderAction, { color: isDark ? colors.gold[400] : colors.gold[600], fontWeight: '700' }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chips List */}
            <View style={styles.chipsWrap}>
              {eventTypes.map((type, index) => (
                <View
                  key={`${type}_${index}`}
                  style={[
                    styles.chipItem,
                    {
                      backgroundColor: isDark ? 'rgba(214, 174, 107, 0.12)' : 'rgba(198, 151, 73, 0.1)',
                      borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.25)',
                    },
                  ]}
                >
                  <Sparkles size={12} color={isDark ? colors.gold[400] : colors.gold[600]} style={{ marginRight: 6 }} />
                  <Text style={[styles.chipText, { color: t.text }]}>{type}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveEventType(type)}
                    style={styles.chipRemoveBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Remove event type ${type}`}
                  >
                    <X size={13} color={t.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Add Input or Max Notice */}
            {eventTypes.length < 7 ? (
              <View style={styles.addTypeRow}>
                <TextInput
                  style={[
                    styles.addTypeInput,
                    {
                      color: t.text,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    },
                  ]}
                  placeholder="Add type (e.g. Sangeet)"
                  placeholderTextColor={t.textMuted}
                  value={newEventTypeInput}
                  onChangeText={setNewEventTypeInput}
                  maxLength={30}
                  onSubmitEditing={handleAddEventType}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    styles.addTypeButton,
                    {
                      backgroundColor: newEventTypeInput.trim()
                        ? (isDark ? colors.gold[500] : colors.gold[600])
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    },
                  ]}
                  onPress={handleAddEventType}
                  disabled={!newEventTypeInput.trim() || savingEventTypes}
                >
                  {savingEventTypes ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text
                      style={[
                        styles.addTypeButtonText,
                        { color: newEventTypeInput.trim() ? '#FFF' : t.textMuted },
                      ]}
                    >
                      Add
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.maxReachedNotice}>
                <AlertCircle size={14} color={isDark ? colors.gold[400] : colors.gold[600]} style={{ marginRight: 6 }} />
                <Text style={[styles.maxReachedText, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                  Maximum 7 event types reached. Remove one to add another.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL: EDIT HALL PROFILE */}
      <Modal
        visible={isProfileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsProfileModalOpen(false)}
          />
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#18171B' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.25)',
                transform: [
                  {
                    translateY: profileAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                  { translateX: shakeAnim },
                ],
                opacity: profileAnim,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Building2 size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                <Text style={[styles.modalTitle, { color: t.text }]}>Hall Profile</Text>
              </View>
              <Pressable
                onPress={() => setIsProfileModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  { transform: [{ scale: pressed ? 0.88 : 1 }] },
                ]}
                accessibilityLabel="Close Hall Profile"
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: t.text }]}>Hall Name *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={tempProfile.name}
                  onChangeText={(val) => setTempProfile({ ...tempProfile, name: val })}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: t.text }]}>Primary Phone *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={tempProfile.phone}
                  onChangeText={(val) => setTempProfile({ ...tempProfile, phone: val })}
                  keyboardType="phone-pad"
                />
                <Text
                  style={[
                    styles.modalFieldHelper,
                    { color: isDark ? colors.gold[400] : colors.gold[600] },
                  ]}
                >
                  Staff members use this phone number on their login screen.
                </Text>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: t.text }]}>Address</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    styles.modalTextArea,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={tempProfile.address}
                  onChangeText={(val) => setTempProfile({ ...tempProfile, address: val })}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: t.text }]}>GST Number</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={tempProfile.gstNumber}
                  onChangeText={(val) => setTempProfile({ ...tempProfile, gstNumber: val })}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: t.text }]}>Bill Prefix</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? colors.dark.input : colors.light.input,
                      borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={tempProfile.billPrefix}
                  onChangeText={(val) => setTempProfile({ ...tempProfile, billPrefix: val.toUpperCase() })}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={saveProfileModal}
                  disabled={profileSaveState !== 'idle'}
                  style={({ pressed }) => [
                    styles.morphActionBtn,
                    profileSaveState === 'saved' && styles.morphActionBtnSaved,
                    { transform: [{ scale: pressed && profileSaveState === 'idle' ? 0.965 : 1 }] },
                  ]}
                >
                  <LinearGradient
                    colors={profileSaveState === 'saved' ? ['#059669', '#10B981'] : colors.goldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.morphActionGradient}
                  >
                    {profileSaveState === 'saving' ? (
                      <View style={styles.morphInnerRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.morphActionText}>Saving Changes...</Text>
                      </View>
                    ) : profileSaveState === 'saved' ? (
                      <View style={styles.morphInnerRow}>
                        <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.morphActionText}>Changes Saved ✓</Text>
                      </View>
                    ) : (
                      <Text style={styles.morphActionText}>Save Profile</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL: EDIT OPERATING TIMINGS */}
      <Modal
        visible={isTimingsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimingsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsTimingsModalOpen(false)}
          />
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#18171B' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.25)',
                transform: [
                  {
                    translateY: timingsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
                opacity: timingsAnim,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Clock size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                <Text style={[styles.modalTitle, { color: t.text }]}>Slot Timings</Text>
              </View>
              <Pressable
                onPress={() => setIsTimingsModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  { transform: [{ scale: pressed ? 0.88 : 1 }] },
                ]}
                accessibilityLabel="Close Slot Timings"
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.timingSectionTitle, { color: t.text }]}>Morning Slot</Text>
              <View style={styles.timingsRow}>
                <View style={styles.timingInputCol}>
                  <Text style={[styles.modalInputLabel, { color: t.textMuted }]}>Start Time</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                        color: t.text,
                      },
                    ]}
                    value={tempTimings.morningStart}
                    onChangeText={(val) => setTempTimings({ ...tempTimings, morningStart: val })}
                    placeholder="06:00:00"
                    placeholderTextColor={t.textSubtle}
                  />
                </View>
                <View style={styles.timingInputCol}>
                  <Text style={[styles.modalInputLabel, { color: t.textMuted }]}>End Time</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                        color: t.text,
                      },
                    ]}
                    value={tempTimings.morningEnd}
                    onChangeText={(val) => setTempTimings({ ...tempTimings, morningEnd: val })}
                    placeholder="15:00:00"
                    placeholderTextColor={t.textSubtle}
                  />
                </View>
              </View>

              <Text style={[styles.timingSectionTitle, { color: t.text, marginTop: 14 }]}>
                Evening Slot
              </Text>
              <View style={styles.timingsRow}>
                <View style={styles.timingInputCol}>
                  <Text style={[styles.modalInputLabel, { color: t.textMuted }]}>Start Time</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                        color: t.text,
                      },
                    ]}
                    value={tempTimings.eveningStart}
                    onChangeText={(val) => setTempTimings({ ...tempTimings, eveningStart: val })}
                    placeholder="16:00:00"
                    placeholderTextColor={t.textSubtle}
                  />
                </View>
                <View style={styles.timingInputCol}>
                  <Text style={[styles.modalInputLabel, { color: t.textMuted }]}>End Time</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                        color: t.text,
                      },
                    ]}
                    value={tempTimings.eveningEnd}
                    onChangeText={(val) => setTempTimings({ ...tempTimings, eveningEnd: val })}
                    placeholder="23:59:59"
                    placeholderTextColor={t.textSubtle}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={saveTimingsModal}
                  disabled={timingsSaveState !== 'idle'}
                  style={({ pressed }) => [
                    styles.morphActionBtn,
                    timingsSaveState === 'saved' && styles.morphActionBtnSaved,
                    { transform: [{ scale: pressed && timingsSaveState === 'idle' ? 0.965 : 1 }] },
                  ]}
                >
                  <LinearGradient
                    colors={timingsSaveState === 'saved' ? ['#059669', '#10B981'] : colors.goldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.morphActionGradient}
                  >
                    {timingsSaveState === 'saving' ? (
                      <View style={styles.morphInnerRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.morphActionText}>Saving Timings...</Text>
                      </View>
                    ) : timingsSaveState === 'saved' ? (
                      <View style={styles.morphInnerRow}>
                        <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.morphActionText}>Timings Saved ✓</Text>
                      </View>
                    ) : (
                      <Text style={styles.morphActionText}>Save Timings</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL: SLOT MODE CHANGE CONFIRMATION & WARNING */}
      <Modal
        visible={isSlotWarningModalOpen}
        transparent
        animationType="fade"
        onRequestClose={cancelSlotModeChange}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={cancelSlotModeChange}
          />
          <Animated.View
            style={[
              styles.modalCard,
              glassStyles.getCardStyle(isDark),
              {
                maxWidth: 520,
                width: '92%',
                transform: [
                  {
                    translateY: warningAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
                opacity: warningAnim,
              },
            ]}
          >
            {/* Warning Header */}
            <View style={styles.warningModalHeader}>
              <Animated.View
                style={[
                  styles.warningIconCircle,
                  {
                    backgroundColor: isDark
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(217, 119, 6, 0.15)',
                    borderColor: isDark
                      ? 'rgba(245, 158, 11, 0.35)'
                      : 'rgba(217, 119, 6, 0.35)',
                    transform: [
                      {
                        scale: warningBadgeAnim.interpolate({
                          inputRange: [0, 0.6, 1],
                          outputRange: [0.8, 1.15, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <AlertTriangle size={24} color={isDark ? '#FBBF24' : '#D97706'} />
              </Animated.View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.modalTitle, { color: t.text }]}>
                  Change Slot Booking Mode?
                </Text>
                <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>
                  Confirmation required before switching
                </Text>
              </View>
              <Pressable
                onPress={cancelSlotModeChange}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  { transform: [{ scale: pressed ? 0.88 : 1 }] },
                ]}
                accessibilityLabel="Close Warning Modal"
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            {/* Mode Transition Visual */}
            <View
              style={[
                styles.modeTransitionBanner,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <View style={styles.modeTransitionChip}>
                <Text style={[styles.modeTransitionLabel, { color: t.textSubtle }]}>CURRENT MODE</Text>
                <Text style={[styles.modeTransitionValue, { color: t.text }]}>
                  {settings.slotMode === 'two_slots' ? 'Two-Slot Mode' : 'Full-Day Mode'}
                </Text>
              </View>
              <Text style={[styles.modeTransitionArrow, { color: colors.gold[500] }]}>➔</Text>
              <View style={styles.modeTransitionChip}>
                <Text style={[styles.modeTransitionLabel, { color: colors.gold[500] }]}>NEW MODE</Text>
                <Text
                  style={[
                    styles.modeTransitionValue,
                    { color: isDark ? colors.gold[400] : colors.gold[600], fontWeight: '700' },
                  ]}
                >
                  {pendingSlotMode === 'two_slots' ? 'Two-Slot Mode' : 'Full-Day Mode'}
                </Text>
              </View>
            </View>

            {/* Warning Body */}
            <View style={styles.warningBody}>
              <Text style={[styles.warningMainText, { color: t.text }]}>
                {pendingSlotMode === 'full_day'
                  ? 'You are about to switch your venue schedule to Full-Day Mode. Every calendar date will be booked as a single 24-hour event.'
                  : 'You are about to switch your venue schedule to Two-Slot Mode. Each calendar day will be split into independent Morning and Evening sessions.'}
              </Text>

              <View
                style={[
                  styles.warningCautionBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(245, 158, 11, 0.08)'
                      : 'rgba(245, 158, 11, 0.1)',
                    borderColor: isDark
                      ? 'rgba(245, 158, 11, 0.25)'
                      : 'rgba(217, 119, 6, 0.25)',
                  },
                ]}
              >
                <Text style={[styles.warningCautionTitle, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                  Important Operational Impacts:
                </Text>
                <Text style={[styles.warningCautionItem, { color: t.textMuted }]}>
                  • {pendingSlotMode === 'full_day'
                    ? 'Existing 2-slot reservations remain preserved in financial audit history, but future bookings will block the complete date.'
                    : 'Existing full-day reservations will continue to block both slots, while unbooked dates will immediately offer separate Morning and Evening slots.'}
                </Text>
                <Text style={[styles.warningCautionItem, { color: t.textMuted }]}>
                  • This change immediately updates the Calendar Availability Engine, Booking Form, and Quotations.
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.warningModalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelModalBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={cancelSlotModeChange}
              >
                <Text style={[styles.cancelModalBtnText, { color: t.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmModalBtn,
                  warningConfirmState === 'confirmed' && styles.confirmModalBtnConfirmed,
                  {
                    opacity: isSaving && warningConfirmState === 'idle' ? 0.7 : 1,
                    transform: [{ scale: pressed && warningConfirmState === 'idle' ? 0.965 : 1 }],
                  },
                ]}
                onPress={confirmSlotModeChange}
                disabled={isSaving || warningConfirmState !== 'idle'}
              >
                <LinearGradient
                  colors={warningConfirmState === 'confirmed' ? ['#059669', '#10B981'] : colors.goldGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmModalGradient}
                >
                  {warningConfirmState === 'confirming' ? (
                    <View style={styles.morphInnerRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.confirmModalBtnText}>Applying Mode...</Text>
                    </View>
                  ) : warningConfirmState === 'confirmed' ? (
                    <View style={styles.morphInnerRow}>
                      <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.confirmModalBtnText}>Mode Updated ✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.confirmModalBtnText}>
                      Confirm & Switch to {pendingSlotMode === 'two_slots' ? '2-Slots' : 'Full-Day'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* MODAL: LOGOUT CONFIRMATION */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        isDark={isDark}
      />

      {/* MODAL: EXIT APPLICATION */}
      <ExitAppModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        isDark={isDark}
      />
    </SafeAreaView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 4,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  profileAvatarSquircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileTextCol: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  iosRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  settingIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    maxWidth: '55%',
  },
  rowValueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowRightBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    marginLeft: 16,
  },
  eventTypesModalCard: {
    width: '100%',
    maxWidth: 420,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    gap: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetHeaderAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileHall: {
    fontSize: 13,
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 11,
    marginTop: 2,
  },
  editBtn: {
    padding: 8,
    borderRadius: 10,
  },
  teamCard: {
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamCardTexts: {
    flex: 1,
  },
  teamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 6,
  },
  resetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTypesDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  chipRemoveBtn: {
    padding: 2,
    marginLeft: 2,
  },
  addTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTypeInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  addTypeButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTypeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  maxReachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  maxReachedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  groupedList: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  rowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldNote: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  modalFieldHelper: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 20,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalTextArea: {
    height: 68,
    paddingVertical: 10,
  },
  modalActions: {
    marginTop: 12,
    marginBottom: 8,
  },
  timingSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  timingsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timingInputCol: {
    flex: 1,
  },
  warningModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  warningIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modeTransitionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  modeTransitionChip: {
    flex: 1,
  },
  modeTransitionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modeTransitionValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  modeTransitionArrow: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 10,
  },
  warningBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  warningMainText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 12,
  },
  warningCautionBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  warningCautionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  warningCautionItem: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  warningModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmModalBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmModalBtnConfirmed: {
    shadowColor: '#10B981',
  },
  confirmModalGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  confirmModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  morphActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  morphActionBtnSaved: {
    shadowColor: '#10B981',
  },
  morphActionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  morphActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  morphInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
