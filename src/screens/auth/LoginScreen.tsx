import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Mail,
  Lock,
  Moon,
  Sun,
  ArrowRight,
  ShieldCheck,
  Building,
  UserCheck,
  Phone,
  User,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { AuthInput, PrimaryButton, RoleBadge } from '../../components';
import { AuthStackParamList } from '../../types';
import {
  supabase,
  SecureStorage,
  AURA_DEVICE_SESSION_TOKEN_KEY,
} from '../../lib/supabase';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LAST_HALL_PHONE_STORAGE_KEY = 'aura_last_hall_phone';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { theme, toggleTheme, loginWithCredentials } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  // Tabs: 'owner' = Owner / Admin, 'staff' = Staff Login
  const [loginMode, setLoginMode] = useState<'owner' | 'staff'>('owner');

  // Owner credentials
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Staff credentials
  const [staffHallPhone, setStaffHallPhone] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const iconColor = isDark ? '#A1A1AA' : '#78716C';

  // Micro-interaction: Animated sliding tab indicator
  const tabAnim = useRef(new Animated.Value(0)).current; // 0: owner, 1: staff

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: loginMode === 'owner' ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [loginMode]);

  // Micro-interaction: Animated error shake & fade reveal
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const errorFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      errorFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(errorFadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(errorShakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
          Animated.timing(errorShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [error]);

  // Task 1: Auto-load the last used Hall Phone number on screen mount
  useEffect(() => {
    const loadLastHallPhone = async () => {
      try {
        const savedPhone = await AsyncStorage.getItem(LAST_HALL_PHONE_STORAGE_KEY);
        if (savedPhone) {
          setStaffHallPhone(savedPhone);
        }
      } catch (e) {
        console.warn('Error reading saved hall phone:', e);
      }
    };
    loadLastHallPhone();
  }, []);

  // Handle Owner Sign In
  const handleOwnerLogin = async () => {
    if (!ownerEmail.trim() || !ownerPassword.trim()) {
      setError('Please enter your email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await loginWithCredentials(ownerEmail.trim(), ownerPassword);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Sign In (Task 1: Supabase RPC resolve_staff_login_email + signInWithPassword)
  const handleStaffLogin = async () => {
    const cleanPhone = staffHallPhone.trim();
    const cleanUsername = staffUsername.trim().toLowerCase();

    if (!cleanPhone) {
      setError('Please enter the Hall Phone Number');
      Alert.alert('Missing Field', 'Please enter your Hall Phone Number');
      return;
    }
    if (!cleanUsername) {
      setError('Please enter your Staff Username');
      Alert.alert('Missing Field', 'Please enter your Staff Username');
      return;
    }
    if (!staffPassword.trim()) {
      setError('Please enter your Password');
      Alert.alert('Missing Field', 'Please enter your Password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Call public Supabase RPC resolve_staff_login_email
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
        'resolve_staff_login_email',
        {
          p_hall_identifier: cleanPhone,
          p_username: cleanUsername,
        }
      );

      if (!resolvedEmail || rpcError) {
        setLoading(false);
        const notFoundMsg =
          'Staff account not found. Please verify your Hall Phone Number and Username.';
        setError(notFoundMsg);
        Alert.alert('Staff Account Not Found', notFoundMsg);
        return;
      }

      // 2. Sign in with Supabase Auth using the resolved shadow email
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: staffPassword,
      });

      if (authError || !data?.user) {
        setLoading(false);
        const errMsg = authError?.message || 'Invalid password or credentials';
        setError(errMsg);
        Alert.alert('Sign In Failed', errMsg);
        return;
      }

      // 3. Strict Staff Role & Active Status Check against Database
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('id, role, is_active, screen_access')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (memberErr || !member) {
        await supabase.auth.signOut();
        setLoading(false);
        const notFoundMsg = 'Staff record not found. Please contact the Hall Owner.';
        setError(notFoundMsg);
        Alert.alert('Access Denied', notFoundMsg);
        return;
      }

      if (member.role !== 'staff') {
        await supabase.auth.signOut();
        setLoading(false);
        const roleMsg =
          'Access Denied: This account has Owner privileges. Please sign in via the Owner Login tab.';
        setError(roleMsg);
        Alert.alert('Access Denied', roleMsg);
        return;
      }

      if (!member.is_active) {
        await supabase.auth.signOut();
        setLoading(false);
        const deactMsg =
          'This staff account has been deactivated. Please contact the Hall Owner.';
        setError(deactMsg);
        Alert.alert('Account Deactivated', deactMsg);
        return;
      }

      // 3. On success: Save hall phone to storage & call refresh_active_device_session
      try {
        await AsyncStorage.setItem(LAST_HALL_PHONE_STORAGE_KEY, cleanPhone);
      } catch (storeErr) {
        console.warn('Error saving last hall phone:', storeErr);
      }

      try {
        const { data: newToken } = await supabase.rpc('refresh_active_device_session', {
          p_push_token: null,
        });
        if (newToken) {
          await SecureStorage.setItem(AURA_DEVICE_SESSION_TOKEN_KEY, newToken);
        }
      } catch (deviceSessionErr) {
        console.warn('Failed to refresh active device session:', deviceSessionErr);
      }
    } catch (err: any) {
      setError(err?.message || 'Login error occurred');
      Alert.alert('Error', err?.message || 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isMobile ? 16 : 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Brand & Theme Toggle */}
          <View style={styles.topBar}>
            <View style={styles.brandTag}>
              <View style={styles.liveDot} />
              <Text
                style={[
                  styles.liveText,
                  {
                    color: isDark
                      ? colors.status.success.dark
                      : colors.status.success.light,
                  },
                ]}
              >
                Aura Cloud • Supabase Live
              </Text>
            </View>

            <Pressable
              onPress={toggleTheme}
              style={({ pressed }) => [
                styles.iconButton,
                glassStyles.getCardStyle(isDark),
                { transform: [{ scale: pressed ? 0.90 : 1 }] },
              ]}
              accessibilityLabel="Toggle theme"
            >
              {isDark ? (
                <Sun size={18} color={colors.gold[400]} />
              ) : (
                <Moon size={18} color={colors.gold[600]} />
              )}
            </Pressable>
          </View>

          {/* Brand Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={colors.goldGradient}
              style={styles.logoBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Crown size={28} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.title, { color: t.text }]}>Aura Portal</Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              Function Hall & Convention Booking Platform
            </Text>
          </View>

          {/* Login Form Card */}
          <View
            style={[
              styles.formCard,
              glassStyles.getCardStyle(isDark),
              { padding: isMobile ? 16 : 22 },
            ]}
          >
            <Text style={[styles.formTitle, { color: t.text }]}>Account Login</Text>

            {/* Micro-interaction: Animated Sliding Segmented Control */}
            <View
              style={[
                styles.tabSelectorContainer,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.slidingIndicator,
                  {
                    left: tabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['1%', '50.5%'],
                    }),
                    backgroundColor:
                      loginMode === 'owner'
                        ? isDark
                          ? 'rgba(229, 184, 66, 0.18)'
                          : 'rgba(198, 151, 73, 0.18)'
                        : isDark
                        ? 'rgba(96, 165, 250, 0.18)'
                        : 'rgba(37, 99, 235, 0.14)',
                    borderColor:
                      loginMode === 'owner'
                        ? isDark
                          ? colors.gold[500]
                          : colors.gold[600]
                        : isDark
                        ? '#60A5FA'
                        : '#2563EB',
                  },
                ]}
              />

              <Pressable
                onPress={() => {
                  setLoginMode('owner');
                  setError('');
                }}
                style={({ pressed }) => [
                  styles.tabButton,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Crown
                  size={15}
                  color={
                    loginMode === 'owner'
                      ? isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                      : t.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color:
                        loginMode === 'owner'
                          ? isDark
                            ? colors.gold[400]
                            : colors.gold[600]
                          : t.textMuted,
                      fontWeight: loginMode === 'owner' ? '700' : '500',
                    },
                  ]}
                >
                  Owner / Admin
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setLoginMode('staff');
                  setError('');
                }}
                style={({ pressed }) => [
                  styles.tabButton,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <UserCheck
                  size={15}
                  color={loginMode === 'staff' ? (isDark ? '#60A5FA' : '#2563EB') : t.textMuted}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color:
                        loginMode === 'staff'
                          ? isDark
                            ? '#60A5FA'
                            : '#2563EB'
                          : t.textMuted,
                      fontWeight: loginMode === 'staff' ? '700' : '500',
                    },
                  ]}
                >
                  Staff Login
                </Text>
              </Pressable>
            </View>

            {/* Form Fields: Owner vs Staff */}
            {loginMode === 'staff' ? (
              <>
                <AuthInput
                  label="Hall Phone Number *"
                  value={staffHallPhone}
                  onChangeText={setStaffHallPhone}
                  placeholder="e.g. 9886044521"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  leftIcon={<Phone size={18} color={iconColor} />}
                  showClearButton
                  onClear={() => setStaffHallPhone('')}
                />

                <AuthInput
                  label="Staff Username *"
                  value={staffUsername}
                  onChangeText={(val) => setStaffUsername(val.toLowerCase())}
                  placeholder="e.g. rahul_reception"
                  autoCapitalize="none"
                  leftIcon={<User size={18} color={iconColor} />}
                  showClearButton
                  onClear={() => setStaffUsername('')}
                />

                <AuthInput
                  label="Password *"
                  value={staffPassword}
                  onChangeText={setStaffPassword}
                  placeholder="••••••••"
                  isPassword
                  leftIcon={<Lock size={18} color={iconColor} />}
                />
              </>
            ) : (
              <>
                <AuthInput
                  label="Owner / Admin Email *"
                  value={ownerEmail}
                  onChangeText={setOwnerEmail}
                  placeholder="e.g. owner@aura.app"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  leftIcon={<Mail size={18} color={iconColor} />}
                  showClearButton
                  onClear={() => setOwnerEmail('')}
                />

                <AuthInput
                  label="Password *"
                  value={ownerPassword}
                  onChangeText={setOwnerPassword}
                  placeholder="••••••••"
                  isPassword
                  leftIcon={<Lock size={18} color={iconColor} />}
                />
              </>
            )}

            {Boolean(error) && (
              <Animated.View
                style={[
                  styles.errorContainer,
                  {
                    opacity: errorFadeAnim,
                    transform: [{ translateX: errorShakeAnim }],
                  },
                ]}
              >
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <PrimaryButton
              title={loading ? 'Signing In...' : 'Sign In'}
              onPress={loginMode === 'staff' ? handleStaffLogin : handleOwnerLogin}
              loading={loading}
              disabled={loading}
              style={{ marginTop: 8 }}
            />

            {/* Day 0 Hall Registration Link */}
            <Pressable
              onPress={() => navigation.navigate('RegisterHall')}
              style={({ pressed }) => [
                styles.registerLinkContainer,
                { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Building size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={styles.registerLinkText}>
                New Hall Owner?{' '}
                <Text
                  style={[
                    styles.registerLinkBold,
                    { color: isDark ? colors.gold[400] : colors.gold[600] },
                  ]}
                >
                  Register Hall (Day 0)
                </Text>
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: t.textMuted }]}>
              Protected by PostgreSQL 17 RLS & End-to-End Encryption
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 8,
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#C69749',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  demoBanner: {
    borderRadius: 20,
    marginBottom: 20,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  demoHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  demoSubtext: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  demoPillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demoButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoButtonSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  formCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  tabSelectorContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
    minHeight: 48,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 40,
    zIndex: 1,
  },
  tabButtonText: {
    fontSize: 13,
  },
  errorContainer: {
    paddingVertical: 6,
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  registerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 8,
    minHeight: 44,
  },
  registerLinkText: {
    fontSize: 13,
    color: 'rgba(128, 128, 128, 0.8)',
  },
  registerLinkBold: {
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
