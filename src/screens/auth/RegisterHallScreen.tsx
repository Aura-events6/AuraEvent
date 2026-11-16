import React, { useState, useRef, useEffect } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import {
  Building2,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Building,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { AuthInput, PrimaryButton, SecondaryButton } from '../../components';
import { AuthStackParamList, SlotMode } from '../../types';

type RegisterHallNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'RegisterHall'
>;

export const RegisterHallScreen: React.FC = () => {
  const navigation = useNavigation<RegisterHallNavigationProp>();
  const { theme, registerHall } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;
  const isNarrow = windowWidth < 380;

  // Step state: 1 = Venue details, 2 = Owner credentials
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1: Hall & Venue Details & Slot Mode
  const [hallName, setHallName] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState('1000');
  const [address, setAddress] = useState('');
  const [slotMode, setSlotMode] = useState<SlotMode>('two-slot');

  // Step 2: Owner Account Credentials & Password
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const iconColor = isDark ? '#A1A1AA' : '#78716C';

  // Micro-interaction: Animated step transition slide & fade
  const stepAnim = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef<1 | 2>(currentStep);

  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep;
      stepAnim.setValue(0);
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep, stepAnim]);

  // Micro-interaction: Animated shake & fade on error
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const errorFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      errorFadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(errorFadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
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

  const validateStep1 = () => {
    if (!hallName.trim()) {
      setError('Please enter your hall or venue name');
      return false;
    }
    if (!city.trim()) {
      setError('Please enter the city for your venue');
      return false;
    }
    setError('');
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!ownerName.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all owner credential fields marked with *');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await registerHall({
        hallName: hallName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        address: address.trim() || `${city.trim() || 'City Center'} Main Road`,
        city: city.trim() || 'Bengaluru',
        slotMode,
        capacity: parseInt(capacity, 10) || 800,
      });

      if (res.success) {
        navigation.navigate('PinSetup', { fromRegistration: true });
      } else {
        setError(res.error || 'Failed to register hall. Please check details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: isMobile ? 16 : 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Back button */}
          <View style={styles.topNav}>
            <Pressable
              onPress={() => {
                if (currentStep === 2) {
                  handlePrevStep();
                } else {
                  navigation.goBack();
                }
              }}
              style={({ pressed }) => [
                styles.backButton,
                glassStyles.getCardStyle(isDark),
                { transform: [{ scale: pressed ? 0.90 : 1 }] },
              ]}
              accessibilityLabel={currentStep === 2 ? 'Go to step 1' : 'Back to login'}
            >
              <ArrowLeft size={20} color={t.text} />
            </Pressable>
            <Text style={[styles.topNavTitle, { color: t.text }]}>Register Your Hall</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 14-Day Trial Banner */}
          <View
            style={[
              styles.trialBanner,
              {
                backgroundColor: isDark ? 'rgba(229, 184, 66, 0.1)' : 'rgba(198, 151, 73, 0.12)',
                borderColor: isDark ? 'rgba(229, 184, 66, 0.25)' : 'rgba(198, 151, 73, 0.35)',
                padding: isMobile ? 12 : 16,
              },
            ]}
          >
            <View
              style={[
                styles.trialIconWrapper,
                {
                  backgroundColor: isDark ? 'rgba(229, 184, 66, 0.15)' : 'rgba(198, 151, 73, 0.20)',
                },
              ]}
            >
              <Sparkles size={20} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.trialTitle,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                Day 0 Setup • 14-Day Free Trial
              </Text>
              <Text style={[styles.trialSubtitle, { color: t.textMuted }]}>
                No credit card required. Full access to calendar, WhatsApp billing, and Khatabook.
              </Text>
            </View>
          </View>

          {/* 2-Step Wizard Indicator */}
          <View style={[styles.wizardContainer, glassStyles.getCardStyle(isDark)]}>
            <Pressable
              onPress={() => {
                setError('');
                setCurrentStep(1);
              }}
              style={({ pressed }) => [
                styles.stepItem,
                currentStep === 1 && {
                  borderColor: isDark ? colors.gold[500] : colors.gold[600],
                  backgroundColor: isDark ? 'rgba(229, 184, 66, 0.14)' : 'rgba(198, 151, 73, 0.16)',
                },
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor:
                      currentStep === 1
                        ? colors.gold[500]
                        : isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(28, 25, 23, 0.08)',
                  },
                ]}
              >
                <Building
                  size={13}
                  color={currentStep === 1 ? '#FFFFFF' : t.textMuted}
                />
              </View>
              <View style={styles.stepTextWrapper}>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color:
                        currentStep === 1
                          ? isDark
                            ? colors.gold[400]
                            : colors.gold[600]
                          : t.textMuted,
                      fontWeight: currentStep === 1 ? '700' : '500',
                    },
                  ]}
                >
                  Step 1
                </Text>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: t.text,
                      fontWeight: currentStep === 1 ? '700' : '500',
                      fontSize: isNarrow ? 11 : 12,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Venue Details
                </Text>
              </View>
            </Pressable>

            <View
              style={[
                styles.stepConnector,
                {
                  backgroundColor:
                    currentStep === 2
                      ? colors.gold[500]
                      : isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(28, 25, 23, 0.15)',
                },
              ]}
            />

            <Pressable
              onPress={() => {
                if (validateStep1()) {
                  setCurrentStep(2);
                }
              }}
              style={({ pressed }) => [
                styles.stepItem,
                currentStep === 2 && {
                  borderColor: isDark ? colors.gold[500] : colors.gold[600],
                  backgroundColor: isDark ? 'rgba(229, 184, 66, 0.14)' : 'rgba(198, 151, 73, 0.16)',
                },
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor:
                      currentStep === 2
                        ? colors.gold[500]
                        : isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(28, 25, 23, 0.08)',
                  },
                ]}
              >
                <ShieldCheck
                  size={13}
                  color={currentStep === 2 ? '#FFFFFF' : t.textMuted}
                />
              </View>
              <View style={styles.stepTextWrapper}>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color:
                        currentStep === 2
                          ? isDark
                            ? colors.gold[400]
                            : colors.gold[600]
                          : t.textMuted,
                      fontWeight: currentStep === 2 ? '700' : '500',
                    },
                  ]}
                >
                  Step 2
                </Text>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: t.text,
                      fontWeight: currentStep === 2 ? '700' : '500',
                      fontSize: isNarrow ? 11 : 12,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Owner Account
                </Text>
              </View>
            </Pressable>
          </View>

          {/* STEP 1: Hall & Venue Details */}
          {currentStep === 1 && (
            <Animated.View
              style={[
                styles.formCard,
                glassStyles.getCardStyle(isDark),
                { padding: isMobile ? 16 : 22 },
                {
                  opacity: stepAnim,
                  transform: [
                    {
                      translateY: stepAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.stepCardHeader}>
                <Text style={[styles.sectionHeading, { color: t.text }]}>
                  1. Venue & Slot Details
                </Text>
                <Text style={[styles.stepHint, { color: t.textMuted }]}>
                  Configure your venue capacity and daily booking schedule
                </Text>
              </View>

              <AuthInput
                label="Hall / Venue Name *"
                value={hallName}
                onChangeText={setHallName}
                placeholder="e.g. Royal Grand Palace & Convention"
                leftIcon={<Building2 size={18} color={iconColor} />}
                showClearButton
                onClear={() => setHallName('')}
              />

              <View style={[styles.row, isNarrow && styles.rowStacked]}>
                <View style={isNarrow ? styles.fullCol : styles.halfCol}>
                  <AuthInput
                    label="City *"
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Hyderabad"
                    leftIcon={<MapPin size={18} color={iconColor} />}
                  />
                </View>
                {!isNarrow && <View style={{ width: 12 }} />}
                <View style={isNarrow ? styles.fullCol : styles.halfCol}>
                  <AuthInput
                    label="Guest Capacity"
                    value={capacity}
                    onChangeText={setCapacity}
                    placeholder="e.g. 1200"
                    keyboardType="numeric"
                    leftIcon={<Users size={18} color={iconColor} />}
                  />
                </View>
              </View>

              <AuthInput
                label="Full Address / Landmark"
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Ring Road, Near Metro Pillar 12"
                leftIcon={<MapPin size={18} color={iconColor} />}
              />

              {/* Slot Mode Selection */}
              <Text style={[styles.fieldLabel, { color: isDark ? '#D4D4D8' : '#44403C' }]}>
                Daily Slot Configuration *
              </Text>
              <View style={styles.slotToggleContainer}>
                <Pressable
                  onPress={() => setSlotMode('two-slot')}
                  style={({ pressed }) => [
                    styles.slotOption,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.85)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(198, 151, 73, 0.28)',
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                    slotMode === 'two-slot' && styles.slotOptionActive,
                  ]}
                >
                  <View style={styles.slotRadioHeader}>
                    <Text
                      style={[
                        styles.slotOptionTitle,
                        { color: t.text },
                        slotMode === 'two-slot' && {
                          color: isDark ? colors.gold[400] : colors.gold[600],
                        },
                      ]}
                    >
                      Two-Slot System
                    </Text>
                    {slotMode === 'two-slot' && (
                      <CheckCircle2
                        size={16}
                        color={isDark ? colors.gold[400] : colors.gold[600]}
                      />
                    )}
                  </View>
                  <Text style={[styles.slotOptionDesc, { color: t.textMuted }]}>
                    Morning (7 AM - 3 PM) + Evening (5 PM - 11 PM) slots per day
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSlotMode('full-day')}
                  style={({ pressed }) => [
                    styles.slotOption,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.85)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(198, 151, 73, 0.28)',
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                    slotMode === 'full-day' && styles.slotOptionActive,
                  ]}
                >
                  <View style={styles.slotRadioHeader}>
                    <Text
                      style={[
                        styles.slotOptionTitle,
                        { color: t.text },
                        slotMode === 'full-day' && {
                          color: isDark ? colors.gold[400] : colors.gold[600],
                        },
                      ]}
                    >
                      Full-Day Only
                    </Text>
                    {slotMode === 'full-day' && (
                      <CheckCircle2
                        size={16}
                        color={isDark ? colors.gold[400] : colors.gold[600]}
                      />
                    )}
                  </View>
                  <Text style={[styles.slotOptionDesc, { color: t.textMuted }]}>
                    Single comprehensive 24-hr booking per calendar date
                  </Text>
                </Pressable>
              </View>

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
                title="Continue to Owner Details →"
                onPress={handleNextStep}
                style={{ marginTop: 10 }}
              />
            </Animated.View>
          )}

          {/* STEP 2: Owner Account Credentials */}
          {currentStep === 2 && (
            <Animated.View
              style={[
                styles.formCard,
                glassStyles.getCardStyle(isDark),
                { padding: isMobile ? 16 : 22 },
                {
                  opacity: stepAnim,
                  transform: [
                    {
                      translateY: stepAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.stepCardHeader}>
                <Text style={[styles.sectionHeading, { color: t.text }]}>
                  2. Owner Account Credentials
                </Text>
                <Text style={[styles.stepHint, { color: t.textMuted }]}>
                  Your primary administrator login and security key
                </Text>
              </View>

              <AuthInput
                label="Owner Full Name *"
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="e.g. Rajesh Patil"
                leftIcon={<User size={18} color={iconColor} />}
              />

              <AuthInput
                label="Owner Mobile Number *"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98860 12345"
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color={iconColor} />}
              />

              <AuthInput
                label="Owner Email Address *"
                value={email}
                onChangeText={setEmail}
                placeholder="owner@yourhall.com"
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={18} color={iconColor} />}
              />

              <AuthInput
                label="Master Password *"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                isPassword
                leftIcon={<Lock size={18} color={iconColor} />}
              />

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

              {/* Responsive Action Buttons: Stacked on Mobile, Inline on Desktop */}
              {isMobile ? (
                <View style={styles.mobileActionsCol}>
                  <PrimaryButton
                    title="Create Hall & Continue"
                    onPress={handleSubmit}
                    loading={loading}
                  />
                  <SecondaryButton
                    title="← Back to Step 1"
                    onPress={handlePrevStep}
                    disabled={loading}
                    style={{ marginTop: 10 }}
                  />
                </View>
              ) : (
                <View style={styles.desktopActionsRow}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton
                      title="← Back to Step 1"
                      onPress={handlePrevStep}
                      disabled={loading}
                    />
                  </View>
                  <View style={{ width: 14 }} />
                  <View style={{ flex: 1.5 }}>
                    <PrimaryButton
                      title="Create Hall & Continue"
                      onPress={handleSubmit}
                      loading={loading}
                    />
                  </View>
                </View>
              )}
            </Animated.View>
          )}
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
    paddingTop: Platform.OS === 'android' ? 24 : 10,
    paddingBottom: 60,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  trialIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  trialSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  wizardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextWrapper: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontWeight: '600',
  },
  stepConnector: {
    width: 14,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 2,
  },
  formCard: {
    borderRadius: 20,
    marginBottom: 20,
  },
  stepCardHeader: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowStacked: {
    flexDirection: 'column',
  },
  halfCol: {
    flex: 1,
  },
  fullCol: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  slotToggleContainer: {
    gap: 10,
    marginBottom: 16,
  },
  slotOption: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  slotOptionActive: {
    borderColor: colors.gold[500],
    backgroundColor: 'rgba(229, 184, 66, 0.12)',
  },
  slotRadioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  slotOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorContainer: {
    paddingVertical: 4,
    marginBottom: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  mobileActionsCol: {
    width: '100%',
    marginTop: 8,
  },
  desktopActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
});
