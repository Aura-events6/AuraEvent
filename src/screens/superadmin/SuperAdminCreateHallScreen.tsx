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
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  User,
  Lock,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Check,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { superAdminCreateHall } from '../../services/superadminService';
import { CreateHallResponse, SlotModeType } from '../../types/superadmin';
import { ProvisionSuccessModal } from '../../components/superadmin';
import { GoldSwitch } from '../../components/GoldSwitch';

export const SuperAdminCreateHallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  // Form State
  const [hallName, setHallName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [slotMode, setSlotMode] = useState<SlotModeType>('two_slots');

  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [isSubscriptionExempt, setIsSubscriptionExempt] = useState(true);
  const [planType, setPlanType] = useState<'standard' | 'starter' | 'multi_hall'>('standard');

  const [loading, setLoading] = useState(false);
  const [provisionState, setProvisionState] = useState<'idle' | 'provisioning' | 'provisioned'>('idle');
  const [creationResult, setCreationResult] = useState<CreateHallResponse | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  // Submit Handler calling live Edge Function
  const handleProvisionHall = async () => {
    // Validations
    if (!hallName.trim()) {
      triggerShake();
      Alert.alert('Required Field', 'Please enter the Function Hall Name.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      triggerShake();
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      triggerShake();
      Alert.alert('Invalid Email', 'Please enter a valid owner email address.');
      return;
    }

    const cleanUsername = ownerUsername.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      triggerShake();
      Alert.alert('Invalid Username', 'Owner username must be at least 3 characters.');
      return;
    }

    if (!ownerPassword || ownerPassword.length < 6) {
      triggerShake();
      Alert.alert('Password Too Short', 'Initial password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setProvisionState('provisioning');

    try {
      const response = await superAdminCreateHall({
        hall_name: hallName.trim(),
        phone: cleanPhone,
        owner_email: ownerEmail.trim().toLowerCase(),
        owner_password: ownerPassword,
        owner_username: cleanUsername,
        address: address.trim() || undefined,
        slot_mode: slotMode,
        is_subscription_exempt: isSubscriptionExempt,
        plan_type: planType,
      });

      setCreationResult(response);
      setProvisionState('provisioned');
      setTimeout(() => {
        setIsSuccessModalOpen(true);
        setProvisionState('idle');
      }, 700);
    } catch (err: any) {
      console.warn('[SuperAdminCreateHall] Error provisioning hall:', err);
      setProvisionState('idle');
      Alert.alert('Provisioning Error', err?.message || 'Failed to provision hall.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsSuccessModalOpen(false);
    navigation.navigate('SuperAdminHallsList');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
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
        )}

        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: t.text }]}>Provision Function Hall</Text>
          <Text style={[styles.headerSub, { color: t.textMuted }]}>
            Manual Onboarding with Subscription Bypass
          </Text>
        </View>

        <View style={styles.bypassHeaderBadge}>
          <Sparkles size={11} color="#10B981" />
          <Text style={styles.bypassHeaderBadgeText}>BYPASS</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            {/* Section 1: Hall Information */}
          <View style={[styles.formSection, glassStyles.getCardStyle(isDark)]}>
            <View style={styles.sectionHeader}>
              <Building size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                1. Function Hall Profile
              </Text>
            </View>

            {/* Hall Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: t.textMuted }]}>Hall Name *</Text>
              <TextInput
                value={hallName}
                onChangeText={setHallName}
                placeholder="e.g. Royal Palace Convention Center"
                placeholderTextColor={t.textSubtle}
                style={[styles.input, glassStyles.getInputStyle(isDark), { color: t.text }]}
              />
            </View>

            {/* Primary Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: t.textMuted }]}>
                Registered Contact Phone (10 digits) *
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 9886044521"
                placeholderTextColor={t.textSubtle}
                keyboardType="phone-pad"
                maxLength={10}
                style={[styles.input, glassStyles.getInputStyle(isDark), { color: t.text }]}
              />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: t.textMuted }]}>Address / City</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Outer Ring Road, Mahadevapura, Bengaluru"
                placeholderTextColor={t.textSubtle}
                style={[styles.input, glassStyles.getInputStyle(isDark), { color: t.text }]}
              />
            </View>

            {/* Slot Mode */}
            <Text style={[styles.label, { color: t.textMuted, marginTop: 4 }]}>
              Booking Slot Timing Mode
            </Text>
            <View style={styles.chipsRow}>
              <Pressable
                onPress={() => setSlotMode('two_slots')}
                style={({ pressed }) => [
                  styles.slotChip,
                  slotMode === 'two_slots'
                    ? {
                        backgroundColor: isDark ? colors.gold[400] : colors.gold[600],
                        borderColor: isDark ? colors.gold[400] : colors.gold[600],
                      }
                    : {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      },
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <Text
                  style={[
                    styles.slotChipText,
                    { color: slotMode === 'two_slots' ? '#FFFFFF' : t.text },
                  ]}
                >
                  Two Slots (Morning / Evening)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSlotMode('full_day')}
                style={({ pressed }) => [
                  styles.slotChip,
                  slotMode === 'full_day'
                    ? {
                        backgroundColor: isDark ? colors.gold[400] : colors.gold[600],
                        borderColor: isDark ? colors.gold[400] : colors.gold[600],
                      }
                    : {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                      },
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <Text
                  style={[
                    styles.slotChipText,
                    { color: slotMode === 'full_day' ? '#FFFFFF' : t.text },
                  ]}
                >
                  Full Day Only
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Section 2: Owner Credentials */}
          <View style={[styles.formSection, glassStyles.getCardStyle(isDark)]}>
            <View style={styles.sectionHeader}>
              <User size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                2. Owner Auth Credentials
              </Text>
            </View>

            {/* Owner Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: t.textMuted }]}>Owner Email *</Text>
              <TextInput
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                placeholder="e.g. owner@royalpalace.com"
                placeholderTextColor={t.textSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, glassStyles.getInputStyle(isDark), { color: t.text }]}
              />
            </View>

            {/* Owner Username */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: t.textMuted }]}>
                Owner Username (for display & staff login) *
              </Text>
              <TextInput
                value={ownerUsername}
                onChangeText={setOwnerUsername}
                placeholder="e.g. rajesh_owner"
                placeholderTextColor={t.textSubtle}
                autoCapitalize="none"
                style={[styles.input, glassStyles.getInputStyle(isDark), { color: t.text }]}
              />
            </View>

            {/* Initial Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: t.textMuted }]}>
                Initial Password (minimum 6 characters) *
              </Text>
              <TextInput
                value={ownerPassword}
                onChangeText={setOwnerPassword}
                placeholder="e.g. Welcome@2026"
                placeholderTextColor={t.textSubtle}
                secureTextEntry
                style={[styles.input, glassStyles.getInputStyle(isDark), { color: t.text }]}
              />
            </View>
          </View>

          {/* Section 3: Commercial Policy & Bypass Switch */}
          <View style={[styles.formSection, glassStyles.getCardStyle(isDark)]}>
            <View style={styles.sectionHeader}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                3. Commercial Policy & Paywall Bypass
              </Text>
            </View>

            {/* Subscription Bypass Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <View style={styles.switchLabelRow}>
                  <Text style={[styles.switchLabel, { color: t.text }]}>
                    Subscription Bypass Switch
                  </Text>
                  <View style={styles.exemptBadge}>
                    <Text style={styles.exemptBadgeText}>LIFETIME FREE</Text>
                  </View>
                </View>
                <Text style={[styles.switchSub, { color: t.textMuted }]}>
                  Exempt hall from standard paywall barriers. The owner can book events permanently without trial expiry gates.
                </Text>
              </View>

              <GoldSwitch
                value={isSubscriptionExempt}
                onValueChange={setIsSubscriptionExempt}
              />
            </View>

            {/* Plan Tier Selector */}
            <Text style={[styles.label, { color: t.textMuted, marginTop: 14 }]}>
              Designated Commercial Tier
            </Text>
            <View style={styles.chipsRow}>
              {(['standard', 'starter', 'multi_hall'] as const).map(tier => (
                <Pressable
                  key={tier}
                  onPress={() => setPlanType(tier)}
                  style={({ pressed }) => [
                    styles.tierChip,
                    planType === tier
                      ? {
                          backgroundColor: isDark ? colors.gold[400] : colors.gold[600],
                          borderColor: isDark ? colors.gold[400] : colors.gold[600],
                        }
                      : {
                          backgroundColor: isDark ? colors.dark.input : colors.light.input,
                          borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
                        },
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                  ]}
                >
                  <Text
                    style={[
                      styles.tierChipText,
                      { color: planType === tier ? '#FFFFFF' : t.text },
                    ]}
                  >
                    {tier === 'standard'
                      ? 'Standard (₹7,999/yr)'
                      : tier === 'starter'
                      ? 'Starter (₹4,499/yr)'
                      : 'Multi-Hall'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Provision Button */}
          <Pressable
            onPress={handleProvisionHall}
            disabled={loading || provisionState !== 'idle'}
            style={({ pressed }) => [
              styles.submitWrapper,
              { transform: [{ scale: pressed && provisionState === 'idle' ? 0.965 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={provisionState === 'provisioned' ? ['#059669', '#10B981'] : colors.goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {provisionState === 'provisioning' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Provisioning Hall...</Text>
                </View>
              ) : provisionState === 'provisioned' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.submitBtnText}>Provisioned Successfully ✓</Text>
                </View>
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.submitBtnText}>Provision Hall & Bypass Paywall</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <ProvisionSuccessModal
        visible={isSuccessModalOpen}
        onClose={handleModalClose}
        creationData={creationResult}
        rawPassword={ownerPassword}
        isDark={isDark}
      />
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
  bypassHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  bypassHeaderBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110, // Space for floating bottom tab bar
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  formSection: {
    padding: 18,
    borderRadius: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tierChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  switchTextCol: {
    flex: 1,
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  exemptBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exemptBadgeText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  switchSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  submitWrapper: {
    marginTop: 6,
    marginBottom: 30,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

