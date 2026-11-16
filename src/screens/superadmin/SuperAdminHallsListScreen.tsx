import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  X,
  Building,
  Phone,
  User,
  ShieldCheck,
  ChevronRight,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { fetchSuperAdminHalls } from '../../services/superadminService';
import {
  SuperAdminHallItem,
  SuperAdminHallFilter,
} from '../../types/superadmin';
import { EmptyStateCard } from '../../components/EmptyStateCard';

type HallsListRouteParams = {
  initialStatus?: SuperAdminHallFilter;
};

export const SuperAdminHallsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: HallsListRouteParams }, 'params'>>();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SuperAdminHallFilter>(
    route.params?.initialStatus || 'all'
  );

  const [halls, setHalls] = useState<SuperAdminHallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const loadHalls = useCallback(
    async (queryText = searchQuery, filterVal = selectedFilter, isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);
        const data = await fetchSuperAdminHalls({
          search: queryText,
          status: filterVal,
          limit: 50,
        });
        setHalls(data);
      } catch (err) {
        console.warn('[SuperAdminHallsList] Error loading halls:', err);
      } finally {
        if (!isSilent) setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, selectedFilter]
  );

  useEffect(() => {
    loadHalls();
  }, [selectedFilter]);

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadHalls(text, selectedFilter, true);
    }, 300);
  };

  const handlePullRefresh = () => {
    setRefreshing(true);
    loadHalls(searchQuery, selectedFilter, true);
  };

  const filterChips: { id: SuperAdminHallFilter; label: string }[] = [
    { id: 'all', label: 'All Halls' },
    { id: 'exempt', label: 'Exempt (Bypass)' },
    { id: 'active', label: 'Active Paid' },
    { id: 'trial', label: 'In Trial' },
    { id: 'grace_period', label: 'Grace Period' },
    { id: 'suspended', label: 'Suspended' },
  ];

  // Render Status Badge for a Hall
  const renderStatusBadge = (hall: SuperAdminHallItem) => {
    if (hall.is_subscription_exempt) {
      return (
        <View style={[styles.badge, styles.exemptBadge]}>
          <Sparkles size={10} color="#10B981" />
          <Text style={styles.exemptBadgeText}>LIFETIME BYPASS</Text>
        </View>
      );
    }

    if (hall.is_suspended) {
      return (
        <View style={[styles.badge, styles.dangerBadge]}>
          <AlertTriangle size={10} color={colors.status.danger.light} />
          <Text style={styles.dangerBadgeText}>SUSPENDED</Text>
        </View>
      );
    }

    if (hall.subscription_status === 'active') {
      return (
        <View style={[styles.badge, styles.successBadge]}>
          <Text style={styles.successBadgeText}>ACTIVE PAID</Text>
        </View>
      );
    }

    if (hall.subscription_status === 'grace_period') {
      return (
        <View style={[styles.badge, styles.warningBadge]}>
          <Text style={styles.warningBadgeText}>GRACE PERIOD</Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, styles.trialBadge]}>
        <Clock size={10} color={isDark ? colors.gold[400] : colors.gold[700]} />
        <Text style={[styles.trialBadgeText, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
          FREE TRIAL
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
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
          <Text style={[styles.headerTitle, { color: t.text }]}>Halls Directory</Text>
          <Text style={[styles.headerSub, { color: t.textMuted }]}>
            Multi-Tenant Search & Support Controls
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{halls.length} Halls</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchInputBox,
            glassStyles.getInputStyle(isDark),
            { backgroundColor: isDark ? colors.dark.input : colors.light.input },
          ]}
        >
          <Search size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search hall name, phone, owner username..."
            placeholderTextColor={t.textSubtle}
            style={[styles.searchInput, { color: t.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => handleSearchChange('')}
              style={({ pressed }) => [
                { padding: 4, transform: [{ scale: pressed ? 0.88 : 1 }] },
              ]}
            >
              <X size={16} color={t.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Horizontal Filter Chips */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterChips}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.id;
            return (
              <Pressable
                onPress={() => setSelectedFilter(item.id)}
                style={({ pressed }) => [
                  styles.filterChip,
                  isSelected
                    ? {
                        backgroundColor: isDark ? colors.gold[400] : colors.gold[600],
                        borderColor: isDark ? colors.gold[400] : colors.gold[600],
                      }
                    : {
                        backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(198,151,73,0.2)',
                      },
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : isDark ? colors.gold[400] : colors.gold[700] },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Halls List */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.gold[500]} />
          <Text style={[styles.loadingLabel, { color: t.textMuted }]}>
            Loading live tenant directory...
          </Text>
        </View>
      ) : (
        <FlatList
          data={halls}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullRefresh}
              tintColor={isDark ? colors.gold[400] : colors.gold[600]}
              colors={[colors.gold[500]]}
            />
          }
          ListEmptyComponent={
            <EmptyStateCard
              variant="timeline-empty"
              title="No Halls Found"
              description="No function halls matched your query or filter criteria in the live database."
              actionLabel="Reset Search Filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedFilter('all');
                loadHalls('', 'all', false);
              }}
              style={{ marginTop: 20 }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('SuperAdminHallDetail', { hall: item })}
              style={({ pressed }) => [
                styles.hallCard,
                glassStyles.getCardStyle(isDark),
                { transform: [{ scale: pressed ? 0.965 : 1 }] },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <Building size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
                  <Text style={[styles.hallName, { color: t.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                {renderStatusBadge(item)}
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.infoCol}>
                  <View style={styles.metaRow}>
                    <Phone size={12} color={t.textMuted} />
                    <Text style={[styles.metaText, { color: t.textMuted }]}>
                      {item.phone}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <User size={12} color={t.textMuted} />
                    <Text style={[styles.metaText, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                      @{item.owner_username || 'unassigned'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rightAction}>
                  <View style={styles.slotBadge}>
                    <Text style={[styles.slotBadgeText, { color: t.textMuted }]}>
                      {item.slot_mode === 'full_day' ? 'Full Day' : 'Two-Slot'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
                </View>
              </View>

              {item.address ? (
                <Text style={[styles.addressText, { color: t.textSubtle }]} numberOfLines={1}>
                  📍 {item.address}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
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
  countBadge: {
    backgroundColor: 'rgba(214, 174, 107, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.35)',
  },
  countBadgeText: {
    color: colors.gold[400],
    fontSize: 10,
    fontWeight: '800',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  chipsContainer: {
    maxHeight: 46,
    marginBottom: 6,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 100, // Space for floating bottom tab bar
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    gap: 10,
  },
  hallCard: {
    padding: 16,
    borderRadius: 20,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hallName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  exemptBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  exemptBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dangerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  dangerBadgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  warningBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  warningBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
  },
  trialBadge: {
    backgroundColor: 'rgba(214, 174, 107, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.3)',
  },
  trialBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 11,
    lineHeight: 15,
  },
  centered: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

