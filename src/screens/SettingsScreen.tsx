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

  // Slot Mode Warning Modal State
  const [isSlotWarningModalOpen, setIsSlotWarningModalOpen] = useState(false);
  const [pendingSlotMode, setPendingSlotMode] = useState<'two_slots' | 'full_day' | null>(null);

  // Logout & Exit Confirmation Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Wire all Settings modals to Central BackDispatcher (Rule 1)
  useBackOverlay(isProfileModalOpen, () => setIsProfileModalOpen(false));
  useBackOverlay(isTimingsModalOpen, () => setIsTimingsModalOpen(false));
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

      {/* HEADER: Clean Top Bar */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Platform.OS === 'android' ? 26 : 10,
            paddingHorizontal: isMobile ? 16 : 24,
          },
        ]}
      >
        <View style={[styles.headerContainer, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.brandRow}>
            <LinearGradient colors={colors.goldGradient} style={styles.headerEmblem}>
              <Crown size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: t.text }]}>Settings</Text>
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                {settings.name || 'Function Hall Configuration'}
              </Text>
            </View>
          </View>
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
          { paddingHorizontal: isMobile ? 16 : 24 },
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
        {/* PROFILE / ACCOUNT CARD */}
        <View style={[styles.profileCard, glassStyles.getCardStyle(isDark)]}>
          <LinearGradient colors={colors.goldGradient} style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: t.text }]}>
                {user?.name || 'Hall Administrator'}
              </Text>
              <RoleBadge role={user?.role || 'staff'} />
            </View>
            <Text style={[styles.profileHall, { color: t.textMuted }]}>
              {settings.name}
            </Text>
            <Text style={[styles.profilePhone, { color: t.textSubtle }]}>
              {settings.phone}
            </Text>
          </View>
          {isOwner && (
            <Pressable
              style={({ pressed }) => [
                styles.editBtn,
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
              accessibilityLabel="Edit hall profile"
              onPress={openProfileModal}
            >
              <Edit3 size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </Pressable>
          )}
        </View>

        {/* TEAM & STAFF ACCOUNTS (OWNER ONLY) */}
        {isOwner && (
          <>
            <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
              Team & Staff Management
            </Text>
            <TactileRow
              style={[styles.teamCard, glassStyles.getCardStyle(isDark)]}
              onPress={() => navigation.navigate('Users')}
              accessibilityRole="button"
              accessibilityLabel="Manage Team & Staff"
            >
              {({ chevronX }: { chevronX: Animated.Value }) => (
                <>
                  <View style={styles.teamCardLeft}>
                    <View
                      style={[
                        styles.menuIconBox,
                        { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                      ]}
                    >
                      <Users size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                    </View>
                    <View style={styles.teamCardTexts}>
                      <View style={styles.teamTitleRow}>
                        <Text style={[styles.rowTitle, { color: t.text }]}>
                          Team Accounts & Access
                        </Text>
                        <View
                          style={[
                            styles.teamPill,
                            {
                              backgroundColor: isDark
                                ? 'rgba(214, 174, 107, 0.15)'
                                : 'rgba(198, 151, 73, 0.18)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.teamPillText,
                              { color: isDark ? colors.gold[400] : colors.gold[600] },
                            ]}
                          >
                            5-Member Limit
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                        Invite staff, configure screen permissions, & reset credentials
                      </Text>
                    </View>
                  </View>
                  <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                    <ChevronRight size={18} color={t.textSubtle} />
                  </Animated.View>
                </>
              )}
            </TactileRow>
          </>
        )}

        {/* FINANCIAL ANALYTICS & REPORTS (OWNER & AUTHORIZED MANAGERS) */}
        {hasAnalyticsAccess && (
          <>
            <Text style={[styles.sectionEyebrow, { color: t.textSubtle, marginTop: isOwner ? 16 : 0 }]}>
              Business Analytics & Intelligence
            </Text>
            <TactileRow
              style={[styles.teamCard, glassStyles.getCardStyle(isDark)]}
              onPress={() => navigation.navigate('Analytics')}
              accessibilityRole="button"
              accessibilityLabel="View Executive Analytics"
            >
              {({ chevronX }: { chevronX: Animated.Value }) => (
                <>
                  <View style={styles.teamCardLeft}>
                    <View
                      style={[
                        styles.menuIconBox,
                        { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                      ]}
                    >
                      <BarChart3 size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                    </View>
                    <View style={styles.teamCardTexts}>
                      <View style={styles.teamTitleRow}>
                        <Text style={[styles.rowTitle, { color: t.text }]}>
                          Financial Analytics & Reports
                        </Text>
                        <View
                          style={[
                            styles.teamPill,
                            {
                              backgroundColor: isDark
                                ? 'rgba(214, 174, 107, 0.15)'
                                : 'rgba(198, 151, 73, 0.18)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.teamPillText,
                              { color: isDark ? colors.gold[400] : colors.gold[600] },
                            ]}
                          >
                            Executive
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                        Revenue metrics, net collection rates, top packages & dues summary
                      </Text>
                    </View>
                  </View>
                  <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                    <ChevronRight size={18} color={t.textSubtle} />
                  </Animated.View>
                </>
              )}
            </TactileRow>
          </>
        )}

        {/* OPERATIONAL EXPENSE TRACKER */}
        {isOwner && (
          <TactileRow
            style={[styles.teamCard, glassStyles.getCardStyle(isDark), { marginTop: 10 }]}
            onPress={() => navigation.navigate('ExpenseTracker')}
            accessibilityRole="button"
            accessibilityLabel="View Operational Expense Tracker"
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={styles.teamCardLeft}>
                  <View
                    style={[
                      styles.menuIconBox,
                      { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(220, 38, 38, 0.1)' },
                    ]}
                  >
                    <Receipt size={18} color={isDark ? '#F87171' : '#DC2626'} />
                  </View>
                  <View style={styles.teamCardTexts}>
                    <View style={styles.teamTitleRow}>
                      <Text style={[styles.rowTitle, { color: t.text }]}>
                        Operational Expense Tracker
                      </Text>
                      <View
                        style={[
                          styles.teamPill,
                          {
                            backgroundColor: isDark
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(220, 38, 38, 0.12)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.teamPillText,
                            { color: isDark ? '#F87171' : '#DC2626' },
                          ]}
                        >
                          Ledger
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                      Track operational outlays, fuel, staff wages & vendor dues
                    </Text>
                  </View>
                </View>
                <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                  <ChevronRight size={18} color={t.textSubtle} />
                </Animated.View>
              </>
            )}
          </TactileRow>
        )}

        {/* APPEARANCE / THEME SECTION */}
        <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Appearance</Text>
        <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.switchRow}>
            <View style={styles.rowWithIcon}>
              <View
                style={[
                  styles.menuIconBox,
                  { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                ]}
              >
                {isDark ? (
                  <Moon size={16} color={colors.gold[400]} />
                ) : (
                  <Sun size={16} color={colors.gold[600]} />
                )}
              </View>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.rowTitle, { color: t.text }]}>Dark Mode</Text>
                <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                  {isDark ? 'Obsidian charcoal luxury glass' : 'Bright royal pearl luxury theme'}
                </Text>
              </View>
            </View>
            <GoldSwitch value={isDark} onValueChange={toggleTheme} />
          </View>
        </View>

        {/* HALL DETAILS SECTION */}
        <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>Hall Details</Text>
        <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
          <TactileRow
            style={[
              styles.listRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
            ]}
            onPress={isOwner ? openProfileModal : undefined}
            disabled={!isOwner}
            accessibilityLabel={isOwner ? "Edit Hall Name" : "Hall Name"}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={{ flex: 1, marginRight: isOwner ? 8 : 0 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Hall Name</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    {settings.name}
                  </Text>
                </View>
                {isOwner && (
                  <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                    <ChevronRight size={16} color={t.textSubtle} />
                  </Animated.View>
                )}
              </>
            )}
          </TactileRow>

          <TactileRow
            style={[
              styles.listRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
            ]}
            onPress={isOwner ? openProfileModal : undefined}
            disabled={!isOwner}
            accessibilityLabel={isOwner ? "Edit Primary Phone" : "Primary Phone"}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={{ flex: 1, marginRight: isOwner ? 8 : 0 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Primary Phone</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    {settings.phone}
                  </Text>
                  <Text
                    style={[
                      styles.fieldNote,
                      { color: isDark ? colors.gold[400] : colors.gold[600] },
                    ]}
                  >
                    Staff members use this phone number on their login screen.
                  </Text>
                </View>
                {isOwner && (
                  <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                    <ChevronRight size={16} color={t.textSubtle} />
                  </Animated.View>
                )}
              </>
            )}
          </TactileRow>

          <TactileRow
            style={[
              styles.listRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
            ]}
            onPress={isOwner ? openProfileModal : undefined}
            disabled={!isOwner}
            accessibilityLabel={isOwner ? "Edit GST Number" : "GST Number"}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={{ flex: 1, marginRight: isOwner ? 8 : 0 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>GST Number</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    {settings.gstNumber || 'Not specified'}
                  </Text>
                </View>
                {isOwner && (
                  <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                    <ChevronRight size={16} color={t.textSubtle} />
                  </Animated.View>
                )}
              </>
            )}
          </TactileRow>

          <TactileRow
            style={styles.listRow}
            onPress={isOwner ? openProfileModal : undefined}
            disabled={!isOwner}
            accessibilityLabel={isOwner ? "Edit Invoice Bill Prefix" : "Invoice Bill Prefix"}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={{ flex: 1, marginRight: isOwner ? 8 : 0 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Invoice Bill Prefix</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    {settings.billPrefix} (e.g. {settings.billPrefix}0042)
                  </Text>
                </View>
                {isOwner && (
                  <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                    <ChevronRight size={16} color={t.textSubtle} />
                  </Animated.View>
                )}
              </>
            )}
          </TactileRow>
        </View>

        {/* OPERATING SLOTS & TIMINGS (OWNER ONLY) */}
        {isOwner && (
          <>
            <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
              Operating Slots & Timings
            </Text>
            <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
              <View
                style={[
                  styles.switchRow,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
                ]}
              >
                <TouchableOpacity
                  style={{ flex: 1, marginRight: 12 }}
                  onPress={() => handleToggleTwoSlot(settings.slotMode !== 'two_slots')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Slot mode is currently ${settings.slotMode === 'two_slots' ? 'Two-Slot System' : 'Full-Day System'}. Tap to change.`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <Text style={[styles.rowTitle, { color: t.text }]}>
                      {settings.slotMode === 'two_slots' ? 'Two-Slot System' : 'Full-Day System'}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isDark ? 'rgba(229,184,66,0.15)' : 'rgba(198,151,73,0.15)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(229,184,66,0.3)' : 'rgba(198,151,73,0.3)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: isDark ? colors.gold[400] : colors.gold[600],
                        }}
                      >
                        {settings.slotMode === 'two_slots' ? '2 Slots Active' : 'Full Day Active'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    {settings.slotMode === 'two_slots'
                      ? 'Morning and evening sessions booked independently'
                      : 'Entire day booked as a single 24-hour event'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      fontWeight: '500',
                      color: isDark ? 'rgba(251, 191, 36, 0.9)' : '#B45309',
                    }}
                  >
                    ⚠️ Changing mode prompts a confirmation warning
                  </Text>
                </TouchableOpacity>
                <GoldSwitch
                  value={settings.slotMode === 'two_slots'}
                  onValueChange={handleToggleTwoSlot}
                />
              </View>

              <View
                style={[
                  styles.switchRow,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Multi-Day Booking</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    Allow reservations spanning multiple days
                  </Text>
                </View>
                <GoldSwitch
                  value={settings.multiDayEnabled}
                  onValueChange={handleToggleMultiDay}
                />
              </View>

              <TactileRow
                style={styles.listRow}
                onPress={openTimingsModal}
                accessibilityLabel="Edit Slot Operating Timings"
              >
                {({ chevronX }: { chevronX: Animated.Value }) => (
                  <>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.rowTitle, { color: t.text }]}>Slot Operating Timings</Text>
                      <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                        Morning ({settings.morningStart.slice(0, 5)} - {settings.morningEnd.slice(0, 5)}) • Evening ({settings.eveningStart.slice(0, 5)} - {settings.eveningEnd.slice(0, 5)})
                      </Text>
                    </View>
                    <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                      <ChevronRight size={16} color={t.textSubtle} />
                    </Animated.View>
                  </>
                )}
              </TactileRow>
            </View>
          </>
        )}

        {/* EVENT TYPES (OWNER ONLY) */}
        {isOwner && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
                Event Types ({eventTypes.length}/7)
              </Text>
              {eventTypes.length < 5 && (
                <TouchableOpacity
                  onPress={handleResetEventTypes}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.resetHeaderBtn}
                >
                  <RotateCcw size={12} color={colors.gold[500]} style={{ marginRight: 4 }} />
                  <Text style={[styles.resetText, { color: colors.gold[500] }]}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.groupedList, glassStyles.getCardStyle(isDark), { padding: 16 }]}>
              <Text style={[styles.eventTypesDescription, { color: t.textMuted }]}>
                Configure up to 7 ceremony & occasion types available in the booking wizard.
              </Text>

              {/* Chips Wrap */}
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

              {/* Add New Event Type Row or Max Reached Notice */}
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
                    placeholder="Add event type (e.g. Sangeet)"
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
                          { color: newEventTypeInput.trim() ? '#000' : t.textMuted },
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
            </View>
          </>
        )}

        {/* NOTIFICATIONS (OWNER ONLY) */}
        {isOwner && (
          <>
            <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
              Notification Preferences
            </Text>
            <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
              <View
                style={[
                  styles.switchRow,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Price Change Alerts</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    Notify owner when staff modifies booking prices
                  </Text>
                </View>
                <GoldSwitch
                  value={settings.notificationSettings.notify_owner_on_price_edit}
                  onValueChange={(val) => handleToggleNotification('notify_owner_on_price_edit', val)}
                />
              </View>

              <View
                style={[
                  styles.switchRow,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Cancellation Alerts</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    Notify owner when a reserved booking is cancelled
                  </Text>
                </View>
                <GoldSwitch
                  value={settings.notificationSettings.notify_owner_on_cancel}
                  onValueChange={(val) => handleToggleNotification('notify_owner_on_cancel', val)}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: t.text }]}>Payment Reversal Alerts</Text>
                  <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                    Notify owner when ledger payments are reversed
                  </Text>
                </View>
                <GoldSwitch
                  value={settings.notificationSettings.notify_owner_on_reversal}
                  onValueChange={(val) => handleToggleNotification('notify_owner_on_reversal', val)}
                />
              </View>
            </View>
          </>
        )}

        {/* SECURITY & SESSION */}
        <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
          Security & Session
        </Text>
        <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
          <TactileRow
            onPress={lockApp}
            style={[
              styles.listRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
            ]}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={styles.rowWithIcon}>
                  <View
                    style={[
                      styles.menuIconBox,
                      { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                    ]}
                  >
                    <Shield size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: t.text }]}>Lock App (PIN)</Text>
                    <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                      Require 4-digit PIN on resume
                    </Text>
                  </View>
                </View>
                <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                  <ChevronRight size={16} color={t.textSubtle} />
                </Animated.View>
              </>
            )}
          </TactileRow>

          <TactileRow
            onPress={() => setShowExitModal(true)}
            style={styles.listRow}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={styles.rowWithIcon}>
                  <View
                    style={[
                      styles.menuIconBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(214, 174, 107, 0.15)'
                          : '#FAF5EB',
                      },
                    ]}
                  >
                    <Power
                      size={16}
                      color={isDark ? colors.gold[400] : colors.gold[600]}
                    />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: t.text }]}>
                      Exit App
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                      Close application session
                    </Text>
                  </View>
                </View>
                <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                  <ChevronRight size={16} color={t.textSubtle} />
                </Animated.View>
              </>
            )}
          </TactileRow>

          <TactileRow
            onPress={() => setShowLogoutModal(true)}
            style={styles.listRow}
          >
            {({ chevronX }: { chevronX: Animated.Value }) => (
              <>
                <View style={styles.rowWithIcon}>
                  <View
                    style={[
                      styles.menuIconBox,
                      {
                        backgroundColor: isDark
                          ? colors.status.danger.bgDark
                          : colors.status.danger.bgLight,
                      },
                    ]}
                  >
                    <LogOut
                      size={16}
                      color={isDark ? colors.status.danger.dark : colors.status.danger.light}
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.rowTitle,
                        {
                          color: isDark ? colors.status.danger.dark : colors.status.danger.light,
                        },
                      ]}
                    >
                      Sign Out
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                      Exit session securely
                    </Text>
                  </View>
                </View>
                <Animated.View style={{ transform: [{ translateX: chevronX }] }}>
                  <ChevronRight size={16} color={t.textSubtle} />
                </Animated.View>
              </>
            )}
          </TactileRow>
        </View>
      </ScrollView>

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
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmblem: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderRadius: 20,
    marginTop: 4,
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
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
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
