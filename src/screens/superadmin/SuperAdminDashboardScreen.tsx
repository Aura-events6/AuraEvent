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
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck,
  Building2,
  TrendingUp,
  BarChart3,
  PlusCircle,
  Users,
  Search,
  LogOut,
  Moon,
  Sun,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import {
  fetchPlatformMetrics,
  formatPlatformCurrency,
} from '../../services/superadminService';
import { PlatformMetrics } from '../../types/superadmin';
import { SuperAdminMetricCard } from '../../components/superadmin';

export const SuperAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, theme, toggleTheme, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = await fetchPlatformMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.warn('[SuperAdminDashboard] Error loading platform metrics:', err);
      setError(err?.message || 'Failed to fetch live platform metrics.');
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics(false);
  }, [loadMetrics]);

  const handlePullRefresh = () => {
    setRefreshing(true);
    loadMetrics(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Operator Header */}
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
            <LinearGradient
              colors={colors.goldGradient}
              style={styles.headerEmblem}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ShieldCheck size={22} color="#FFFFFF" strokeWidth={2.4} />
            </LinearGradient>
            <View style={styles.brandTextCol}>
              <View style={styles.titleWithLive}>
                <Text style={[styles.headerTitle, { color: t.text }]}>Operator Console</Text>
                <View style={styles.operatorBadge}>
                  <Text style={styles.operatorBadgeText}>SUPERADMIN</Text>
                </View>
              </View>
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                Aura Multi-Tenant Master Back-Office
              </Text>
            </View>
          </View>

          {/* Header Controls: Theme + Sign Out */}
          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleTheme}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: isDark ? colors.dark.input : colors.light.input },
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
              accessibilityLabel="Toggle theme"
            >
              {isDark ? (
                <Sun size={16} color={colors.gold[400]} />
              ) : (
                <Moon size={16} color={colors.gold[600]} />
              )}
            </Pressable>

            <Pressable
              onPress={logout}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: isDark
                    ? colors.status.danger.bgDark
                    : colors.status.danger.bgLight,
                },
                { transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
              accessibilityLabel="Sign out from console"
            >
              <LogOut size={16} color={colors.status.danger.light} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={isDark ? colors.gold[400] : colors.gold[600]}
            colors={[colors.gold[500]]}
          />
        }
      >
        {/* Error Notification Banner if RPC fails */}
        {error && (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: isDark
                  ? colors.status.danger.bgDark
                  : colors.status.danger.bgLight,
                borderColor: colors.status.danger.light,
              },
            ]}
          >
            <AlertTriangle size={18} color={colors.status.danger.light} />
            <Text style={[styles.errorText, { color: colors.status.danger.light }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={() => loadMetrics(false)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Global Platform Metric Cards (Live PostgreSQL) */}
        <Text style={[styles.sectionHeading, { color: t.textMuted }]}>
          PLATFORM REVENUE & OCCUPANCY
        </Text>

        {loading && !metrics ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.gold[500]} />
            <Text style={[styles.loadingText, { color: t.textMuted }]}>
              Loading live multi-tenant metrics...
            </Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <SuperAdminMetricCard
              label="Platform ARR"
              value={formatPlatformCurrency(metrics?.annual_recurring_revenue || 0)}
              numericValue={metrics?.annual_recurring_revenue || 0}
              isCurrency={true}
              subtitle="Annual Recurring Revenue"
              icon={TrendingUp}
              variant="gold"
              onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'active' })}
            />
            <SuperAdminMetricCard
              label="Platform GMV"
              value={formatPlatformCurrency(metrics?.platform_gmv || 0)}
              numericValue={metrics?.platform_gmv || 0}
              isCurrency={true}
              subtitle="Total Contract Value"
              icon={BarChart3}
              variant="info"
              onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'all' })}
            />
            <SuperAdminMetricCard
              label="Total Halls"
              value={String(metrics?.total_halls || 0)}
              numericValue={metrics?.total_halls || 0}
              subtitle={`${metrics?.active_paid_plans || 0} Active Plans`}
              icon={Building2}
              variant="gold"
              onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'all' })}
            />
            <SuperAdminMetricCard
              label="Exempt (Bypass)"
              value={String(metrics?.exempt_halls || 0)}
              numericValue={metrics?.exempt_halls || 0}
              subtitle="Lifetime Free Access"
              icon={ShieldCheck}
              variant="success"
              onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'exempt' })}
            />
          </View>
        )}

        {/* 2. Platform Status Distribution Grid */}
        <Text style={[styles.sectionHeading, { color: t.textMuted, marginTop: 14 }]}>
          TENANT STATUS DISTRIBUTION
        </Text>

        <View style={styles.distributionRow}>
          <Pressable
            onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'trial' })}
            style={({ pressed }) => [
              styles.distCard,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <View style={styles.distTop}>
              <Clock size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.distCount, { color: t.text }]}>
                {metrics?.trial_halls ?? '—'}
              </Text>
            </View>
            <Text style={[styles.distLabel, { color: t.textMuted }]}>Trial Halls</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'grace_period' })}
            style={({ pressed }) => [
              styles.distCard,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <View style={styles.distTop}>
              <AlertTriangle size={14} color={colors.status.warning.light} />
              <Text style={[styles.distCount, { color: colors.status.warning.light }]}>
                {metrics?.grace_halls ?? '—'}
              </Text>
            </View>
            <Text style={[styles.distLabel, { color: t.textMuted }]}>Grace Period</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'all' })}
            style={({ pressed }) => [
              styles.distCard,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <View style={styles.distTop}>
              <Clock size={14} color="#F59E0B" />
              <Text style={[styles.distCount, { color: '#F59E0B' }]}>
                {metrics?.expiring_soon ?? '—'}
              </Text>
            </View>
            <Text style={[styles.distLabel, { color: t.textMuted }]}>Expiring Soon</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('SuperAdminDirectory', { initialStatus: 'suspended' })}
            style={({ pressed }) => [
              styles.distCard,
              glassStyles.getCardStyle(isDark),
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <View style={styles.distTop}>
              <AlertTriangle size={14} color={colors.status.danger.light} />
              <Text style={[styles.distCount, { color: colors.status.danger.light }]}>
                {metrics?.suspended_halls ?? '—'}
              </Text>
            </View>
            <Text style={[styles.distLabel, { color: t.textMuted }]}>Suspended</Text>
          </Pressable>
        </View>

        {/* 3. Primary Operator Action Cards */}
        <Text style={[styles.sectionHeading, { color: t.textMuted, marginTop: 18 }]}>
          OPERATOR ACTIONS
        </Text>

        {/* Action 1: Provision New Hall (Bypass Mode) */}
        <Pressable
          onPress={() => navigation.navigate('SuperAdminProvision')}
          style={({ pressed }) => [
            styles.actionBanner,
            glassStyles.getCardStyle(isDark),
            { transform: [{ scale: pressed ? 0.965 : 1 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Provision new function hall"
        >
          <LinearGradient
            colors={colors.goldGradient}
            style={styles.actionIconBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <PlusCircle size={24} color="#FFFFFF" strokeWidth={2.4} />
          </LinearGradient>

          <View style={styles.actionTextCol}>
            <View style={styles.actionHeaderRow}>
              <Text style={[styles.actionTitle, { color: t.text }]}>
                Provision New Function Hall
              </Text>
              <View style={styles.bypassPill}>
                <Sparkles size={10} color="#10B981" />
                <Text style={styles.bypassPillText}>BYPASS MODE</Text>
              </View>
            </View>
            <Text style={[styles.actionSubtitle, { color: t.textMuted }]}>
              Instantly onboard a hall with lifetime free subscription bypass and owner auth credentials.
            </Text>
          </View>

          <ChevronRight size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
        </Pressable>

        {/* Action 2: Multi-Tenant Directory */}
        <Pressable
          onPress={() => navigation.navigate('SuperAdminDirectory')}
          style={({ pressed }) => [
            styles.actionBanner,
            glassStyles.getCardStyle(isDark),
            { marginTop: 12, transform: [{ scale: pressed ? 0.965 : 1 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Browse all halls directory"
        >
          <View
            style={[
              styles.actionIconBox,
              { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
            ]}
          >
            <Search size={22} color={isDark ? colors.gold[400] : colors.gold[600]} strokeWidth={2.4} />
          </View>

          <View style={styles.actionTextCol}>
            <Text style={[styles.actionTitle, { color: t.text }]}>
              All Halls Directory & Support
            </Text>
            <Text style={[styles.actionSubtitle, { color: t.textMuted }]}>
              Search across registered halls, toggle bypass status, extend trials, or view live calendars in Support Mode.
            </Text>
          </View>

          <ChevronRight size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
        </Pressable>

        {/* Switch to Tenant Mode */}
        <Pressable
          onPress={() => navigation.navigate('MainTabs')}
          style={({ pressed }) => [
            styles.tenantModeBtn,
            glassStyles.getCardStyle(isDark),
            { marginTop: 14, transform: [{ scale: pressed ? 0.965 : 1 }] },
          ]}
        >
          <Building2 size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
          <Text style={[styles.tenantModeText, { color: t.text }]}>
            Switch to Tenant App Mode (Dashboard)
          </Text>
          <ArrowRight size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 6,
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
    flex: 1,
  },
  headerEmblem: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTextCol: {
    justifyContent: 'center',
    flex: 1,
  },
  titleWithLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  operatorBadge: {
    backgroundColor: 'rgba(214, 174, 107, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.35)',
  },
  operatorBadgeText: {
    color: colors.gold[400],
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for bottom tab bar
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  distributionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  distCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
  },
  distTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  distLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    gap: 14,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bypassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  bypassPillText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  actionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  tenantModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
  },
  tenantModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

