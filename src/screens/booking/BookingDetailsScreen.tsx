import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  Sparkles,
  User,
  DollarSign,
  FileText,
  History,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
  Tag,
  CreditCard,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { fetchBookingDetails } from '../../services/bookingService';
import { BookingDetailsData, BookingPaymentRecord } from '../../types/booking';
import { CancelBookingModal } from '../../components/booking';
import { RecordPaymentModal, PaymentReversalModal } from '../../components/khatabook';
import { RollingNumberTicker, SkeletonShimmer } from '../../components/dashboard';
import { shareBillOnWhatsApp } from '../../utils/whatsapp';
import { generateAndShareInvoicePdf } from '../../services/pdfService';
import { formatCurrency, isSlotElapsed } from '../../utils/dateUtils';
import { motionTokens } from '../../theme/motion';

type BookingDetailsRouteParams = {
  bookingId: string;
  isElapsed?: boolean;
};

export const BookingDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: BookingDetailsRouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const { hall, user, theme, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const bookingId = route.params?.bookingId;
  const [booking, setBooking] = useState<BookingDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [reversalTargetPayment, setReversalTargetPayment] = useState<BookingPaymentRecord | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const currencySymbol = hall?.currency_symbol || '₹';
  const isOwner = user?.role === 'owner';

  // Smooth entrance fade
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDetails = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const data = await fetchBookingDetails(bookingId, logout);
      setBooking(data);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.warn('Failed to load booking details:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId, logout, fadeAnim]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Handle Call Customer
  const handleCallCustomer = () => {
    if (booking?.customers?.mobile) {
      Linking.openURL(`tel:${booking.customers.mobile}`);
    }
  };

  // Handle WhatsApp Customer
  const handleWhatsAppCustomer = async () => {
    if (booking?.customers?.mobile) {
      await shareBillOnWhatsApp({
        hallName: hall?.name || 'Function Hall',
        hallPhone: hall?.phone || '',
        hallAddress: hall?.address || null,
        customerName: booking.customers.name || 'Customer',
        customerMobile: booking.customers.mobile,
        billNumber: booking.bill_number,
        eventType: booking.event_type || 'Event',
        eventDate: booking.start_date,
        slot: booking.slot,
        totalContract: booking.total_contract_amount || 0,
        totalPaid: booking.total_paid || 0,
        balanceDue: booking.pending_balance || 0,
        extraChargesItems: booking.extra_charges_items,
        promisedPayByDate: booking.latest_promised_pay_by_date,
        upiId: hall?.phone ? `${hall.phone.replace(/[^0-9]/g, '')}@upi` : null,
      });
    }
  };

  // Handle Generate & Share Real PDF Invoice
  const handleSharePdfBill = async () => {
    if (!booking || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const reversedIds = new Set(
        (booking.payments || [])
          .filter(p => p.is_reversal && p.reverses_payment_id)
          .map(p => p.reverses_payment_id)
      );
      const activePayments = (booking.payments || [])
        .filter(p => !p.is_reversal && !reversedIds.has(p.id))
        .map(p => ({
          date: new Date(p.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          mode: p.payment_mode,
          amount: Number(p.amount) || 0,
          notes: p.notes,
        }));

      await generateAndShareInvoicePdf({
        billNumber: booking.bill_number,
        hallName: hall?.name || 'Function Hall',
        hallPhone: hall?.phone || null,
        hallAddress: hall?.address || null,
        hallGst: hall?.gstNumber || null,
        customerName: booking.customers?.name || 'Customer',
        customerMobile: booking.customers?.mobile || null,
        eventType: booking.event_type || 'Event',
        eventDate: booking.start_date,
        endDate: booking.end_date,
        slot: booking.slot,
        packageName: booking.packages?.name || null,
        basePrice: Number(booking.booking_price) || 0,
        extraChargesItems: booking.extra_charges_items,
        extraChargesTotal: Number(booking.extra_charges) || 0,
        totalContract: Number(booking.total_contract_amount) || 0,
        totalPaid: Number(booking.total_paid) || 0,
        balanceDue: Number(booking.pending_balance) || 0,
        promisedPayByDate: booking.latest_promised_pay_by_date,
        payments: activePayments,
        currencySymbol,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading || !booking) {
    return (
      <View style={[styles.centerBox, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={colors.gold[500]} />
        <Text style={[styles.loadingText, { color: t.textMuted }]}>
          Loading contract details...
        </Text>
      </View>
    );
  }

  const isCancelled = booking.status === 'cancelled';
  const isPaid = (booking.pending_balance || 0) <= 0;
  const isElapsed =
    Boolean(route.params?.isElapsed) ||
    isSlotElapsed(booking.end_date || booking.start_date, booking.slot);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? colors.dark.background : colors.light.background },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={t.text} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerBillNumber, { color: t.text }]}>
            Bill #{booking.bill_number}
          </Text>
          <Text style={[styles.headerCustomer, { color: t.textMuted }]}>
            {booking.customers?.name || 'Customer'}
          </Text>
        </View>

        {/* Radiant Status Pill in Header */}
        <View
          style={[
            styles.headerStatusPill,
            {
              backgroundColor: isCancelled
                ? 'rgba(239, 68, 68, 0.16)'
                : isElapsed
                  ? isPaid
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.18)'
                      : 'rgba(198, 151, 73, 0.16)'
                    : 'rgba(244, 63, 94, 0.16)'
                  : isPaid
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'rgba(245, 158, 11, 0.16)',
              borderColor: isCancelled
                ? 'rgba(239, 68, 68, 0.35)'
                : isElapsed
                  ? isPaid
                    ? isDark
                      ? colors.gold[400]
                      : colors.gold[600]
                    : '#F43F5E'
                  : isPaid
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(245, 158, 11, 0.35)',
            },
          ]}
        >
          <Text
            style={[
              styles.headerStatusText,
              {
                color: isCancelled
                  ? '#EF4444'
                  : isElapsed
                    ? isPaid
                      ? isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                      : '#F43F5E'
                    : isPaid
                      ? '#10B981'
                      : '#F59E0B',
              },
            ]}
          >
            {isCancelled
              ? 'CANCELLED'
              : isElapsed
                ? isPaid
                  ? 'ELAPSED • PAID'
                  : 'ELAPSED • DUE'
                : isPaid
                  ? 'PAID'
                  : 'PENDING'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 84 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cancelled Banner if applicable */}
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <AlertTriangle size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledBannerTitle}>
                Booking Cancelled & Slot Released
              </Text>
              <Text style={styles.cancelledBannerReason}>
                Reason: {booking.cancel_reason || 'N/A'}
              </Text>
              {Number(booking.refund_amount || 0) > 0 && (
                <Text style={styles.cancelledBannerRefund}>
                  Refund Issued: {formatCurrency(Number(booking.refund_amount), currencySymbol)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Elapsed Historical Event Banner */}
        {isElapsed && !isCancelled && (
          <View
            style={[
              styles.elapsedBanner,
              {
                backgroundColor: isDark
                  ? 'rgba(214, 174, 107, 0.10)'
                  : 'rgba(198, 151, 73, 0.10)',
                borderColor: isDark
                  ? 'rgba(214, 174, 107, 0.28)'
                  : 'rgba(198, 151, 73, 0.32)',
              },
            ]}
          >
            <View
              style={[
                styles.elapsedIconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.20)'
                    : 'rgba(198, 151, 73, 0.20)',
                },
              ]}
            >
              <Clock size={20} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.elapsedBannerTitleRow}>
                <Text
                  style={[
                    styles.elapsedBannerTitle,
                    { color: isDark ? colors.gold[400] : colors.gold[600] },
                  ]}
                >
                  Concluded Event • Elapsed Record
                </Text>
                <View
                  style={[
                    styles.readOnlyBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.readOnlyBadgeText,
                      { color: isDark ? 'rgba(245, 245, 244, 0.7)' : 'rgba(28, 25, 23, 0.7)' },
                    ]}
                  >
                    READ-ONLY
                  </Text>
                </View>
              </View>
              <Text style={[styles.elapsedBannerDesc, { color: t.textMuted }]}>
                This event concluded on {booking.start_date} ({booking.slot.replace('_', ' ').toUpperCase()}). Contract parameters, guests, and schedule details are preserved in read-only mode.
              </Text>
              {Number(booking.pending_balance) > 0 ? (
                <View style={styles.elapsedNoticeRow}>
                  <AlertTriangle size={13} color={isDark ? '#FB7185' : '#E11D48'} />
                  <Text
                    style={[
                      styles.elapsedOverdueText,
                      { color: isDark ? '#FB7185' : '#E11D48' },
                    ]}
                  >
                    Outstanding balance of {formatCurrency(Number(booking.pending_balance || 0), currencySymbol)} is pending settlement.
                  </Text>
                </View>
              ) : (
                <View style={styles.elapsedNoticeRow}>
                  <CheckCircle2 size={13} color={isDark ? '#34D399' : '#059669'} />
                  <Text
                    style={[
                      styles.elapsedSettledText,
                      { color: isDark ? '#34D399' : '#059669' },
                    ]}
                  >
                    All contract payments are 100% settled and closed.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 1. Customer Card & Quick Actions */}
        <View style={[styles.sectionCard, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.customerHeaderRow}>
            <View style={styles.customerAvatarCircle}>
              <User size={20} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerNameText, { color: t.text }]}>
                {booking.customers?.name}
              </Text>
              <Text style={[styles.customerMobileText, { color: t.textMuted }]}>
                +91 {booking.customers?.mobile}
              </Text>
            </View>
          </View>

          {/* Quick Action Dial / WhatsApp / PDF Bill buttons with tactile scale */}
          <View style={styles.customerActionRow}>
            <Pressable
              onPress={handleCallCustomer}
              style={({ pressed }) => [
                styles.actionPillBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Call Customer"
            >
              <Phone size={15} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text numberOfLines={1} style={[styles.actionPillText, { color: t.text }]}>
                Call
              </Text>
            </Pressable>

            <Pressable
              onPress={handleWhatsAppCustomer}
              style={({ pressed }) => [
                styles.actionPillBtn,
                {
                  backgroundColor: 'rgba(37, 211, 102, 0.12)',
                  borderColor: 'rgba(37, 211, 102, 0.35)',
                  borderWidth: 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp Customer"
            >
              <MessageCircle size={15} color="#25D366" />
              <Text numberOfLines={1} style={[styles.actionPillText, { color: '#25D366' }]}>
                WhatsApp
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSharePdfBill}
              disabled={isGeneratingPdf}
              style={({ pressed }) => [
                styles.actionPillBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.14)'
                    : 'rgba(198, 151, 73, 0.14)',
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.38)'
                    : 'rgba(198, 151, 73, 0.40)',
                  borderWidth: 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Generate and Share PDF Bill"
            >
              {isGeneratingPdf ? (
                <ActivityIndicator
                  size="small"
                  color={isDark ? colors.gold[400] : colors.gold[600]}
                />
              ) : (
                <>
                  <FileText size={15} color={isDark ? colors.gold[400] : colors.gold[700]} />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.actionPillText,
                      { color: isDark ? colors.gold[400] : colors.gold[700] },
                    ]}
                  >
                    PDF Bill
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* 2. Financial Overview Card with RollingNumberTickers */}
        <View style={[styles.sectionCard, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.cardHeaderRow}>
            <DollarSign size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.cardTitle, { color: t.text }]}>Financial Breakdown</Text>
          </View>

          <View style={styles.financialGrid}>
            <View style={styles.financialCol}>
              <Text style={[styles.financialLabel, { color: t.textMuted }]}>
                Total Contract
              </Text>
              <RollingNumberTicker
                targetValue={booking.total_contract_amount || 0}
                isCurrency
                prefix={currencySymbol}
                style={[styles.financialValue, { color: t.text }]}
              />
            </View>

            <View style={styles.financialCol}>
              <Text style={[styles.financialLabel, { color: t.textMuted }]}>
                Total Paid
              </Text>
              <RollingNumberTicker
                targetValue={booking.total_paid || 0}
                isCurrency
                prefix={currencySymbol}
                style={[styles.financialValue, { color: '#10B981' }]}
              />
            </View>

            <View style={styles.financialCol}>
              <Text style={[styles.financialLabel, { color: t.textMuted }]}>
                Pending Balance
              </Text>
              <RollingNumberTicker
                targetValue={booking.pending_balance || 0}
                isCurrency
                prefix={currencySymbol}
                style={[
                  styles.financialValue,
                  {
                    color:
                      (booking.pending_balance || 0) > 0
                        ? isDark
                          ? '#FB7185'
                          : '#E11D48'
                        : '#10B981',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 3. Event & Schedule Contract */}
        <View style={[styles.sectionCard, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.cardHeaderRow}>
            <Calendar size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.cardTitle, { color: t.text }]}>
              Schedule & Contract Terms
            </Text>
          </View>

          <View style={styles.detailItemRow}>
            <Text style={[styles.detailKey, { color: t.textMuted }]}>Event Date</Text>
            <Text style={[styles.detailValue, { color: t.text }]}>
              {booking.start_date === booking.end_date
                ? booking.start_date
                : `${booking.start_date} to ${booking.end_date}`}
            </Text>
          </View>

          <View style={styles.detailItemRow}>
            <Text style={[styles.detailKey, { color: t.textMuted }]}>Slot</Text>
            <Text style={[styles.detailValue, { color: t.text }]}>
              {booking.slot.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          <View style={styles.detailItemRow}>
            <Text style={[styles.detailKey, { color: t.textMuted }]}>Event Type</Text>
            <Text style={[styles.detailValue, { color: t.text }]}>
              {booking.event_type}
            </Text>
          </View>

          <View style={styles.detailItemRow}>
            <Text style={[styles.detailKey, { color: t.textMuted }]}>Expected Guests</Text>
            <Text style={[styles.detailValue, { color: t.text }]}>
              {booking.expected_guests} Guests
            </Text>
          </View>

          <View style={styles.detailItemRow}>
            <Text style={[styles.detailKey, { color: t.textMuted }]}>Package</Text>
            <Text
              style={[
                styles.detailValue,
                { color: isDark ? colors.gold[400] : colors.gold[600] },
              ]}
            >
              {booking.packages?.name || 'Custom (No Package)'}
            </Text>
          </View>

          <View style={styles.detailItemRow}>
            <Text style={[styles.detailKey, { color: t.textMuted }]}>Base Hall Price</Text>
            <Text style={[styles.detailValue, { color: t.text }]}>
              {formatCurrency(booking.booking_price || 0, currencySymbol)}
            </Text>
          </View>

          {(Number(booking.extra_charges) > 0 || (booking.extra_charges_items && booking.extra_charges_items.length > 0)) && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <View style={styles.detailItemRow}>
                <Text style={[styles.detailKey, { color: t.textMuted }]}>Extra Charges</Text>
                <Text style={[styles.detailValue, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                  +{formatCurrency(booking.extra_charges || 0, currencySymbol)}
                </Text>
              </View>

              {booking.extra_charges_items?.map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[
                    styles.detailItemRow,
                    {
                      paddingLeft: 12,
                      paddingVertical: 3,
                    },
                  ]}
                >
                  <Text style={[styles.detailKey, { fontSize: 12, color: t.textSubtle }]}>
                    • {item.title}{item.notes ? ` (${item.notes})` : ''}
                  </Text>
                  <Text style={[styles.detailValue, { fontSize: 12, color: t.textMuted }]}>
                    {formatCurrency(item.amount, currencySymbol)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {booking.notes && (
            <View style={styles.notesBox}>
              <Text style={[styles.notesLabel, { color: t.textMuted }]}>Notes:</Text>
              <Text style={[styles.notesText, { color: t.text }]}>{booking.notes}</Text>
            </View>
          )}
        </View>

        {/* 4. Payments Ledger */}
        <View style={[styles.sectionCard, glassStyles.getCardStyle(isDark)]}>
          <View style={styles.cardHeaderRow}>
            <History size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
            <Text style={[styles.cardTitle, { color: t.text }]}>
              Payments Ledger ({booking.payments?.length || 0})
            </Text>
          </View>

          {(!booking.payments || booking.payments.length === 0) ? (
            <Text style={[styles.emptyLedgerText, { color: t.textMuted }]}>
              No advance payments recorded yet.
            </Text>
          ) : (
            (() => {
              const reversedIds = new Set(
                booking.payments
                  .filter(p => p.is_reversal && p.reverses_payment_id)
                  .map(p => p.reverses_payment_id)
              );

              return booking.payments.map((p, idx) => {
                const isReversed = reversedIds.has(p.id);
                const canReverse = !p.is_reversal && !isReversed && !isCancelled;

                return (
                  <View
                    key={p.id || idx}
                    style={[
                      styles.ledgerItemRow,
                      {
                        borderBottomColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.06)',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.ledgerAmount,
                            { color: p.is_reversal ? '#EF4444' : '#10B981' },
                          ]}
                        >
                          {p.is_reversal ? '-' : '+'}
                          {formatCurrency(p.amount, currencySymbol)}
                        </Text>

                        {p.is_reversal && (
                          <View style={styles.reversalPill}>
                            <Text style={styles.reversalPillText}>REVERSAL</Text>
                          </View>
                        )}

                        {isReversed && (
                          <View style={styles.reversedBadge}>
                            <Text style={styles.reversedBadgeText}>REVERSED</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.ledgerSubtext, { color: t.textMuted }]}>
                        Mode: {p.payment_mode.toUpperCase()} • Recorded by{' '}
                        {p.recorded_by_member?.username || 'Staff'}
                      </Text>
                      {Boolean(p.notes) && (
                        <Text style={[styles.ledgerNotesText, { color: t.textMuted }]}>
                          {p.notes}
                        </Text>
                      )}
                    </View>

                    <View style={styles.ledgerRightBadge}>
                      <Text style={[styles.ledgerDateText, { color: t.textMuted }]}>
                        {new Date(p.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </Text>

                      {canReverse && (
                        <Pressable
                          onPress={() => setReversalTargetPayment(p)}
                          style={({ pressed }) => [
                            styles.reverseActionBtn,
                            { transform: [{ scale: pressed ? 0.94 : 1 }] },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Reverse payment of ${formatCurrency(p.amount, currencySymbol)}`}
                        >
                          <Text style={styles.reverseActionText}>Reverse</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              });
            })()
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      {!isCancelled && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
              borderTopColor: isDark
                ? 'rgba(214, 174, 107, 0.20)'
                : 'rgba(198, 151, 73, 0.18)',
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          {/* Cancel Booking Button (Owner Only, ONLY FOR ACTIVE UPCOMING EVENTS) */}
          {isOwner && !isElapsed && (
            <Pressable
              onPress={() => setIsCancelModalOpen(true)}
              style={({ pressed }) => [
                styles.cancelActionBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(239, 68, 68, 0.08)',
                  borderColor: isDark
                    ? 'rgba(239, 68, 68, 0.28)'
                    : 'rgba(239, 68, 68, 0.20)',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel Booking"
            >
              <Trash2
                size={18}
                color={isDark ? '#F87171' : '#DC2626'}
                strokeWidth={2.2}
              />
            </Pressable>
          )}

          {/* Edit Booking Button: ONLY SHOWN IF NOT ELAPSED */}
          {!isElapsed && (
            <Pressable
              onPress={() =>
                navigation.navigate('BookingForm', {
                  mode: 'edit',
                  bookingId: booking.id,
                })
              }
              style={({ pressed }) => [
                styles.editBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.10)'
                    : '#FFFFFF',
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.35)'
                    : 'rgba(198, 151, 73, 0.35)',
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Details"
            >
              <Pencil
                size={16}
                color={isDark ? colors.gold[400] : colors.gold[700]}
                strokeWidth={2.2}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.editBtnText,
                  { color: isDark ? colors.gold[400] : colors.gold[700] },
                ]}
              >
                {Number(booking.pending_balance) > 0 ? 'Edit' : 'Edit Details'}
              </Text>
            </Pressable>
          )}

          {/* Record Payment Button (if balance due) */}
          {Number(booking.pending_balance) > 0 && (
            <Pressable
              onPress={() => setIsRecordPaymentOpen(true)}
              style={({ pressed }) => [
                styles.recordPaymentWrap,
                {
                  flex: isElapsed ? 1 : 1.6,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isElapsed ? 'Record Due Settlement' : 'Record Payment'}
            >
              <LinearGradient
                colors={colors.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recordPaymentGradient}
              >
                <CreditCard size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text numberOfLines={1} style={styles.recordPaymentBarBtnText}>
                  {isElapsed ? 'Record Settlement' : 'Record Payment'}
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Share PDF Receipt if elapsed and fully settled */}
          {isElapsed && Number(booking.pending_balance) <= 0 && (
            <Pressable
              onPress={handleSharePdfBill}
              disabled={isGeneratingPdf}
              style={({ pressed }) => [
                styles.recordPaymentWrap,
                {
                  flex: 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share Completed PDF Receipt"
            >
              <LinearGradient
                colors={colors.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recordPaymentGradient}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FileText size={16} color="#FFFFFF" strokeWidth={2.2} />
                    <Text numberOfLines={1} style={styles.recordPaymentBarBtnText}>
                      Share PDF Receipt
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <CancelBookingModal
          visible={isCancelModalOpen}
          booking={booking}
          currencySymbol={currencySymbol}
          isDark={isDark}
          onClose={() => setIsCancelModalOpen(false)}
          onSuccess={() => {
            loadDetails();
          }}
        />
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          visible={isRecordPaymentOpen}
          bookingId={booking.id}
          billNumber={booking.bill_number}
          customerName={booking.customers?.name || 'Customer'}
          customerMobile={booking.customers?.mobile || ''}
          pendingBalance={Number(booking.pending_balance) || 0}
          currencySymbol={currencySymbol}
          isDark={isDark}
          onClose={() => setIsRecordPaymentOpen(false)}
          onSuccess={() => {
            loadDetails();
          }}
        />
      )}

      {/* Payment Reversal Modal */}
      {reversalTargetPayment && (
        <PaymentReversalModal
          visible={Boolean(reversalTargetPayment)}
          paymentId={reversalTargetPayment.id}
          amount={reversalTargetPayment.amount}
          paymentMode={reversalTargetPayment.payment_mode}
          recordedAt={reversalTargetPayment.created_at}
          recordedBy={reversalTargetPayment.recorded_by_member?.username || 'Staff'}
          currencySymbol={currencySymbol}
          isDark={isDark}
          onClose={() => setReversalTargetPayment(null)}
          onSuccess={() => {
            loadDetails();
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerBillNumber: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerCustomer: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  headerStatusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 16,
    padding: 14,
  },
  cancelledBannerTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelledBannerReason: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 2,
  },
  cancelledBannerRefund: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(198, 151, 73, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerNameText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  customerMobileText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  customerActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  financialCol: {
    flex: 1,
  },
  financialLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailKey: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  notesBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(198, 151, 73, 0.08)',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyLedgerText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  ledgerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ledgerAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  ledgerSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  ledgerRightBadge: {
    alignItems: 'flex-end',
  },
  ledgerDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  recordPaymentWrap: {
    height: 48,
    borderRadius: 16,
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 4,
  },
  recordPaymentGradient: {
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  recordPaymentBarBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  reversalPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reversalPillText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  reversedBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.20)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reversedBadgeText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '800',
  },
  reverseActionBtn: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  reverseActionText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerNotesText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  elapsedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  elapsedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elapsedBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  elapsedBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  readOnlyBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  readOnlyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  elapsedBannerDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  elapsedNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  elapsedOverdueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  elapsedSettledText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shareReceiptFullBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareReceiptFullBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
