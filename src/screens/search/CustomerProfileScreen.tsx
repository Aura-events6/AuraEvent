import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  PlusCircle,
  CalendarDays,
  Coins,
  TrendingUp,
  AlertTriangle,
  FileEdit,
  Check,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { fetchCustomerProfile, updateCustomerNotes } from '../../services/searchService';
import { CustomerProfileData } from '../../types/search';
import { BookingSearchResultCard } from '../../components/search/BookingSearchResultCard';
import { RollingNumberTicker } from '../../components/dashboard/RollingNumberTicker';

type CustomerProfileRouteParams = {
  customerId: string;
};

export const CustomerProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: CustomerProfileRouteParams }, 'params'>>();
  const { customerId } = route.params;

  const { hall, theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;
  const currencySymbol = hall?.currency_symbol || '₹';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<CustomerProfileData | null>(null);

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaveState, setNotesSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Looping warning pulse for overdue amounts
  const warningPulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (profileData?.metrics.remainingDues && profileData.metrics.remainingDues > 0) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(warningPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(warningPulse, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [profileData?.metrics.remainingDues, warningPulse]);

  const loadProfile = useCallback(async () => {
    if (!customerId) return;
    try {
      const data = await fetchCustomerProfile(customerId);
      if (data) {
        setProfileData(data);
        setNotesDraft(data.customer.notes || '');
      }
    } catch (err) {
      console.error('Failed to load customer profile:', err);
      Alert.alert('Error', 'Unable to load customer profile details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleSaveNotes = async () => {
    if (!customerId) return;
    try {
      setSavingNotes(true);
      setNotesSaveState('saving');
      const success = await updateCustomerNotes(customerId, notesDraft);
      if (success) {
        setNotesSaveState('saved');
        setTimeout(() => {
          setIsEditingNotes(false);
          setNotesSaveState('idle');
          if (profileData) {
            setProfileData({
              ...profileData,
              customer: {
                ...profileData.customer,
                notes: notesDraft.trim(),
              },
            });
          }
        }, 500);
      } else {
        setNotesSaveState('idle');
        Alert.alert('Save Failed', 'Could not update customer notes. Please retry.');
      }
    } catch (err) {
      setNotesSaveState('idle');
      console.error('Error saving notes:', err);
      Alert.alert('Error', 'An unexpected error occurred while saving notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCall = () => {
    if (!profileData?.customer.mobile) return;
    const cleanNumber = profileData.customer.mobile.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Unable to Call', `Could not initiate call to ${cleanNumber}`);
    });
  };

  const handleWhatsApp = () => {
    if (!profileData?.customer.mobile) return;
    let cleanNumber = profileData.customer.mobile.replace(/[^0-9]/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = `91${cleanNumber}`;
    }
    const message = encodeURIComponent(
      `Hello ${profileData.customer.name}, greeting from ${hall?.name || 'our hall'}!`
    );
    const url = `https://wa.me/${cleanNumber}?text=${message}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Unavailable', 'Could not open WhatsApp on this device.');
    });
  };

  const handleNewBooking = () => {
    if (!profileData?.customer) return;
    navigation.navigate('BookingForm', {
      mode: 'create',
      initialCustomerName: profileData.customer.name,
      initialCustomerMobile: profileData.customer.mobile,
    });
  };

  const handleBookingPress = (bookingId: string) => {
    navigation.navigate('BookingDetails', { bookingId });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: isDark ? colors.dark.background : colors.light.background },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? colors.dark.background : colors.light.background}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.gold[500]} />
          <Text style={[styles.loadingText, { color: t.textMuted }]}>
            Loading customer profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: isDark ? colors.dark.background : colors.light.background },
        ]}
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.errorTitle, { color: t.text }]}>
            Customer Not Found
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.backActionBtn,
              { backgroundColor: colors.gold[500], transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backActionText}>Return to Directory</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { customer, metrics, bookings } = profileData;

  const initials = customer.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'C';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? colors.dark.background : colors.light.background },
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? colors.dark.background : colors.light.background}
      />

      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            borderBottomColor: t.cardBorder,
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: isDark ? colors.dark.card : colors.light.card,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to search"
        >
          <ArrowLeft size={20} color={t.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text }]}>
          Customer Profile
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold[500]}
            colors={[colors.gold[500]]}
          />
        }
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            glassStyles.getCardStyle(isDark),
            {
              backgroundColor: t.card,
              borderColor: t.cardBorder,
            },
          ]}
        >
          <View style={styles.profileHeaderRow}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.2)'
                    : 'rgba(198, 151, 73, 0.15)',
                  borderColor: isDark ? colors.gold[500] : colors.gold[600],
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitials,
                  { color: isDark ? colors.gold[400] : colors.gold[700] },
                ]}
              >
                {initials}
              </Text>
            </View>

            <View style={styles.customerMeta}>
              <Text style={[styles.customerName, { color: t.text }]}>
                {customer.name}
              </Text>
              <Text style={[styles.customerMobile, { color: t.textMuted }]}>
                {customer.mobile}
              </Text>
            </View>
          </View>

          {/* Internal Notes Section */}
          <View
            style={[
              styles.notesBox,
              {
                backgroundColor: isDark ? colors.dark.card : colors.light.card,
                borderColor: t.cardBorder,
              },
            ]}
          >
            <View style={styles.notesBoxHeader}>
              <Text style={[styles.notesLabel, { color: t.textMuted }]}>
                Internal CRM Notes
              </Text>
              {!isEditingNotes && (
                <Pressable
                  onPress={() => setIsEditingNotes(true)}
                  style={({ pressed }) => [
                    styles.editNoteBtn,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit customer notes"
                >
                  <FileEdit size={14} color={colors.gold[500]} />
                  <Text style={[styles.editNoteText, { color: colors.gold[500] }]}>
                    Edit
                  </Text>
                </Pressable>
              )}
            </View>

            {isEditingNotes ? (
              <View style={styles.notesEditContainer}>
                <TextInput
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder="Add private customer preferences, tags, or payment history notes..."
                  placeholderTextColor={t.textSubtle}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.notesInput,
                    {
                      color: t.text,
                      borderColor: colors.gold[500],
                      backgroundColor: isDark ? '#000' : '#fff',
                    },
                  ]}
                  autoFocus
                />
                <View style={styles.notesActionsRow}>
                  <Pressable
                    onPress={() => {
                      setIsEditingNotes(false);
                      setNotesDraft(customer.notes || '');
                    }}
                    style={({ pressed }) => [
                      styles.cancelNoteBtn,
                      { borderColor: t.cardBorder, transform: [{ scale: pressed && !savingNotes ? 0.95 : 1 }] },
                    ]}
                    disabled={savingNotes}
                  >
                    <X size={14} color={t.textMuted} />
                    <Text style={[styles.cancelNoteText, { color: t.textMuted }]}>
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveNotes}
                    style={({ pressed }) => [
                      styles.saveNoteBtn,
                      notesSaveState === 'saved'
                        ? { backgroundColor: '#059669', borderColor: '#10B981' }
                        : { backgroundColor: colors.gold[500] },
                      { transform: [{ scale: pressed && !savingNotes ? 0.95 : 1 }] },
                    ]}
                    disabled={savingNotes}
                  >
                    {notesSaveState === 'saving' ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : notesSaveState === 'saved' ? (
                      <>
                        <Check size={14} color="#FFFFFF" />
                        <Text style={[styles.saveNoteText, { color: '#FFFFFF' }]}>Saved ✓</Text>
                      </>
                    ) : (
                      <>
                        <Check size={14} color="#000" />
                        <Text style={styles.saveNoteText}>Save Notes</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text
                style={[
                  styles.notesText,
                  {
                    color: customer.notes ? t.text : t.textSubtle,
                    fontStyle: customer.notes ? 'normal' : 'italic',
                  },
                ]}
              >
                {customer.notes || 'No private notes added yet. Tap "Edit" to record preferences.'}
              </Text>
            )}
          </View>

          {/* Quick Actions Bar */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleCall}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                  borderColor: 'rgba(52, 211, 153, 0.3)',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${customer.name}`}
            >
              <Phone size={16} color={isDark ? colors.status.success.dark : colors.status.success.light} />
              <Text
                style={[
                  styles.actionText,
                  { color: isDark ? colors.status.success.dark : colors.status.success.light },
                ]}
              >
                Call
              </Text>
            </Pressable>

            <Pressable
              onPress={handleWhatsApp}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isDark ? 'rgba(37, 211, 102, 0.15)' : 'rgba(37, 211, 102, 0.12)',
                  borderColor: 'rgba(37, 211, 102, 0.3)',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`WhatsApp ${customer.name}`}
            >
              <MessageSquare size={16} color="#25D366" />
              <Text style={[styles.actionText, { color: '#25D366' }]}>
                WhatsApp
              </Text>
            </Pressable>

            <Pressable
              onPress={handleNewBooking}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isDark ? 'rgba(214, 174, 107, 0.18)' : 'rgba(198, 151, 73, 0.15)',
                  borderColor: colors.gold[500],
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="New Booking for this customer"
            >
              <PlusCircle size={16} color={isDark ? colors.gold[400] : colors.gold[700]} />
              <Text
                style={[
                  styles.actionText,
                  { color: isDark ? colors.gold[400] : colors.gold[700], fontWeight: '700' },
                ]}
              >
                New Booking
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Section: Lifetime Financial Metrics */}
        <Text style={[styles.sectionHeading, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
          LIFETIME RELATIONSHIP SUMMARY
        </Text>

        <View style={styles.metricsGrid}>
          {/* Card 1: Total Bookings */}
          <Pressable
            style={({ pressed }) => [
              styles.metricCard,
              glassStyles.getCardStyle(isDark),
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
                transform: [{ scale: pressed ? 0.965 : 1 }],
              },
            ]}
          >
            <View style={styles.metricIconWrap}>
              <CalendarDays size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <Text style={[styles.metricLabel, { color: t.textMuted }]}>
              Total Bookings
            </Text>
            <RollingNumberTicker
              targetValue={metrics.totalBookings}
              style={[styles.metricValue, { color: t.text }]}
            />
          </Pressable>

          {/* Card 2: Total Contract Value */}
          <Pressable
            style={({ pressed }) => [
              styles.metricCard,
              glassStyles.getCardStyle(isDark),
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
                transform: [{ scale: pressed ? 0.965 : 1 }],
              },
            ]}
          >
            <View style={styles.metricIconWrap}>
              <Coins size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <Text style={[styles.metricLabel, { color: t.textMuted }]}>
              Lifetime Value
            </Text>
            <RollingNumberTicker
              targetValue={metrics.lifetimeContractValue}
              isCurrency
              prefix={currencySymbol}
              style={[styles.metricValue, { color: t.text }]}
            />
          </Pressable>

          {/* Card 3: Total Paid */}
          <Pressable
            style={({ pressed }) => [
              styles.metricCard,
              glassStyles.getCardStyle(isDark),
              {
                backgroundColor: t.card,
                borderColor: t.cardBorder,
                transform: [{ scale: pressed ? 0.965 : 1 }],
              },
            ]}
          >
            <View style={styles.metricIconWrap}>
              <TrendingUp size={18} color={isDark ? colors.status.success.dark : colors.status.success.light} />
            </View>
            <Text style={[styles.metricLabel, { color: t.textMuted }]}>
              Total Paid
            </Text>
            <RollingNumberTicker
              targetValue={metrics.totalPaid}
              isCurrency
              prefix={currencySymbol}
              style={[
                styles.metricValue,
                { color: isDark ? colors.status.success.dark : colors.status.success.light },
              ]}
            />
          </Pressable>

          {/* Card 4: Remaining Dues */}
          <Pressable
            style={({ pressed }) => [
              styles.metricCard,
              glassStyles.getCardStyle(isDark),
              {
                backgroundColor: t.card,
                borderColor:
                  metrics.remainingDues > 0
                    ? isDark
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(220, 38, 38, 0.4)'
                    : t.cardBorder,
                transform: [{ scale: pressed ? 0.965 : 1 }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.metricIconWrap,
                metrics.remainingDues > 0 ? { opacity: warningPulse } : null,
              ]}
            >
              <AlertTriangle
                size={18}
                color={
                  metrics.remainingDues > 0
                    ? isDark
                      ? colors.status.warning.dark
                      : colors.status.warning.light
                    : t.textMuted
                }
              />
            </Animated.View>
            <Text style={[styles.metricLabel, { color: t.textMuted }]}>
              Pending Dues
            </Text>
            <RollingNumberTicker
              targetValue={metrics.remainingDues}
              isCurrency
              prefix={currencySymbol}
              style={[
                styles.metricValue,
                {
                  color:
                    metrics.remainingDues > 0
                      ? isDark
                        ? colors.status.warning.dark
                        : colors.status.warning.light
                      : t.textMuted,
                },
              ]}
            />
          </Pressable>
        </View>

        {/* Section: Chronological Bookings */}
        <View style={styles.bookingsSectionHeader}>
          <Text style={[styles.sectionHeading, { color: isDark ? colors.gold[400] : colors.gold[700], marginBottom: 0 }]}>
            BOOKING HISTORY
          </Text>
          <View
            style={[
              styles.historyBadge,
              {
                backgroundColor: isDark
                  ? 'rgba(214, 174, 107, 0.15)'
                  : 'rgba(198, 151, 73, 0.12)',
              },
            ]}
          >
            <Text
              style={[
                styles.historyBadgeText,
                { color: isDark ? colors.gold[300] : colors.gold[700] },
              ]}
            >
              {bookings.length} {bookings.length === 1 ? 'event' : 'events'}
            </Text>
          </View>
        </View>

        {bookings.length === 0 ? (
          <View
            style={[
              styles.noBookingsCard,
              { backgroundColor: t.card, borderColor: t.cardBorder },
            ]}
          >
            <Text style={[styles.noBookingsText, { color: t.textSubtle }]}>
              No past bookings recorded for this customer yet.
            </Text>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {bookings.map((booking) => (
              <BookingSearchResultCard
                key={booking.booking_id}
                booking={booking}
                onPress={() => handleBookingPress(booking.booking_id)}
                isDark={isDark}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  backActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  backActionText: {
    color: '#000',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '700',
  },
  customerMeta: {
    flex: 1,
    gap: 3,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customerMobile: {
    fontSize: 14,
  },
  notesBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  notesBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  editNoteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  notesEditContainer: {
    gap: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  notesActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  cancelNoteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  saveNoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    width: '48.5%',
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  metricIconWrap: {
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  bookingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noBookingsCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  noBookingsText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  bookingsList: {
    gap: 2,
  },
});
