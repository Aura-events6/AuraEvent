import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Pressable,
} from 'react-native';
import {
  ArrowLeft,
  Users,
  CalendarDays,
  Search as SearchIcon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { SearchInput } from '../../components/search/SearchInput';
import { CustomerSearchResultCard } from '../../components/search/CustomerSearchResultCard';
import { BookingSearchResultCard } from '../../components/search/BookingSearchResultCard';
import { searchDirectory } from '../../services/searchService';
import { CustomerSearchResult, BookingSearchResult } from '../../types/search';
import { ScreenBackground } from '../../components/common';

type SearchFilterTab = 'all' | 'customers' | 'bookings';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { hall, user, theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchFilterTab>('all');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [bookings, setBookings] = useState<BookingSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const hallId = hall?.id || (user && 'hallId' in user ? (user as any).hallId : undefined);

  // Perform search when query changes (SearchInput is already debounced)
  useEffect(() => {
    let isMounted = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setCustomers([]);
      setBookings([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    searchDirectory(trimmed, hallId)
      .then((results) => {
        if (isMounted) {
          setCustomers(results.customers);
          setBookings(results.bookings);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Search directory error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query, hallId]);

  const handleCustomerPress = (customer: CustomerSearchResult) => {
    navigation.navigate('CustomerProfile', { customerId: customer.id });
  };

  const handleBookingPress = (booking: BookingSearchResult) => {
    navigation.navigate('BookingDetails', { bookingId: booking.booking_id });
  };

  const filteredItems = useMemo(() => {
    type UnifiedItem =
      | { type: 'header'; title: string; count: number }
      | { type: 'customer'; data: CustomerSearchResult }
      | { type: 'booking'; data: BookingSearchResult };

    const items: UnifiedItem[] = [];

    if (activeTab === 'all' || activeTab === 'customers') {
      if (customers.length > 0) {
        items.push({
          type: 'header',
          title: 'Matching Customers',
          count: customers.length,
        });
        customers.forEach((c) => items.push({ type: 'customer', data: c }));
      }
    }

    if (activeTab === 'all' || activeTab === 'bookings') {
      if (bookings.length > 0) {
        items.push({
          type: 'header',
          title: 'Matching Bookings',
          count: bookings.length,
        });
        bookings.forEach((b) => items.push({ type: 'booking', data: b }));
      }
    }

    return items;
  }, [activeTab, customers, bookings]);

  const totalResultsCount = customers.length + bookings.length;

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />

      {/* Screen Header */}
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
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={t.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text }]}>Directory Search</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <SearchInput
          placeholder="Search by customer, mobile, or bill #..."
          onSearch={setQuery}
          isDark={isDark}
          autoFocus={true}
        />
      </View>

      {/* Filter Tabs (All / Customers / Bookings) */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab('all')}
          style={({ pressed }) => [
            styles.tabChip,
            activeTab === 'all'
              ? {
                  backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                  borderColor: isDark ? colors.gold[400] : colors.gold[600],
                }
              : {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: t.cardBorder,
                },
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
        >
          <Text
            style={[
              styles.tabChipText,
              {
                color: activeTab === 'all' ? '#000' : t.textMuted,
                fontWeight: activeTab === 'all' ? '700' : '500',
              },
            ]}
          >
            All ({totalResultsCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('customers')}
          style={({ pressed }) => [
            styles.tabChip,
            activeTab === 'customers'
              ? {
                  backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                  borderColor: isDark ? colors.gold[400] : colors.gold[600],
                }
              : {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: t.cardBorder,
                },
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'customers' }}
        >
          <Users
            size={14}
            color={activeTab === 'customers' ? '#000' : t.textMuted}
          />
          <Text
            style={[
              styles.tabChipText,
              {
                color: activeTab === 'customers' ? '#000' : t.textMuted,
                fontWeight: activeTab === 'customers' ? '700' : '500',
              },
            ]}
          >
            Customers ({customers.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('bookings')}
          style={({ pressed }) => [
            styles.tabChip,
            activeTab === 'bookings'
              ? {
                  backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                  borderColor: isDark ? colors.gold[400] : colors.gold[600],
                }
              : {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: t.cardBorder,
                },
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'bookings' }}
        >
          <CalendarDays
            size={14}
            color={activeTab === 'bookings' ? '#000' : t.textMuted}
          />
          <Text
            style={[
              styles.tabChipText,
              {
                color: activeTab === 'bookings' ? '#000' : t.textMuted,
                fontWeight: activeTab === 'bookings' ? '700' : '500',
              },
            ]}
          >
            Bookings ({bookings.length})
          </Text>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <View style={styles.resultsArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold[500]} />
            <Text style={[styles.loadingText, { color: t.textMuted }]}>
              Searching records...
            </Text>
          </View>
        ) : !hasSearched ? (
          /* Initial Empty State */
          <View style={styles.emptyPromptContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: isDark ? colors.dark.card : colors.light.card },
              ]}
            >
              <SearchIcon size={36} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <Text style={[styles.emptyPromptTitle, { color: t.text }]}>
              Fast Instant Search
            </Text>
            <Text style={[styles.emptyPromptSub, { color: t.textMuted }]}>
              Type customer names, phone numbers, or booking bill numbers (e.g., "AURA-2026") to lookup profiles and contracts.
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          /* No Results Found */
          <View style={styles.noResultsContainer}>
            <Text style={[styles.noResultsTitle, { color: t.text }]}>
              No Results Found
            </Text>
            <Text style={[styles.noResultsSub, { color: t.textMuted }]}>
              We couldn't find any {activeTab !== 'all' ? activeTab : 'customers or bookings'} matching "{query}".
            </Text>
          </View>
        ) : (
          /* Results List */
          <FlatList
            data={filteredItems}
            keyExtractor={(item) =>
              item.type === 'header'
                ? `header-${item.title}`
                : item.type === 'customer'
                ? `cust-${item.data.id}`
                : `book-${item.data.booking_id}`
            }
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.sectionHeaderRow}>
                    <Text
                      style={[
                        styles.sectionHeaderTitle,
                        { color: isDark ? colors.gold[400] : colors.gold[700] },
                      ]}
                    >
                      {item.title.toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.sectionBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(214, 174, 107, 0.15)'
                            : 'rgba(198, 151, 73, 0.1)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sectionBadgeText,
                          { color: isDark ? colors.gold[300] : colors.gold[700] },
                        ]}
                      >
                        {item.count}
                      </Text>
                    </View>
                  </View>
                );
              }

              if (item.type === 'customer') {
                return (
                  <CustomerSearchResultCard
                    customer={item.data}
                    onPress={() => handleCustomerPress(item.data)}
                    isDark={isDark}
                  />
                );
              }

              return (
                <BookingSearchResultCard
                  booking={item.data}
                  onPress={() => handleBookingPress(item.data)}
                  isDark={isDark}
                />
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  </ScreenBackground>
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
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabChipText: {
    fontSize: 13,
  },
  resultsArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyPromptTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyPromptSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noResultsSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
