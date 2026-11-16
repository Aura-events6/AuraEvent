import React, { useRef } from 'react';
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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck,
  Moon,
  Sun,
  LogOut,
  Shield,
  ChevronRight,
  Database,
  Cpu,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { GoldSwitch, RoleBadge } from '../../components';

export const SuperAdminSettingsScreen: React.FC = () => {
  const { user, theme, toggleTheme, lockApp, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  const initials = (user?.name || 'Super Admin')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
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
              <ShieldCheck size={22} color="#FFFFFF" strokeWidth={2.4} />
            </LinearGradient>
            <View style={styles.brandTextCol}>
              <Text style={[styles.headerTitle, { color: t.text }]}>Platform Settings</Text>
              <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
                Operator Identity & System Controls
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: isMobile ? 16 : 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* OPERATOR ACCOUNT PROFILE CARD */}
        <View style={[styles.profileCard, glassStyles.getCardStyle(isDark)]}>
          <LinearGradient colors={colors.goldGradient} style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: t.text }]} numberOfLines={1}>
                {user?.name || 'Master SuperAdmin'}
              </Text>
              <RoleBadge role="superadmin" />
            </View>
            <Text style={[styles.profileEmail, { color: t.textMuted }]} numberOfLines={1}>
              {user?.email || 'admin@aurahalls.com'}
            </Text>
            <View style={styles.liveStatusRow}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveStatusText, { color: colors.status.success.dark }]}>
                Root Operator Session Active
              </Text>
            </View>
          </View>
        </View>

        {/* APPEARANCE */}
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

        {/* PLATFORM & INFRASTRUCTURE */}
        <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
          Platform Infrastructure
        </Text>
        <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
          <View
            style={[
              styles.infoRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)' },
            ]}
          >
            <View style={styles.rowWithIcon}>
              <View
                style={[
                  styles.menuIconBox,
                  { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                ]}
              >
                <Database size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: t.text }]}>Database Cluster</Text>
                <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                  Supabase PostgreSQL 17.2 • Live Production
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: isDark
                    ? colors.status.success.bgDark
                    : colors.status.success.bgLight,
                },
              ]}
            >
              <Text style={[styles.badgePillText, { color: colors.status.success.dark }]}>
                Connected
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.rowWithIcon}>
              <View
                style={[
                  styles.menuIconBox,
                  { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                ]}
              >
                <Cpu size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: t.text }]}>Back-Office Version</Text>
                <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                  Aura SuperAdmin Engine 2.4.0 (Phase 7A)
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.15)'
                    : 'rgba(198, 151, 73, 0.18)',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                v2.4
              </Text>
            </View>
          </View>
        </View>

        {/* SECURITY & SESSION */}
        <Text style={[styles.sectionEyebrow, { color: t.textSubtle }]}>
          Security & Session
        </Text>
        <View style={[styles.groupedList, glassStyles.getCardStyle(isDark)]}>
          <Pressable
            onPress={lockApp}
            style={({ pressed }) => [
              styles.listRow,
              {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(198,151,73,0.1)',
                transform: [{ scale: pressed ? 0.965 : 1 }],
              },
            ]}
          >
            <View style={styles.rowWithIcon}>
              <View
                style={[
                  styles.menuIconBox,
                  { backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg },
                ]}
              >
                <Lock size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: t.text }]}>Lock Console</Text>
                <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                  Require passcode PIN on app resume
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={t.textSubtle} />
          </Pressable>

          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.listRow,
              { transform: [{ scale: pressed ? 0.965 : 1 }] },
            ]}
          >
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
                  Sign Out from Operator Console
                </Text>
                <Text style={[styles.rowSubtitle, { color: t.textMuted }]}>
                  Terminate active master session safely
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={t.textSubtle} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingBottom: 10,
    zIndex: 10,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmblem: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100, // Space for bottom tab bar
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 18,
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
    flexShrink: 1,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '500',
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupedList: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

