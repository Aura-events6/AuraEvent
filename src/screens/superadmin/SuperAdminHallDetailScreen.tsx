import React, { useState, useRef } from 'react';
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
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Building,
  Phone,
  User,
  ShieldCheck,
  Sparkles,
  Zap,
  Clock,
  AlertTriangle,
  Eye,
  Calendar,
  CheckCircle2,
  Mail,
  Share2,
  Check,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { updateHallSubscription } from '../../services/superadminService';
import { SuperAdminHallItem } from '../../types/superadmin';
import { GoldSwitch } from '../../components/GoldSwitch';

type HallDetailRouteParams = {
  hall: SuperAdminHallItem;
};

export const SuperAdminHallDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: HallDetailRouteParams }, 'params'>>();
  const { theme, enterSupportMode } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const [currentHall, setCurrentHall] = useState<SuperAdminHallItem>(route.params.hall);
  const [isExempt, setIsExempt] = useState<boolean>(currentHall.is_subscription_exempt);
  const [isSuspended, setIsSuspended] = useState<boolean>(currentHall.is_suspended);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planActivateState, setPlanActivateState] = useState<'idle' | 'activating' | 'activated'>('idle');
  const [trialExtendState, setTrialExtendState] = useState<'idle' | 'extending' | 'extended'>('idle');

  // Live Subscription Bypass Toggle
  const handleToggleBypass = async (newValue: boolean) => {
    setIsExempt(newValue);
    setActionLoading('bypass');

    try {
      await updateHallSubscription({
        hallId: currentHall.id,
        action: 'toggle_bypass',
        isExempt: newValue,
      });

      setCurrentHall(prev => ({
        ...prev,
        is_subscription_exempt: newValue,
      }));

      Alert.alert(
        'Bypass Setting Updated',
        newValue
          ? 'Lifetime Subscription Bypass is now ACTIVE. This hall operates with zero paywall barriers.'
          : 'Subscription Bypass is now DISABLED. The hall is subject to standard trial and billing limits.'
      );
    } catch (err: any) {
      console.warn('[SuperAdminHallDetail] Toggle bypass error:', err);
      setIsExempt(!newValue); // Revert switch on error
      Alert.alert('Error', err?.message || 'Failed to update bypass status.');
    } finally {
      setActionLoading(null);
    }
  };

  // 1-Year Plan Activation
  const handleActivatePlan = async () => {
    Alert.alert(
      'Activate 1-Year Plan',
      `Are you sure you want to activate a 1-Year Standard Plan for ${currentHall.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Now',
          onPress: async () => {
            setActionLoading('activate');
            setPlanActivateState('activating');
            try {
              await updateHallSubscription({
                hallId: currentHall.id,
                action: 'activate_plan',
                planType: 'standard',
              });

              setCurrentHall(prev => ({
                ...prev,
                subscription_status: 'active',
                is_suspended: false,
              }));

              setPlanActivateState('activated');
              setTimeout(() => setPlanActivateState('idle'), 2500);
              Alert.alert('Success', '1-Year Standard Plan successfully activated for this hall.');
            } catch (err: any) {
              setPlanActivateState('idle');
              Alert.alert('Activation Error', err?.message || 'Failed to activate plan.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // Extend Trial (+14 Days)
  const handleExtendTrial = async () => {
    setActionLoading('extend');
    setTrialExtendState('extending');
    try {
      await updateHallSubscription({
        hallId: currentHall.id,
        action: 'extend_trial',
        days: 14,
      });

      setCurrentHall(prev => ({
        ...prev,
        subscription_status: 'trial',
        is_suspended: false,
      }));

      setTrialExtendState('extended');
      setTimeout(() => setTrialExtendState('idle'), 2500);
      Alert.alert('Trial Extended', 'Trial has been extended by +14 days.');
    } catch (err: any) {
      setTrialExtendState('idle');
      Alert.alert('Extension Error', err?.message || 'Failed to extend trial.');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Suspension
  const handleToggleSuspension = async () => {
    const nextSuspendedState = !isSuspended;
    const actionName = nextSuspendedState ? 'manual_suspend' : 'manual_unsuspend';

    Alert.alert(
      nextSuspendedState ? 'Suspend Function Hall' : 'Unsuspend Function Hall',
      nextSuspendedState
        ? 'Suspending this hall will immediately block app login and redirect the owner to the suspension gate.'
        : 'Unsuspending will restore immediate full access for the owner.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextSuspendedState ? 'Confirm Suspend' : 'Confirm Unsuspend',
          style: nextSuspendedState ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading('suspend');
            try {
              await updateHallSubscription({
                hallId: currentHall.id,
                action: actionName,
                reason: nextSuspendedState ? 'Suspended by SuperAdmin' : undefined,
              });

              setIsSuspended(nextSuspendedState);
              setCurrentHall(prev => ({
                ...prev,
                is_suspended: nextSuspendedState,
              }));

              Alert.alert('Updated', `Hall is now ${nextSuspendedState ? 'SUSPENDED' : 'ACTIVE'}.`);
            } catch (err: any) {
              Alert.alert('Suspension Error', err?.message || 'Failed to update suspension status.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // Launch Support Mode ("View As Hall")
  const handleEnterSupportMode = () => {
    navigation.navigate('SuperAdminSupportCalendar', { hall: currentHall });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            glassStyles.getCardStyle(isDark),
            { transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
        >
          <ArrowLeft size={18} color={t.text} />
        </Pressable>

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>
            {currentHall.name}
          </Text>
          <Text style={[styles.headerSub, { color: t.textMuted }]}>
            Hall ID: {currentHall.id.substring(0, 8)}...
          </Text>
        </View>

        <Pressable
          onPress={() => Linking.openURL(`tel:${currentHall.phone}`)}
          style={({ pressed }) => [
            styles.phoneBtn,
            glassStyles.getCardStyle(isDark),
            { transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
        >
          <Phone size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Mode Launcher Card */}
        <Pressable
          onPress={handleEnterSupportMode}
          style={({ pressed }) => [
            styles.supportBanner,
            glassStyles.getCardStyle(isDark),
            { transform: [{ scale: pressed ? 0.965 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.supportIconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Eye size={22} color="#FFFFFF" strokeWidth={2.4} />
          </LinearGradient>

          <View style={styles.supportTextCol}>
            <Text style={[styles.supportTitle, { color: t.text }]}>
              View Live Calendar (Support Mode)
            </Text>
            <Text style={[styles.supportSubtitle, { color: t.textMuted }]}>
              Inspect this hall's scheduled bookings and daily slots in read-only support mode.
            </Text>
          </View>
        </Pressable>

        {/* Section 1: Commercial & Subscription Bypass */}
        <View style={[styles.cardSection, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.sectionHeaderRow}>
            <ShieldCheck size={18} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: t.text }]}>
              Commercial Policy & Paywall Bypass
            </Text>
          </View>

          {/* Live Subscription Bypass Switch */}
          <View style={styles.bypassRow}>
            <View style={styles.bypassTextCol}>
              <View style={styles.bypassHeaderLine}>
                <Text style={[styles.bypassLabel, { color: t.text }]}>
                  Subscription Bypass
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    isExempt ? styles.statusPillGreen : styles.statusPillMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isExempt ? '#10B981' : t.textMuted },
                    ]}
                  >
                    {isExempt ? 'LIFETIME BYPASS ACTIVE' : 'STANDARD BILLING'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.bypassSub, { color: t.textMuted }]}>
                {isExempt
                  ? 'This hall operates with Lifetime Free Access. Zero paywall barriers or trial expiry gates will ever block this hall.'
                  : 'Hall is subject to standard subscription paywall and trial limits.'}
              </Text>
            </View>

            {actionLoading === 'bypass' ? (
              <ActivityIndicator size="small" color={colors.gold[400]} />
            ) : (
              <GoldSwitch
                value={isExempt}
                onValueChange={handleToggleBypass}
              />
            )}
          </View>
        </View>

        {/* Section 2: Operator Action Controls */}
        <View style={[styles.cardSection, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.sectionHeaderRow}>
            <Zap size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>
              Operator Action Controls
            </Text>
          </View>

          <View style={styles.controlButtonsGrid}>
            {/* Activate 1-Year Plan */}
            <Pressable
              onPress={handleActivatePlan}
              disabled={Boolean(actionLoading) || planActivateState !== 'idle'}
              style={({ pressed }) => [
                styles.controlBtn,
                {
                  borderColor: planActivateState === 'activated'
                    ? '#10B981'
                    : isDark ? colors.gold[500] : colors.gold[600],
                  backgroundColor: planActivateState === 'activated'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'transparent',
                  transform: [{ scale: pressed ? 0.965 : 1 }],
                },
              ]}
            >
              {planActivateState === 'activating' ? (
                <ActivityIndicator size="small" color={colors.gold[500]} />
              ) : planActivateState === 'activated' ? (
                <>
                  <Check size={16} color="#10B981" strokeWidth={2.5} />
                  <Text style={[styles.controlBtnText, { color: '#10B981' }]}>
                    Plan Activated ✓
                  </Text>
                </>
              ) : (
                <>
                  <Zap size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
                  <Text style={[styles.controlBtnText, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                    Activate 1-Year Plan
                  </Text>
                </>
              )}
            </Pressable>

            {/* Extend Trial */}
            <Pressable
              onPress={handleExtendTrial}
              disabled={Boolean(actionLoading) || trialExtendState !== 'idle'}
              style={({ pressed }) => [
                styles.controlBtn,
                {
                  borderColor: trialExtendState === 'extended'
                    ? '#10B981'
                    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
                  backgroundColor: trialExtendState === 'extended'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'transparent',
                  transform: [{ scale: pressed ? 0.965 : 1 }],
                },
              ]}
            >
              {trialExtendState === 'extending' ? (
                <ActivityIndicator size="small" color={t.text} />
              ) : trialExtendState === 'extended' ? (
                <>
                  <Check size={16} color="#10B981" strokeWidth={2.5} />
                  <Text style={[styles.controlBtnText, { color: '#10B981' }]}>
                    +14 Days Added ✓
                  </Text>
                </>
              ) : (
                <>
                  <Clock size={16} color={t.text} />
                  <Text style={[styles.controlBtnText, { color: t.text }]}>
                    Extend Trial (+14 Days)
                  </Text>
                </>
              )}
            </Pressable>

            {/* Suspend / Unsuspend */}
            <Pressable
              onPress={handleToggleSuspension}
              disabled={Boolean(actionLoading)}
              style={({ pressed }) => [
                styles.controlBtn,
                {
                  borderColor: isSuspended ? '#10B981' : colors.status.danger.light,
                  backgroundColor: isSuspended
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(16, 185, 129, 0.05)'
                    : isDark
                    ? colors.status.danger.bgDark
                    : colors.status.danger.bgLight,
                  transform: [{ scale: pressed ? 0.965 : 1 }],
                },
              ]}
            >
              {actionLoading === 'suspend' ? (
                <ActivityIndicator size="small" color={colors.status.danger.light} />
              ) : (
                <>
                  <AlertTriangle
                    size={16}
                    color={isSuspended ? '#10B981' : colors.status.danger.light}
                  />
                  <Text
                    style={[
                      styles.controlBtnText,
                      { color: isSuspended ? '#10B981' : colors.status.danger.light },
                    ]}
                  >
                    {isSuspended ? 'Unsuspend Hall (Restore Access)' : 'Suspend Hall (Block Access)'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Section 3: Hall Metadata & Credentials */}
        <View style={[styles.cardSection, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.sectionHeaderRow}>
            <Building size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>
              Tenant Metadata
            </Text>
          </View>

          <View style={styles.metaList}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: t.textMuted }]}>Registered Phone:</Text>
              <Text style={[styles.metaVal, { color: t.text }]}>{currentHall.phone}</Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: t.textMuted }]}>Owner Username:</Text>
              <Text style={[styles.metaVal, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                @{currentHall.owner_username || 'unassigned'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: t.textMuted }]}>Owner Email:</Text>
              <Text style={[styles.metaVal, { color: t.text }]}>
                {currentHall.owner_email || 'Not provided'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: t.textMuted }]}>Slot Mode:</Text>
              <Text style={[styles.metaVal, { color: t.text }]}>
                {currentHall.slot_mode === 'full_day' ? 'Full Day Only' : 'Two Slots (Morning/Evening)'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: t.textMuted }]}>Total Bookings Logged:</Text>
              <Text style={[styles.metaVal, { color: t.text }]}>
                {currentHall.total_bookings ?? 0}
              </Text>
            </View>

            {currentHall.address ? (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: t.textMuted }]}>Address:</Text>
                <Text style={[styles.metaVal, { color: t.text }]}>{currentHall.address}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 151, 73, 0.15)',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  phoneBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  supportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    gap: 14,
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTextCol: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  cardSection: {
    padding: 18,
    borderRadius: 22,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bypassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bypassTextCol: {
    flex: 1,
  },
  bypassHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bypassLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillMuted: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bypassSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  controlButtonsGrid: {
    gap: 10,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: 46,
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaList: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
  },
});

