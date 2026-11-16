import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Radio,
  ShieldAlert,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { AuthInput } from '../../components/AuthInput';
import {
  KhatabookSummaryHeader,
  KhatabookFilterChips,
  KhatabookCard,
  RecordPaymentModal,
} from '../../components/khatabook';
import {
  fetchKhatabookDues,
  computeKhatabookTotals,
  subscribeToPaymentChanges,
} from '../../services/khatabookService';
import { shareBillOnWhatsApp } from '../../utils/whatsapp';
import { KhatabookDueItem, KhatabookFilter } from '../../types/khatabook';
import { ScreenBackground } from '../../components/common';

type KhatabookRouteParams = {
  initialFilter?: KhatabookFilter;
};

export const KhatabookScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: KhatabookRouteParams }, 'params'>>();
  const { user, hall, theme, logout } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const currencySymbol = hall?.currency_symbol || '₹';

  // Data & Filter State
  const [dues, setDues] = useState<KhatabookDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<KhatabookFilter>(
    route.params?.initialFilter || 'all'
  );

  // Active Selected Due for Payment Modal
  const [activePaymentDue, setActivePaymentDue] = useState<KhatabookDueItem | null>(null);

  // Realtime Live Sync Breathing Dot Animation
  const liveSyncDotAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(liveSyncDotAnim, {
          toValue: 1.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(liveSyncDotAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, []);

  // Fetch dues from PostgreSQL
  const loadDues = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await fetchKhatabookDues(logout);
      setDues(data);
    } catch (err) {
      console.warn('[KhatabookScreen] Failed to load dues:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    loadDues();

    // Subscribe to Realtime payment / booking updates
    const unsubscribe = subscribeToPaymentChanges(() => {
      loadDues(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadDues]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDues(true);
  };

  // Metrics computation
  const metrics = useMemo(() => computeKhatabookTotals(dues), [dues]);

  // Search & Filter filtering
  const filteredDues = useMemo(() => {
    return dues.filter(item => {
      // 1. Tab Filter
      if (selectedFilter === 'overdue' && item.payment_status !== 'overdue') return false;
      if (selectedFilter === 'upcoming' && item.payment_status !== 'upcoming') return false;
      if (selectedFilter === 'credit' && !item.latest_promised_pay_by_date) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = item.customer_name?.toLowerCase().includes(query);
        const matchMobile = item.customer_mobile?.includes(query);
        const matchBill = item.bill_number?.toLowerCase().includes(query);
        const matchEvent = item.event_type?.toLowerCase().includes(query);
        return matchName || matchMobile || matchBill || matchEvent;
      }

      return true;
    });
  }, [dues, selectedFilter, searchQuery]);

  // Handle WhatsApp Bill Sharing
  const handleWhatsAppBill = async (item: KhatabookDueItem) => {
    const success = await shareBillOnWhatsApp({
      hallName: hall?.name || 'Function Hall',
      hallPhone: hall?.phone || '',
      hallAddress: hall?.address || null,
      customerName: item.customer_name,
      customerMobile: item.customer_mobile,
      billNumber: item.bill_number,
      eventType: item.event_type,
      eventDate: item.start_date,
      slot: item.slot,
      totalContract: item.total_contract_amount,
      totalPaid: item.total_paid,
      balanceDue: item.pending_balance,
      promisedPayByDate: item.latest_promised_pay_by_date,
      upiId: hall?.phone ? `${hall.phone.replace(/[^0-9]/g, '')}@upi` : null,
    });

    if (!success) {
      Alert.alert(
        'WhatsApp Not Available',
        'Could not open WhatsApp on this device. Please verify WhatsApp is installed.'
      );
    }
  };

  // Strict Role & Permission Enforcement
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const canAccessKhatabook = isOwner || Boolean((user as any)?.screenAccess?.khatabook);

  if (!canAccessKhatabook) {
    return (
      <ScreenBackground isDark={isDark}>
        <SafeAreaView style={styles.safeArea}>
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
              Khatabook Access Restricted
            </Text>
            <Text style={[styles.restrictedSubtitle, { color: t.textMuted }]}>
              Your staff account does not have permission to view or manage financial ledger dues. Please contact the Hall Owner.
            </Text>
            <TouchableOpacity
              style={[
                styles.backToHomeBtn,
                { backgroundColor: isDark ? colors.dark.card : colors.light.card },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backToHomeBtnText, { color: t.text }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
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

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: t.text }]}>
            Khatabook
          </Text>
          <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
            Customer Dues & Balance Recovery
          </Text>
        </View>

        {/* Live Realtime Sync Indicator */}
        <View style={styles.liveSyncBadge}>
          <Animated.View
            style={[
              styles.liveSyncDot,
              {
                transform: [{ scale: liveSyncDotAnim }],
              },
            ]}
          />
          <Text style={styles.liveSyncText}>Live Sync</Text>
        </View>
      </View>

      {/* Main Content List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.gold[500]} />
          <Text style={[styles.loadingText, { color: t.textMuted }]}>
            Loading dues ledger...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDues}
          keyExtractor={item => item.booking_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.gold[500]}
              colors={[colors.gold[500]]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Summary Metrics Row */}
              <KhatabookSummaryHeader
                metrics={metrics}
                currencySymbol={currencySymbol}
                isDark={isDark}
              />

              {/* Search Bar */}
              <View style={styles.searchWrapper}>
                <AuthInput
                  label=""
                  placeholder="Search customer, phone, or bill..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  leftIcon={<Search size={16} color={t.textMuted} />}
                  showClearButton={Boolean(searchQuery)}
                  onClear={() => setSearchQuery('')}
                />
              </View>

              {/* Filter Tabs */}
              <KhatabookFilterChips
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                metrics={metrics}
                isDark={isDark}
              />
            </View>
          }
          renderItem={({ item }) => (
            <KhatabookCard
              item={item}
              currencySymbol={currencySymbol}
              isDark={isDark}
              onPressCard={() =>
                navigation.navigate('BookingDetails', {
                  bookingId: item.booking_id,
                })
              }
              onPressWhatsApp={() => handleWhatsAppBill(item)}
              onPressRecordPayment={() => setActivePaymentDue(item)}
            />
          )}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, glassStyles.getCardStyle(isDark)]}>
              <CheckCircle2 size={36} color="#10B981" />
              <Text style={[styles.emptyTitle, { color: t.text }]}>
                {searchQuery
                  ? 'No matching dues found'
                  : 'All dues collected! 🎉'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: t.textMuted }]}>
                {searchQuery
                  ? 'Try searching with a different name, phone, or bill number.'
                  : 'There are no outstanding balances in this category.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Record Payment Modal */}
      {activePaymentDue && (
        <RecordPaymentModal
          visible={Boolean(activePaymentDue)}
          onClose={() => setActivePaymentDue(null)}
          onSuccess={() => loadDues(true)}
          bookingId={activePaymentDue.booking_id}
          billNumber={activePaymentDue.bill_number}
          customerName={activePaymentDue.customer_name}
          customerMobile={activePaymentDue.customer_mobile}
          pendingBalance={Number(activePaymentDue.pending_balance) || 0}
          currencySymbol={currencySymbol}
          isDark={isDark}
        />
      )}
    </SafeAreaView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  liveSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveSyncText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listHeader: {
    gap: 10,
    marginBottom: 12,
  },
  searchWrapper: {
    marginTop: -8,
    marginBottom: -4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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

