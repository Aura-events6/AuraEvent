import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  LayoutAnimation,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Smartphone,
  Banknote,
  CreditCard,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import {
  BookingStepIndicator,
  BookingSummaryCard,
  CustomSelectModal,
  SelectOption,
  DynamicExpensesList,
  DynamicExpenseItem,
  FinancialLedgerCard,
  BookingSuccessModal,
} from '../../components/booking';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import {
  createBookingAtomic,
  editBookingAtomic,
  fetchBookingDetails,
  fetchActivePackages,
  checkSlotAvailability,
  searchCustomers,
  SlotAvailabilityResult,
} from '../../services/bookingService';
import { BookingSlot } from '../../types/calendar';
import { PackageItem } from '../../types/booking';
import {
  formatCurrency,
  formatLocalDate,
  isSlotElapsed,
  getTomorrowDate,
} from '../../utils/dateUtils';
import { motionTokens } from '../../theme/motion';

type BookingFormRouteParams = {
  mode: 'create' | 'edit';
  initialDate?: string;
  initialSlot?: BookingSlot;
  bookingId?: string;
  wasElapsedNotice?: boolean;
  initialCustomerName?: string;
  initialCustomerMobile?: string;
};

const DEFAULT_EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Birthday Party', 'Corporate Event'];

const SLOT_OPTIONS: { value: BookingSlot; label: string; fullTitle: string }[] = [
  { value: 'full_day', label: 'Full Day', fullTitle: 'Full Day (6 AM – 12 AM)' },
  { value: 'morning', label: 'Morning', fullTitle: 'Morning (6 AM – 3 PM)' },
  { value: 'evening', label: 'Evening', fullTitle: 'Evening (4 PM – 12 AM)' },
];

export const BookingFormScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: BookingFormRouteParams }, 'params'>>();
  const { user, hall, theme, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const mode = route.params?.mode || 'create';
  const isEdit = mode === 'edit';
  const bookingId = route.params?.bookingId;

  const scrollRef = useRef<ScrollView>(null);
  const defaultToday = formatLocalDate(new Date());
  const tomorrow = getTomorrowDate();

  const initialParamDate = route.params?.initialDate || defaultToday;
  const initialParamSlot = route.params?.initialSlot || 'full_day';

  // Elapsed slot rollover
  const isInitialElapsed = !isEdit && isSlotElapsed(initialParamDate, initialParamSlot);
  const resolvedInitialDate = isInitialElapsed ? tomorrow : initialParamDate;

  // Dynamic Event Types based on Hall Settings
  const eventTypeOptions: SelectOption[] = useMemo(() => {
    const types = (hall?.event_types && hall.event_types.length > 0)
      ? hall.event_types
      : DEFAULT_EVENT_TYPES;
    return [
      ...types.map(type => ({ value: type, label: type })),
      { value: 'Other', label: 'Other...' },
    ];
  }, [hall?.event_types]);

  // Wizard Step State (1, 2, 3)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStepReached, setMaxStepReached] = useState<number>(1);

  // Form State: Step 1 (Contact & Schedule)
  const [customerMobile, setCustomerMobile] = useState(
    route.params?.initialCustomerMobile || ''
  );
  const [customerName, setCustomerName] = useState(
    route.params?.initialCustomerName || ''
  );
  const [crmStatus, setCrmStatus] = useState<'idle' | 'searching' | 'found' | 'new'>('idle');
  const [eventType, setEventType] = useState(() => {
    const types = (hall?.event_types && hall.event_types.length > 0)
      ? hall.event_types
      : DEFAULT_EVENT_TYPES;
    return types[0] || 'Wedding';
  });
  const [customEventName, setCustomEventName] = useState('');
  const [expectedGuests, setExpectedGuests] = useState('600');
  const [startDate, setStartDate] = useState(resolvedInitialDate);
  const [endDate, setEndDate] = useState(resolvedInitialDate);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [slot, setSlot] = useState<BookingSlot>(initialParamSlot);

  // Form State: Step 2 (Pricing & Advance)
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isCustomPackage, setIsCustomPackage] = useState(false);
  const [customPackageName, setCustomPackageName] = useState('');
  const [customPackagePrice, setCustomPackagePrice] = useState('240000');
  const [basePackageCost, setBasePackageCost] = useState(240000);

  // Dynamic Expenses List
  const [dynamicExpenses, setDynamicExpenses] = useState<DynamicExpenseItem[]>([]);

  // Advance Payment & Notes
  const [advanceAmount, setAdvanceAmount] = useState('100000');
  const [primaryPaymentMode, setPrimaryPaymentMode] = useState<'upi' | 'cash' | 'card' | 'credit'>('upi');
  const [notes, setNotes] = useState('');

  // Dropdown Modal State
  const [activeModal, setActiveModal] = useState<'occasion' | 'slot' | 'package' | null>(null);

  // Success Modal State
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [createdBillNumber, setCreatedBillNumber] = useState<string | null>(null);

  // Step transition animations
  const stepFadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Loading & Submission State
  const [loadingInitial, setLoadingInitial] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [billNumber, setBillNumber] = useState<string | null>(null);

  // Proactive Slot Availability Checker
  const [availability, setAvailability] = useState<SlotAvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Error banners
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const currencySymbol = hall?.currency_symbol || '₹';
  const isFullDayOnly = hall?.slotMode === 'full-day' || hall?.slotMode === 'full_day';
  const isMultiDayAllowed = hall?.multiDayEnabled !== false;

  const filteredSlotOptions: SelectOption[] = (isFullDayOnly
    ? SLOT_OPTIONS.filter(o => o.value === 'full_day')
    : SLOT_OPTIONS
  ).map(o => ({ value: o.value, label: o.fullTitle }));

  // Central Back Dispatcher: Prompt before leaving if user has entered unsaved form data
  const isFormDirty = Boolean(customerName.trim() || customerMobile.trim());
  useBackOverlay(
    isFormDirty && !isSuccessModalVisible,
    () => {
      navigation.goBack();
    },
    {
      id: 'booking_form_screen_dirty',
      hasUnsavedChanges: () => isFormDirty,
      onUnsavedChangesPrompt: async () => {
        return new Promise<boolean>(resolve => {
          Alert.alert(
            'Discard Booking?',
            'You have unsaved booking details. Are you sure you want to discard your changes and go back?',
            [
              { text: 'Keep Editing', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Discard', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
      },
    }
  );

  // Step transition animation
  const animateStepTransition = () => {
    stepFadeAnim.setValue(0);
    Animated.timing(stepFadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animateStepTransition();
  }, [currentStep]);

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // Load Packages and existing booking if in Edit Mode
  useEffect(() => {
    let mounted = true;
    const initData = async () => {
      try {
        const pkgs = await fetchActivePackages();
        if (mounted) {
          setPackages(pkgs);
          if (!isEdit) {
            if (pkgs.length > 0) {
              const goldPkg = pkgs.find(p => p.name.toLowerCase().includes('gold')) || pkgs[0];
              setSelectedPackageId(goldPkg.id);
              setBasePackageCost(goldPkg.price);
              setIsCustomPackage(false);
            } else {
              setSelectedPackageId('custom');
              setIsCustomPackage(true);
              setCustomPackageName('Standard Booking');
              setCustomPackagePrice('240000');
              setBasePackageCost(240000);
            }
          }
        }

        if (isEdit && bookingId) {
          const details = await fetchBookingDetails(bookingId, logout);
          if (details && mounted) {
            setCustomerName(details.customers?.name || '');
            setCustomerMobile(details.customers?.mobile || '');
            setStartDate(details.start_date);
            setEndDate(details.end_date);
            setIsMultiDay(details.start_date !== details.end_date);
            setSlot(details.slot);

            const isKnownPreset = eventTypeOptions.some(p => p.value !== 'Other' && p.value === details.event_type);
            if (isKnownPreset) {
              setEventType(details.event_type || eventTypeOptions[0]?.value || 'Wedding');
            } else {
              setEventType('Other');
              setCustomEventName(details.event_type || '');
            }

            setExpectedGuests(details.expected_guests ? details.expected_guests.toString() : '600');

            if (details.packages?.id) {
              setSelectedPackageId(details.packages.id);
              setIsCustomPackage(false);
              setBasePackageCost(Number(details.booking_price) || details.packages.price);
            } else {
              setSelectedPackageId('custom');
              setIsCustomPackage(true);
              setCustomPackageName('Custom Package');
              setCustomPackagePrice(details.booking_price ? details.booking_price.toString() : '0');
              setBasePackageCost(Number(details.booking_price) || 0);
            }

            if (details.extra_charges_items && details.extra_charges_items.length > 0) {
              setDynamicExpenses(
                details.extra_charges_items.map((item, idx) => ({
                  id: item.id || `extra_${idx}_${Date.now()}`,
                  reason: item.title,
                  amount: item.amount.toString(),
                }))
              );
            } else if (Number(details.extra_charges) > 0) {
              setDynamicExpenses([
                {
                  id: 'initial_extra',
                  reason: 'Additional Charges',
                  amount: details.extra_charges.toString(),
                },
              ]);
            }

            setNotes(details.notes || '');
            setBillNumber(details.bill_number);
          }
        }
      } catch (err) {
        console.warn('Failed to load initial form data:', err);
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    };
    initData();

    return () => {
      mounted = false;
    };
  }, [isEdit, bookingId, logout]);

  // Mobile CRM Lookup
  const crmSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleMobileChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 10);
    setCustomerMobile(clean);
    setValidationError(null);

    if (crmSearchTimeout.current) clearTimeout(crmSearchTimeout.current);

    if (clean.length === 10) {
      setCrmStatus('searching');
      crmSearchTimeout.current = setTimeout(async () => {
        try {
          const results = await searchCustomers(clean);
          if (results.length > 0 && results[0].name) {
            setCustomerName(results[0].name);
            setCrmStatus('found');
          } else {
            setCrmStatus('new');
          }
        } catch {
          setCrmStatus('new');
        }
      }, 200);
    } else {
      setCrmStatus('idle');
    }
  };

  // Proactive Slot Availability Checker
  const verifyAvailability = useCallback(async (targetDate: string, targetSlot: BookingSlot) => {
    if (!targetDate || targetDate.length < 10) return;
    setCheckingAvailability(true);
    try {
      const res = await checkSlotAvailability(targetDate, targetSlot, isEdit ? bookingId : undefined);
      setAvailability(res);
    } catch (e) {
      console.warn('Slot availability check failed:', e);
    } finally {
      setCheckingAvailability(false);
    }
  }, [isEdit, bookingId]);

  useEffect(() => {
    verifyAvailability(startDate, slot);
  }, [startDate, slot, verifyAvailability]);

  // Financial Calculations
  const dynamicExpensesTotal = dynamicExpenses.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0
  );
  const currentBasePrice = isCustomPackage ? parseFloat(customPackagePrice) || 0 : basePackageCost;
  const currentTotalPrice = currentBasePrice + dynamicExpensesTotal;
  const currentAdvance = parseFloat(advanceAmount) || 0;
  const pendingBalance = Math.max(0, currentTotalPrice - currentAdvance);
  const isAdvanceExceeding = currentAdvance > currentTotalPrice && currentTotalPrice > 0;

  // Selected package label
  const selectedPackageObj = packages.find(p => p.id === selectedPackageId);
  const selectedPackageDisplayName = isCustomPackage
    ? (customPackageName.trim() || 'Custom Package')
    : selectedPackageObj
    ? selectedPackageObj.name
    : 'Royal Gold Package';

  const effectiveEventTitle = eventType === 'Other'
    ? (customEventName.trim() || 'Custom Event')
    : eventType;

  // Package Options for Dropdown
  const packageOptions: SelectOption[] = [
    ...packages.map(p => ({
      value: p.id,
      label: `${p.name} (${formatCurrency(p.price, currencySymbol)})`,
    })),
    {
      value: 'custom',
      label: packages.length > 0 ? 'Other / Custom Package...' : 'Custom Package...',
    },
  ];

  // Quick Advance Buttons matching lines 346-348
  const handleSetQuickAdvance = (type: '0' | '50k' | 'full') => {
    if (type === '0') {
      setAdvanceAmount('0');
    } else if (type === '50k') {
      setAdvanceAmount('50000');
    } else if (type === 'full') {
      setAdvanceAmount(currentTotalPrice.toString());
    }
  };

  // Step 1 Validation -> Proceed to Step 2
  const handleProceedToStep2 = () => {
    const cleanMobile = customerMobile.trim().replace(/[^0-9]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      setValidationError('Please enter a valid 10-digit mobile number');
      triggerErrorShake();
      Alert.alert('Incomplete Customer Info', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!customerName.trim()) {
      setValidationError('Please enter the customer name');
      triggerErrorShake();
      Alert.alert('Incomplete Customer Info', 'Please enter the customer name.');
      return;
    }
    if (eventType === 'Other' && !customEventName.trim()) {
      setValidationError('Please specify the custom event name');
      triggerErrorShake();
      Alert.alert('Event Name Required', 'Please specify the custom event name.');
      return;
    }
    if (!isEdit && isSlotElapsed(startDate, slot)) {
      const msg = `The selected slot has already elapsed. Please choose an upcoming date.`;
      setValidationError(msg);
      triggerErrorShake();
      Alert.alert('Slot Elapsed', msg);
      return;
    }

    setValidationError(null);
    setCurrentStep(2);
    setMaxStepReached(prev => Math.max(prev, 2));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Step 2 Validation -> Proceed to Step 3
  const handleProceedToStep3 = () => {
    if (currentTotalPrice <= 0) {
      setValidationError('Please enter a valid package price');
      triggerErrorShake();
      Alert.alert('Pricing Required', 'Please enter a valid package price.');
      return;
    }
    if (isAdvanceExceeding) {
      setValidationError('Advance cannot exceed total price');
      triggerErrorShake();
      Alert.alert('Invalid Advance', 'Advance cannot exceed total price.');
      return;
    }

    setValidationError(null);
    setCurrentStep(3);
    setMaxStepReached(prev => Math.max(prev, 3));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Final Submit Handler
  const handleSubmit = async () => {
    try {
      setSubmitState('saving');
      setSubmitting(true);
      setConflictError(null);

      const activePayments = currentAdvance > 0
        ? [{ amount: currentAdvance, mode: primaryPaymentMode, notes: 'Initial Advance' }]
        : [];

      let formattedNotes = notes.trim();
      if (dynamicExpenses.length > 0) {
        const expenseLines = dynamicExpenses
          .filter(e => parseFloat(e.amount) > 0 || e.reason.trim())
          .map(e => `${e.reason.trim() || 'Expense'}: ₹${e.amount}`)
          .join(', ');
        formattedNotes = formattedNotes
          ? `${formattedNotes} | Expenses: ${expenseLines}`
          : `Expenses: ${expenseLines}`;
      }

      const effectivePackageId =
        isCustomPackage || !selectedPackageId || selectedPackageId === 'custom'
          ? null
          : selectedPackageId;

      const cleanExtraChargesItems = dynamicExpenses
        .filter(e => e.reason.trim().length > 0 && parseFloat(e.amount) > 0)
        .map(e => ({
          title: e.reason.trim(),
          amount: parseFloat(e.amount),
          notes: null,
        }));

      if (isEdit && bookingId) {
        await editBookingAtomic(
          {
            bookingId,
            customerName: customerName.trim(),
            customerMobile: customerMobile.trim(),
            packageId: effectivePackageId,
            startDate,
            endDate: isMultiDay ? endDate : startDate,
            slot,
            eventType: effectiveEventTitle,
            expectedGuests: Number(expectedGuests) || 0,
            bookingPrice: currentBasePrice,
            extraCharges: dynamicExpensesTotal,
            extraChargesItems: cleanExtraChargesItems,
            notes: formattedNotes || undefined,
          },
          logout
        );

        setSubmitState('saved');
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } else {
        const res = await createBookingAtomic(
          {
            customerName: customerName.trim(),
            customerMobile: customerMobile.trim(),
            packageId: effectivePackageId,
            startDate,
            endDate: isMultiDay ? endDate : startDate,
            slot,
            eventType: effectiveEventTitle,
            expectedGuests: Number(expectedGuests) || 0,
            bookingPrice: currentBasePrice,
            extraCharges: dynamicExpensesTotal,
            extraChargesItems: cleanExtraChargesItems,
            notes: formattedNotes || undefined,
            payments: activePayments,
          },
          logout
        );

        setSubmitState('saved');
        setCreatedBillNumber(res.bill_number);
        setIsSuccessModalVisible(true);
      }
    } catch (err: any) {
      console.error('[BookingFormScreen] Submit error:', err);
      const msg = err?.message || 'Failed to save booking.';
      setSubmitState('idle');
      setConflictError(msg);
      triggerErrorShake();
      Alert.alert('Booking Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetWizard = () => {
    setIsSuccessModalVisible(false);
    setSubmitState('idle');
    setCustomerMobile('');
    setCustomerName('');
    setCrmStatus('idle');
    setEventType(eventTypeOptions[0]?.value || 'Wedding');
    setCustomEventName('');
    setExpectedGuests('600');
    setAdvanceAmount('100000');
    setDynamicExpenses([]);
    setNotes('');
    setCreatedBillNumber(null);
    setCurrentStep(1);
    setMaxStepReached(1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (loadingInitial) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={colors.gold[500]} />
        <Text style={[styles.loadingText, { color: t.textMuted }]}>
          Loading booking contract...
        </Text>
      </View>
    );
  }

  // Strict Role & Permission Enforcement
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const canAccessCalendar = isOwner || Boolean(user?.screenAccess?.calendar);

  if (!canAccessCalendar) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: isDark ? '#111113' : '#FCFBF9',
          },
        ]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.accessRestrictedWrap}>
          <View
            style={[
              styles.restrictedIconBox,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
            ]}
          >
            <ShieldAlert
              size={44}
              color={isDark ? colors.status.danger.dark : colors.status.danger.light}
            />
          </View>
          <Text style={[styles.restrictedTitle, { color: t.text }]}>
            Booking Creation Restricted
          </Text>
          <Text style={[styles.restrictedSubtitle, { color: t.textMuted }]}>
            Your staff account does not have permission to create or modify bookings. Please contact the Hall Owner to grant access.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.backToHomeBtn,
              {
                backgroundColor: isDark ? colors.dark.card : colors.light.card,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backToHomeBtnText, { color: t.text }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: isDark ? '#111113' : '#FCFBF9',
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Header matching lines 174-207 (No dark mode toggle button) */}
          <BookingStepIndicator
            currentStep={currentStep}
            onSelectStep={step => {
              setCurrentStep(step);
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            maxStepReached={maxStepReached}
            hallName={hall?.name || 'Royal Palace'}
            isDark={isDark}
            onBack={() => {
              if (!isEdit && currentStep > 1) {
                setCurrentStep(prev => prev - 1);
              } else {
                navigation.goBack();
              }
            }}
            isEdit={isEdit}
            billNumber={billNumber}
          />

          {/* Conflict Alert Banner if collision occurred on submit */}
          {conflictError && (
            <Animated.View style={[styles.conflictBanner, { transform: [{ translateX: shakeAnim }] }]}>
              <AlertCircle size={18} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.conflictTitle}>Slot Collision / Error</Text>
                <Text style={styles.conflictText}>{conflictError}</Text>
              </View>
            </Animated.View>
          )}

          {/* Validation Notice Banner */}
          {validationError && (
            <Animated.View style={[styles.validationBanner, { transform: [{ translateX: shakeAnim }] }]}>
              <AlertCircle size={16} color="#D97706" />
              <Text style={styles.validationText}>{validationError}</Text>
            </Animated.View>
          )}

          {/* SINGLE MAIN ENCLOSING GLASS CARD (Matching lines 210-544) */}
          <View
            style={[
              styles.mainGlassCard,
              {
                backgroundColor: isDark
                  ? 'rgba(26, 23, 20, 0.85)'
                  : Platform.OS === 'web'
                  ? 'rgba(255, 255, 255, 0.85)'
                  : '#FFFFFF',
                borderColor: isDark
                  ? 'rgba(214, 174, 107, 0.20)'
                  : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            {/* ============================================================== */}
            {/* STEP 1: CONTACT & SCHEDULE (Matching New-Booking-form.html)    */}
            {/* ============================================================== */}
            {currentStep === 1 && (
              <Animated.View style={[styles.stepSection, { opacity: stepFadeAnim }]}>
                {/* Step Title Header matching lines 248-251 */}
                <View>
                  <Text style={[styles.stepPreTitle, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
                    Step 1 • Contact & Schedule
                  </Text>
                  <Text style={[styles.stepMainTitle, { color: t.text }]}>
                    Who is this for & when?
                  </Text>
                </View>

                {/* Customer Details Inset Group matching lines 254-273 */}
                <View style={styles.groupContainer}>
                  <Text style={[styles.groupHeaderLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                    CUSTOMER
                  </Text>
                  <View
                    style={[
                      styles.insetGroup,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.15)',
                      },
                    ]}
                  >
                    {/* Row 1: Mobile */}
                    <View
                      style={[
                        styles.insetRow,
                        {
                          borderBottomColor: isDark
                            ? 'rgba(214, 174, 107, 0.12)'
                            : 'rgba(198, 151, 73, 0.12)',
                        },
                      ]}
                    >
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Mobile *
                      </Text>
                      <View style={styles.mobileRightInputContainer}>
                        <Text style={[styles.prefixTextSmall, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                          +91
                        </Text>
                        <TextInput
                          value={customerMobile}
                          onChangeText={handleMobileChange}
                          placeholder="98450 00000"
                          placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                          keyboardType="phone-pad"
                          maxLength={10}
                          style={[styles.insetTextInput, { color: t.text }]}
                          accessibilityLabel="Customer mobile number"
                        />
                      </View>
                    </View>

                    {/* Row 2: Full Name */}
                    <View style={[styles.insetRow, styles.lastRow]}>
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Full Name *
                      </Text>
                      <TextInput
                        value={customerName}
                        onChangeText={val => {
                          setCustomerName(val);
                          setValidationError(null);
                        }}
                        placeholder="Enter name"
                        placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                        style={[styles.insetTextInput, { color: t.text }]}
                        accessibilityLabel="Customer full name"
                      />
                    </View>
                  </View>

                  {/* CRM Feedback text matching lines 269-272 */}
                  {crmStatus !== 'idle' && (
                    <View style={styles.crmFeedbackRight}>
                      {crmStatus === 'found' ? (
                        <View style={styles.feedbackRowActive}>
                          <CheckCircle2 size={12} color="#059669" />
                          <Text style={styles.feedbackTextFound}>Existing customer found!</Text>
                        </View>
                      ) : crmStatus === 'new' ? (
                        <View style={styles.feedbackRowActive}>
                          <Sparkles size={12} color={isDark ? colors.gold[400] : '#8E6227'} />
                          <Text style={[styles.feedbackTextNew, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
                            New customer.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>

                {/* Event Details Inset Group matching lines 276-327 */}
                <View style={styles.groupContainer}>
                  <Text style={[styles.groupHeaderLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                    EVENT DETAILS
                  </Text>
                  <View
                    style={[
                      styles.insetGroup,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.15)',
                      },
                    ]}
                  >
                    {/* Row 1: Event Type */}
                    <Pressable
                      onPress={() => setActiveModal('occasion')}
                      style={({ pressed }) => [
                        styles.insetRow,
                        {
                          borderBottomColor: isDark
                            ? 'rgba(214, 174, 107, 0.12)'
                            : 'rgba(198, 151, 73, 0.12)',
                          backgroundColor: pressed
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.08)'
                              : 'rgba(198, 151, 73, 0.08)'
                            : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Select Event Type"
                    >
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Event Type *
                      </Text>
                      <View style={styles.insetValueRightGroup}>
                        <Text style={[styles.insetValueText, { color: t.text }]}>
                          {effectiveEventTitle}
                        </Text>
                        <ChevronRight size={14} color={isDark ? '#78716C' : '#A8A29E'} />
                      </View>
                    </Pressable>

                    {/* Custom Event Box (Shows if 'Other' is selected) matching lines 296-299 */}
                    {eventType === 'Other' && (
                      <View
                        style={[
                          styles.insetRow,
                          {
                            borderBottomColor: isDark
                              ? 'rgba(214, 174, 107, 0.12)'
                              : 'rgba(198, 151, 73, 0.12)',
                          },
                        ]}
                      >
                        <Text style={[styles.insetLabel, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
                          Custom Name *
                        </Text>
                        <TextInput
                          value={customEventName}
                          onChangeText={setCustomEventName}
                          placeholder="e.g. Engagement"
                          placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                          style={[styles.insetTextInput, { color: t.text }]}
                          accessibilityLabel="Custom event name"
                        />
                      </View>
                    )}

                    {/* Row 2: Date */}
                    <View
                      style={[
                        styles.insetRow,
                        {
                          borderBottomColor: isDark
                            ? 'rgba(214, 174, 107, 0.12)'
                            : 'rgba(198, 151, 73, 0.12)',
                        },
                      ]}
                    >
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Date *
                      </Text>
                      <TextInput
                        value={startDate}
                        onChangeText={val => {
                          setStartDate(val);
                          setValidationError(null);
                        }}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                        style={[styles.insetTextInput, { color: t.text }]}
                        accessibilityLabel="Booking date"
                      />
                    </View>

                    {/* Row 3: Time Slot */}
                    <Pressable
                      onPress={() => setActiveModal('slot')}
                      style={({ pressed }) => [
                        styles.insetRow,
                        {
                          borderBottomColor: isDark
                            ? 'rgba(214, 174, 107, 0.12)'
                            : 'rgba(198, 151, 73, 0.12)',
                          backgroundColor: pressed
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.08)'
                              : 'rgba(198, 151, 73, 0.08)'
                            : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Select Time Slot"
                    >
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Time Slot *
                      </Text>
                      <View style={styles.insetValueRightGroup}>
                        <Text style={[styles.insetValueText, { color: t.text }]}>
                          {slot === 'full_day' ? 'Full Day' : slot === 'morning' ? 'Morning' : 'Evening'}
                        </Text>
                        <ChevronRight size={14} color={isDark ? '#78716C' : '#A8A29E'} />
                      </View>
                    </Pressable>

                    {/* Row 4: Guest Count */}
                    <View style={[styles.insetRow, styles.lastRow]}>
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Guest Count *
                      </Text>
                      <TextInput
                        value={expectedGuests}
                        onChangeText={setExpectedGuests}
                        placeholder="600"
                        placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                        keyboardType="numeric"
                        style={[styles.insetTextInput, { color: t.text }]}
                        accessibilityLabel="Guest count"
                      />
                    </View>
                  </View>

                  {/* Multi-day toggle link (if allowed) */}
                  {isMultiDayAllowed && (
                    <Pressable
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsMultiDay(prev => !prev);
                      }}
                      style={styles.multiDayToggle}
                    >
                      <Text style={[styles.multiDayToggleText, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
                        {isMultiDay ? '– Switch to Single Day' : '+ Multi-Day Reservation'}
                      </Text>
                    </Pressable>
                  )}

                  {isMultiDay && (
                    <View
                      style={[
                        styles.insetGroup,
                        {
                          backgroundColor: isDark ? colors.dark.input : colors.light.input,
                          borderColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.15)',
                          marginTop: 8,
                        },
                      ]}
                    >
                      <View style={[styles.insetRow, styles.lastRow]}>
                        <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                          End Date *
                        </Text>
                        <TextInput
                          value={endDate}
                          onChangeText={setEndDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                          style={[styles.insetTextInput, { color: t.text }]}
                          accessibilityLabel="End date"
                        />
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* ============================================================== */}
            {/* STEP 2: PRICING & ADVANCE (Matching New-Booking-form.html)     */}
            {/* ============================================================== */}
            {currentStep === 2 && (
              <Animated.View style={[styles.stepSection, { opacity: stepFadeAnim }]}>
                {/* Step Title Header matching lines 333-336 */}
                <View>
                  <Text style={[styles.stepPreTitle, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
                    Step 2 • Pricing & Advance
                  </Text>
                  <Text style={[styles.stepMainTitle, { color: t.text }]}>
                    Select package & collect advance
                  </Text>
                </View>

                {/* Package Selection Group matching lines 339-366 */}
                <View style={styles.groupContainer}>
                  <Text style={[styles.groupHeaderLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                    PACKAGE SELECTION
                  </Text>
                  <View
                    style={[
                      styles.insetGroup,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.15)',
                      },
                    ]}
                  >
                    {/* Row 1: Package Trigger */}
                    <Pressable
                      onPress={() => setActiveModal('package')}
                      style={({ pressed }) => [
                        styles.insetRow,
                        isCustomPackage && {
                          borderBottomColor: isDark
                            ? 'rgba(214, 174, 107, 0.12)'
                            : 'rgba(198, 151, 73, 0.12)',
                        },
                        !isCustomPackage && styles.lastRow,
                        {
                          backgroundColor: pressed
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.08)'
                              : 'rgba(198, 151, 73, 0.08)'
                            : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Select Package"
                    >
                      <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                        Package *
                      </Text>
                      <View style={styles.insetValueRightGroup}>
                        <Text
                          style={[
                            styles.insetValueText,
                            { color: t.text, maxWidth: 180 },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedPackageDisplayName}
                        </Text>
                        <ChevronRight size={14} color={isDark ? '#78716C' : '#A8A29E'} />
                      </View>
                    </Pressable>

                    {/* Custom Package Inputs if "custom" is active matching lines 356-365 */}
                    {isCustomPackage && (
                      <>
                        <View
                          style={[
                            styles.insetRow,
                            {
                              borderBottomColor: isDark
                                ? 'rgba(214, 174, 107, 0.12)'
                                : 'rgba(198, 151, 73, 0.12)',
                            },
                          ]}
                        >
                          <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                            Custom Name
                          </Text>
                          <TextInput
                            value={customPackageName}
                            onChangeText={setCustomPackageName}
                            placeholder="e.g. Lawn Only"
                            placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                            style={[styles.insetTextInput, { color: t.text }]}
                            accessibilityLabel="Custom package name"
                          />
                        </View>
                        <View style={[styles.insetRow, styles.lastRow]}>
                          <Text style={[styles.insetLabel, { color: isDark ? '#A8A29E' : '#57534E' }]}>
                            Base Price (₹)
                          </Text>
                          <TextInput
                            value={customPackagePrice}
                            onChangeText={val => setCustomPackagePrice(val.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                            placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                            keyboardType="numeric"
                            style={[
                              styles.insetTextInput,
                              { color: isDark ? colors.gold[400] : '#047857' },
                            ]}
                            accessibilityLabel="Custom package base price"
                          />
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Additional Expenses Group matching lines 369-385 */}
                <DynamicExpensesList
                  expenses={dynamicExpenses}
                  onChangeExpenses={setDynamicExpenses}
                  currencySymbol={currencySymbol}
                  isDark={isDark}
                />

                {/* Advance Input Group (Explicit Box) matching lines 387-400 */}
                <View style={styles.groupContainer}>
                  <Text style={[styles.groupHeaderLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                    ADVANCE PAYMENT
                  </Text>
                  <View style={styles.advanceRowGrid}>
                    <View style={styles.advanceInputCol}>
                      <Text style={[styles.fieldSubLabel, { color: t.text }]}>
                        Advance Paid (₹)
                      </Text>
                      <TextInput
                        value={advanceAmount}
                        onChangeText={val => setAdvanceAmount(val.replace(/[^0-9]/g, ''))}
                        placeholder="100000"
                        placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                        keyboardType="numeric"
                        style={[
                          styles.simpleInput,
                          styles.advanceExplicitInput,
                          {
                            backgroundColor: isDark ? colors.dark.input : colors.light.input,
                            borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.28)',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.quickPillsRow}>
                      <Pressable
                        onPress={() => handleSetQuickAdvance('0')}
                        style={({ pressed }) => [
                          styles.quickPill,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 113, 108, 0.10)',
                            transform: [{ scale: pressed ? 0.94 : 1 }],
                          },
                        ]}
                      >
                        <Text style={[styles.quickPillText, { color: t.text }]}>₹0</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleSetQuickAdvance('50k')}
                        style={({ pressed }) => [
                          styles.quickPill,
                          {
                            backgroundColor: isDark ? 'rgba(198, 151, 73, 0.18)' : 'rgba(198, 151, 73, 0.12)',
                            transform: [{ scale: pressed ? 0.94 : 1 }],
                          },
                        ]}
                      >
                        <Text style={[styles.quickPillText, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
                          ₹50K
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleSetQuickAdvance('full')}
                        style={({ pressed }) => [
                          styles.quickPill,
                          {
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)',
                            transform: [{ scale: pressed ? 0.94 : 1 }],
                          },
                        ]}
                      >
                        <Text style={[styles.quickPillText, { color: '#059669' }]}>Full</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Payment Mode matching lines 403-419 */}
                <View style={styles.groupContainer}>
                  <Text style={[styles.groupHeaderLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                    PAYMENT MODE
                  </Text>
                  <View style={styles.paymentModeGrid}>
                    {[
                      { key: 'upi', label: 'UPI', icon: Smartphone },
                      { key: 'cash', label: 'Cash', icon: Banknote },
                      { key: 'card', label: 'Card', icon: CreditCard },
                      { key: 'credit', label: 'Credit', icon: Clock },
                    ].map(item => {
                      const isSelected = primaryPaymentMode === item.key;
                      const Icon = item.icon;

                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setPrimaryPaymentMode(item.key as any)}
                          style={({ pressed }) => [
                            styles.advModeBtn,
                            isSelected
                              ? styles.advModeBtnSelected
                              : [
                                  styles.advModeBtnUnselected,
                                  {
                                    backgroundColor: isDark ? 'rgba(30, 28, 26, 0.70)' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.30)',
                                  },
                                ],
                            { transform: [{ scale: pressed ? 0.95 : 1 }] },
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Icon
                            size={16}
                            color={isSelected ? '#FFFFFF' : isDark ? colors.gold[400] : colors.gold[600]}
                          />
                          <Text
                            style={[
                              styles.advModeBtnLabel,
                              {
                                color: isSelected ? '#FFFFFF' : isDark ? colors.gold[400] : '#57534E',
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Booking Notes matching lines 422-425 */}
                <View style={styles.groupContainer}>
                  <Text style={[styles.fieldSubLabel, { color: t.text }]}>
                    Booking Notes (Optional)
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any special requirements, catering details, etc..."
                    placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.simpleInput,
                      styles.notesInput,
                      {
                        backgroundColor: isDark ? colors.dark.input : colors.light.input,
                        borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.28)',
                        color: t.text,
                      },
                    ]}
                  />
                </View>

                {/* Live Ledger Card matching lines 428-456 */}
                <FinancialLedgerCard
                  baseCost={currentBasePrice}
                  expenses={dynamicExpenses}
                  totalCost={currentTotalPrice}
                  advanceAmount={currentAdvance}
                  advanceMode={primaryPaymentMode}
                  balanceDue={pendingBalance}
                  currencySymbol={currencySymbol}
                  isDark={isDark}
                />
              </Animated.View>
            )}

            {/* ============================================================== */}
            {/* STEP 3: REVIEW BOOKING (Lines 420-525)                         */}
            {/* ============================================================== */}
            {currentStep === 3 && (
              <Animated.View style={[styles.stepSection, { opacity: stepFadeAnim }]}>
                <BookingSummaryCard
                  data={{
                    customerName,
                    customerMobile,
                    eventType: effectiveEventTitle,
                    startDate,
                    endDate: isMultiDay ? endDate : startDate,
                    isMultiDay,
                    slot,
                    packageName: selectedPackageDisplayName,
                    basePackageCost: currentBasePrice,
                    dynamicExpenses,
                    totalContract: currentTotalPrice,
                    advanceAmount: currentAdvance,
                    advanceMode: primaryPaymentMode,
                    remainingBalance: pendingBalance,
                    expectedGuests,
                    notes,
                  }}
                  onEditSection={targetStep => {
                    setCurrentStep(targetStep);
                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  currencySymbol={currencySymbol}
                  isDark={isDark}
                />
              </Animated.View>
            )}

            {/* ============================================================== */}
            {/* NAVIGATION BUTTONS (Matching lines 529-541 inside main card)   */}
            {/* ============================================================== */}
            <View
              style={[
                styles.navFooterRow,
                {
                  borderTopColor: isDark
                    ? 'rgba(214, 174, 107, 0.18)'
                    : 'rgba(198, 151, 73, 0.20)',
                },
              ]}
            >
              {/* Back button (hidden on Step 1, visible on Step 2 and Step 3) */}
              {currentStep > 1 && !isEdit ? (
                <Pressable
                  onPress={() => setCurrentStep(prev => prev - 1)}
                  style={({ pressed }) => [
                    styles.navBtnBack,
                    {
                      backgroundColor: isDark ? 'rgba(30, 28, 26, 0.72)' : 'rgba(255, 255, 255, 0.76)',
                      borderColor: isDark ? 'rgba(214, 174, 107, 0.20)' : 'rgba(255, 255, 255, 0.95)',
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Back to previous step"
                >
                  <ArrowLeft size={15} color={t.text} />
                  <Text style={[styles.navBtnBackText, { color: t.text }]}>Back</Text>
                </Pressable>
              ) : (
                <View style={{ width: 0 }} />
              )}

              <View style={{ flex: 1 }} />

              {/* Next / Confirm CTA Button */}
              <Pressable
                onPress={() => {
                  if (currentStep === 1 && !isEdit) {
                    handleProceedToStep2();
                  } else if (currentStep === 2 && !isEdit) {
                    handleProceedToStep3();
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.navBtnNext,
                  {
                    transform: [{ scale: pressed && !submitting ? 0.97 : 1 }],
                    opacity: submitting ? 0.88 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isEdit
                    ? 'Save Changes'
                    : currentStep === 1
                    ? 'Next: Package & Pricing'
                    : currentStep === 2
                    ? 'Next: Review Booking'
                    : 'Confirm & Lock Slot'
                }
              >
                {submitState === 'saving' ? (
                  <View style={styles.ctaRowCenter}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.navBtnNextText}>Locking Slot...</Text>
                  </View>
                ) : submitState === 'saved' ? (
                  <View style={styles.ctaRowCenter}>
                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    <Text style={styles.navBtnNextText}>
                      {isEdit ? 'Changes Saved ✓' : 'Slot Confirmed ✓'}
                    </Text>
                  </View>
                ) : isEdit ? (
                  <Text style={styles.navBtnNextText}>Save Changes</Text>
                ) : currentStep === 1 ? (
                  <View style={styles.ctaRowCenter}>
                    <Text style={styles.navBtnNextText}>Next: Package & Pricing</Text>
                    <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                ) : currentStep === 2 ? (
                  <View style={styles.ctaRowCenter}>
                    <Text style={styles.navBtnNextText}>Next: Review Booking</Text>
                    <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                ) : (
                  <View style={styles.ctaRowCenter}>
                    <Check size={16} color="#FFFFFF" strokeWidth={2.8} />
                    <Text style={styles.navBtnNextText}>Confirm & Lock Slot</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Dropdown Modal matching lines 581-599 */}
        <CustomSelectModal
          visible={activeModal === 'occasion'}
          title="Select Event Type"
          options={eventTypeOptions}
          selectedValue={eventType}
          onSelect={val => {
            setEventType(val);
            setValidationError(null);
          }}
          onClose={() => setActiveModal(null)}
          isDark={isDark}
        />

        <CustomSelectModal
          visible={activeModal === 'slot'}
          title="Select Time Slot"
          options={filteredSlotOptions}
          selectedValue={slot}
          onSelect={val => {
            setSlot(val as BookingSlot);
            setValidationError(null);
          }}
          onClose={() => setActiveModal(null)}
          isDark={isDark}
        />

        <CustomSelectModal
          visible={activeModal === 'package'}
          title="Select Package"
          options={packageOptions}
          selectedValue={isCustomPackage ? 'custom' : selectedPackageId || ''}
          onSelect={val => {
            if (val === 'custom' || !packages.some(p => p.id === val)) {
              setIsCustomPackage(true);
              setSelectedPackageId('custom');
              if (!customPackageName) setCustomPackageName('Custom Package');
            } else {
              setIsCustomPackage(false);
              setSelectedPackageId(val);
              const pObj = packages.find(p => p.id === val);
              if (pObj) {
                setBasePackageCost(pObj.price);
              }
            }
          }}
          onClose={() => setActiveModal(null)}
          isDark={isDark}
        />

        {/* Confirmation Success Modal matching lines 548-572 */}
        <BookingSuccessModal
          visible={isSuccessModalVisible}
          customerName={customerName}
          eventType={effectiveEventTitle}
          eventDate={startDate}
          advanceAmount={currentAdvance}
          advanceMode={primaryPaymentMode}
          balanceDue={pendingBalance}
          billNumber={createdBillNumber}
          currencySymbol={currencySymbol}
          isDark={isDark}
          onCreateAnother={handleResetWizard}
          onClose={() => {
            setIsSuccessModalVisible(false);
            navigation.goBack();
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mainGlassCard: {
    width: '100%',
    maxWidth: 672,
    alignSelf: 'center',
    borderRadius: 32,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 4,
  },
  stepSection: {
    gap: 16,
  },
  groupContainer: {
    gap: 6,
  },
  groupHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingLeft: 8,
  },
  fieldSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
    paddingLeft: 4,
  },
  insetGroup: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  insetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  insetLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  insetValueRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insetValueText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  insetTextInput: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
    paddingVertical: 0,
  },
  mobileRightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  prefixTextSmall: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.5,
    marginRight: 6,
  },
  crmFeedbackRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  advanceRowGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  advanceInputCol: {
    flex: 1,
    gap: 6,
  },
  advanceExplicitInput: {
    height: 50,
    color: '#047857',
    fontSize: 16,
    fontWeight: '700',
  },
  quickPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  quickPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepPreTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stepMainTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
  simpleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 50,
    paddingHorizontal: 16,
    position: 'relative',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.5,
    marginRight: 8,
  },
  mobileTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    height: '100%',
  },
  mobileRightIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  dotsThree: {
    fontSize: 14,
    letterSpacing: 1,
    opacity: 0.4,
  },
  crmFeedbackRow: {
    paddingHorizontal: 2,
  },
  feedbackRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTextFound: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  feedbackTextNew: {
    fontSize: 10,
    fontWeight: '600',
  },
  feedbackTextIdle: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.5,
  },
  simpleInput: {
    borderRadius: 16,
    borderWidth: 1.5,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  twoColumnGridBottomAlign: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingTop: 4,
  },
  flexOneCol: {
    flex: 1,
    gap: 6,
  },
  customSelectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 50,
    paddingHorizontal: 14,
  },
  selectTextBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  customPkgBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(198, 151, 73, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.30)',
  },
  customPkgLabel: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.6,
  },
  customPkgInput: {
    height: 42,
    fontSize: 12,
    borderRadius: 12,
  },
  bookingPriceBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    height: 50,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  bookingPriceText: {
    fontSize: 15,
    fontWeight: '700',
  },
  advanceInputText: {
    color: '#059669',
  },
  quickAdvanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.5,
  },
  quickBtnStone: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(120, 113, 108, 0.12)',
  },
  quickBtnGold: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(198, 151, 73, 0.15)',
  },
  quickBtnGoldText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E6227',
  },
  quickBtnEmerald: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  quickBtnEmeraldText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  quickBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentModeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  advModeBtnSelected: {
    backgroundColor: '#C69749',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  advModeBtnUnselected: {
    borderWidth: 1,
  },
  advModeBtnLabel: {
    fontSize: 10,
  },
  notesInput: {
    height: 64,
    textAlignVertical: 'top',
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  multiDayToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  multiDayToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  navFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 20,
    marginTop: 20,
    gap: 12,
  },
  navBtnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  navBtnBackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  navBtnNext: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#C69749',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  navBtnNextText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ctaRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.40)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  conflictTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  conflictText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 1,
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: 'rgba(217, 119, 6, 0.40)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  validationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    flex: 1,
  },
  accessRestrictedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 420,
    alignSelf: 'center',
  },
  restrictedIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  restrictedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  backToHomeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.3)',
  },
  backToHomeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
