import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  Crown,
  Search,
  X,
  Plus,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Receipt,
  Calendar as CalendarIcon,
  Fuel,
  Zap,
  Wrench,
  Sparkles,
  Users,
  Package,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { ScreenBackground } from '../../components/common';
import {
  ExpenseCategory,
  ExpenseFormPayload,
  ExpensePaymentMode,
  ExpenseStatusFilter,
  ExpenseSummaryKPIs,
  HallExpense,
  EXPENSE_CATEGORIES_META,
} from '../../types/expenses';
import {
  getHallExpenses,
  recordExpense,
  updateExpense,
  deleteExpense,
  subscribeToHallExpenses,
  fetchRecentBookingsForAllocation,
  fetchAllocatableBookings,
  BookingAllocationOption,
  AllocatableBooking,
} from '../../services/expenseService';
import { ExpenseSheetModal } from '../../components/expenses/ExpenseSheetModal';
import { RollingNumberTicker } from '../../components/dashboard/RollingNumberTicker';

export const ExpenseTrackerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, hall, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;

  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const hallId = hall?.id || (user as any)?.hallId;
  const currencySymbol = hall?.currency_symbol || '₹';

  // State: Data
  const [expenses, setExpenses] = useState<HallExpense[]>([]);
  const [allocationOptions, setAllocationOptions] = useState<BookingAllocationOption[]>([]);
  const [allocatableBookings, setAllocatableBookings] = useState<AllocatableBooking[]>([]);
  const [kpis, setKpis] = useState<ExpenseSummaryKPIs>({
    totalSpend: 0,
    paidSpend: 0,
    pendingSpend: 0,
    pendingCount: 0,
    categoryTotals: {
      diesel_fuel: 0,
      utilities: 0,
      maintenance: 0,
      vendor_payout: 0,
      staff_salary: 0,
      supplies: 0,
      other: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [selectedPeriod, setSelectedPeriod] = useState<'current_month' | 'last_month' | 'all'>('current_month');
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [subView, setSubView] = useState<'ledger' | 'split'>('ledger');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Modal State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<HallExpense | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Date range calculation
  const getDateRange = useCallback(() => {
    const now = new Date();
    if (selectedPeriod === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (selectedPeriod === 'last_month') {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: firstOfLastMonth.toISOString().split('T')[0],
        endDate: lastOfLastMonth.toISOString().split('T')[0],
      };
    }
    // current_month
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstOfCurrentMonth.toISOString().split('T')[0],
      endDate: lastOfCurrentMonth.toISOString().split('T')[0],
    };
  }, [selectedPeriod]);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    if (!hallId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { startDate, endDate } = getDateRange();
      const res = await getHallExpenses({
        hallId,
        startDate,
        endDate,
      });

      setExpenses(res.expenses);
      setKpis(res.kpis);
    } catch (err: any) {
      console.warn('[ExpenseTrackerScreen] Error loading expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hallId, getDateRange]);

  // Load allocation bookings on mount
  useEffect(() => {
    if (hallId) {
      fetchAllocatableBookings(hallId).then(setAllocatableBookings);
      fetchRecentBookingsForAllocation(hallId).then(setAllocationOptions);
    }
  }, [hallId]);

  // Initial load & period change
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Realtime subscription
  useEffect(() => {
    if (!hallId) return;
    const unsubscribe = subscribeToHallExpenses(hallId, () => {
      loadExpenses();
    });
    return () => {
      unsubscribe();
    };
  }, [hallId, loadExpenses]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  // Filtered expenses based on client filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Category filter
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'Pending' && e.payment_mode !== 'credit') {
        return false;
      }
      if (statusFilter === 'Event' && !e.booking_id) {
        return false;
      }
      if (statusFilter === 'Upkeep' && e.booking_id) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const reason = (e.title || '').toLowerCase();
        const vendor = (e.payee_name || '').toLowerCase();
        const eventName = (e.bookings?.event_type || '').toLowerCase();
        const customerName = (e.bookings?.customers?.name || '').toLowerCase();
        const match =
          reason.includes(q) ||
          vendor.includes(q) ||
          eventName.includes(q) ||
          customerName.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, statusFilter, searchQuery]);

  // Group filtered expenses by date
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { total: number; items: HallExpense[] }> = {};

    filteredExpenses.forEach(e => {
      const dKey = e.expense_date || 'Other Dates';
      if (!groups[dKey]) {
        groups[dKey] = { total: 0, items: [] };
      }
      groups[dKey].items.push(e);
      groups[dKey].total += Number(e.amount) || 0;
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  // Handlers for Save and Delete
  const handleSaveExpense = async (payload: ExpenseFormPayload) => {
    if (!hallId) return;

    if (isEditing && expenseToEdit) {
      await updateExpense(expenseToEdit.id, payload);
      showToast('Expense updated successfully');
    } else {
      await recordExpense(hallId, user?.id, payload);
      showToast('Expense recorded successfully');
    }

    loadExpenses();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
    showToast('Expense deleted');
    loadExpenses();
  };

  // Settle unpaid expense directly from list
  const handleSettlePending = async (expense: HallExpense) => {
    try {
      await updateExpense(expense.id, { paymentMode: 'upi' });
      showToast(`Settled ₹${expense.amount.toLocaleString('en-IN')} via UPI`);
      loadExpenses();
    } catch (err: any) {
      showToast('Failed to settle expense');
    }
  };

  const openNewExpenseSheet = () => {
    setIsEditing(false);
    setExpenseToEdit(null);
    setIsSheetOpen(true);
  };

  const openEditExpenseSheet = (item: HallExpense) => {
    if (!isOwner) {
      // Staff has view-only on past entries
      return;
    }
    setIsEditing(true);
    setExpenseToEdit(item);
    setIsSheetOpen(true);
  };

  const formatDateHeader = (isoDate: string) => {
    if (!isoDate || isoDate === 'Other Dates') return 'OTHER DATES';
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return isoDate;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
  };

  const getCategoryIcon = (catKey: ExpenseCategory, size = 16, color = colors.gold[500]) => {
    switch (catKey) {
      case 'diesel_fuel':
        return <Fuel size={size} color={color} />;
      case 'utilities':
        return <Zap size={size} color={color} />;
      case 'maintenance':
        return <Wrench size={size} color={color} />;
      case 'vendor_payout':
        return <Sparkles size={size} color={color} />;
      case 'staff_salary':
        return <Users size={size} color={color} />;
      case 'supplies':
        return <Package size={size} color={color} />;
      case 'other':
      default:
        return <Receipt size={size} color={color} />;
    }
  };

  return (
    <ScreenBackground isDark={isDark}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* HEADER BAR */}
      <View style={[styles.headerContainer, glassStyles.getCardStyle(isDark)]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={18} color={t.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerHallName, { color: t.text }]} numberOfLines={1}>
              {hall?.name || 'Royal Palace'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>
              Hall Expense Ledger
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Period Selector Pill */}
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSelectedPeriod(prev =>
                prev === 'current_month'
                  ? 'last_month'
                  : prev === 'last_month'
                  ? 'all'
                  : 'current_month'
              );
            }}
            style={[
              styles.periodPill,
              {
                backgroundColor: isDark ? 'rgba(214, 174, 107, 0.12)' : 'rgba(198, 151, 73, 0.12)',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.25)',
              },
            ]}
          >
            <CalendarIcon size={12} color={isDark ? colors.gold[400] : colors.gold[600]} style={{ marginRight: 4 }} />
            <Text style={[styles.periodPillText, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
              {selectedPeriod === 'current_month'
                ? 'This Month'
                : selectedPeriod === 'last_month'
                ? 'Last Month'
                : 'All Time'}
            </Text>
          </TouchableOpacity>

          {/* Theme Toggle Button */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeToggleBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            accessibilityLabel="Toggle dark mode"
          >
            {isDark ? (
              <Sun size={16} color={colors.gold[400]} />
            ) : (
              <Moon size={16} color={colors.gold[600]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isMobile ? 16 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.gold[500]}
            colors={[colors.gold[500]]}
          />
        }
      >
        {/* HERO OUTFLOW & KPI CARD */}
        <View
          style={[
            styles.heroCard,
            glassStyles.getCardStyle(isDark),
            {
              borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.3)',
              backgroundColor: isDark ? 'rgba(30, 28, 26, 0.85)' : (Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : '#FFFFFF'),
            },
          ]}
        >
          {/* Top Row: Total Spend + Segmented Control */}
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroEyebrow, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                TOTAL HALL OUTFLOW
              </Text>
              <View style={styles.heroAmountRow}>
                <RollingNumberTicker
                  targetValue={kpis.totalSpend}
                  isCurrency
                  prefix={currencySymbol}
                  style={[styles.heroAmountText, { color: t.text }]}
                />
              </View>
            </View>

            {/* Segmented Control: Ledger | Split */}
            <View
              style={[
                styles.segmentedHero,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120, 113, 108, 0.12)' },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSubView('ledger');
                }}
                style={[
                  styles.segmentedHeroBtn,
                  subView === 'ledger' && [
                    styles.segmentedHeroBtnActive,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF' },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentedHeroText,
                    { color: subView === 'ledger' ? t.text : t.textMuted },
                  ]}
                >
                  Ledger
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSubView('split');
                }}
                style={[
                  styles.segmentedHeroBtn,
                  subView === 'split' && [
                    styles.segmentedHeroBtnActive,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF' },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.segmentedHeroText,
                    { color: subView === 'split' ? t.text : t.textMuted },
                  ]}
                >
                  Split
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Row: Paid Out & Vendor Dues */}
          <View style={[styles.heroBottomGrid, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(198,151,73,0.15)' }]}>
            <View style={styles.heroStatCol}>
              <View style={styles.statLabelRow}>
                <View style={[styles.dotIndicator, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.statLabel, { color: t.textMuted }]}>PAID OUT</Text>
              </View>
              <Text style={[styles.statValue, { color: isDark ? '#34D399' : '#047857' }]}>
                {currencySymbol}{kpis.paidSpend.toLocaleString('en-IN')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setStatusFilter(prev => (prev === 'Pending' ? 'ALL' : 'Pending'));
              }}
              style={[styles.heroStatCol, { borderLeftWidth: 1, borderLeftColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(198,151,73,0.15)', paddingLeft: 14 }]}
            >
              <View style={styles.statLabelRow}>
                <View style={[styles.dotIndicator, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.statLabel, { color: t.textMuted }]}>VENDOR DUES</Text>
                {kpis.pendingCount > 0 && (
                  <View style={[styles.pendingBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Text style={styles.pendingBadgeText}>{kpis.pendingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.statValue, { color: isDark ? '#F87171' : '#DC2626' }]}>
                {currencySymbol}{kpis.pendingSpend.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* EXPANDABLE SPLIT VIEW: CATEGORY BREAKDOWN PROGRESS BARS */}
          {subView === 'split' && (
            <View style={[styles.splitPanel, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(198,151,73,0.15)' }]}>
              <View style={styles.splitPanelHeader}>
                <Text style={[styles.splitPanelEyebrow, { color: t.textMuted }]}>
                  TAP A CATEGORY TO FILTER
                </Text>
                {categoryFilter !== 'ALL' && (
                  <TouchableOpacity onPress={() => setCategoryFilter('ALL')}>
                    <Text style={[styles.clearSplitText, { color: colors.gold[500] }]}>
                      Show All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.splitList}>
                {(Object.keys(EXPENSE_CATEGORIES_META) as ExpenseCategory[])
                  .map(catKey => {
                    const amt = kpis.categoryTotals[catKey] || 0;
                    const meta = EXPENSE_CATEGORIES_META[catKey];
                    const pct = kpis.totalSpend > 0 ? Math.round((amt / kpis.totalSpend) * 100) : 0;
                    const isSelected = categoryFilter === catKey;

                    return (
                      <TouchableOpacity
                        key={catKey}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setCategoryFilter(prev => (prev === catKey ? 'ALL' : catKey));
                        }}
                        style={[
                          styles.splitRow,
                          isSelected && {
                            backgroundColor: isDark
                              ? 'rgba(214, 174, 107, 0.16)'
                              : 'rgba(198, 151, 73, 0.12)',
                            borderColor: isDark
                              ? 'rgba(214, 174, 107, 0.35)'
                              : 'rgba(198, 151, 73, 0.35)',
                          },
                        ]}
                      >
                        <View style={styles.splitRowTop}>
                          <View style={styles.splitRowLeft}>
                            {getCategoryIcon(catKey, 14, isDark ? colors.gold[400] : colors.gold[600])}
                            <Text style={[styles.splitCatName, { color: t.text }]}>
                              {meta.short}
                            </Text>
                          </View>
                          <Text style={[styles.splitCatAmount, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                            {currencySymbol}{amt.toLocaleString('en-IN')}{' '}
                            <Text style={{ color: t.textMuted, fontWeight: '500' }}>({pct}%)</Text>
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View
                          style={[
                            styles.progressBarBg,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                          ]}
                        >
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, Math.max(pct, 0))}%`,
                                backgroundColor: colors.gold[500],
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}
        </View>

        {/* FILTER PILLS & SEARCH ROW */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            <TouchableOpacity
              onPress={() => setStatusFilter('ALL')}
              style={[
                styles.filterPill,
                statusFilter === 'ALL' && [
                  styles.filterPillActive,
                  {
                    backgroundColor: isDark ? 'rgba(214, 174, 107, 0.18)' : 'rgba(198, 151, 73, 0.15)',
                    borderColor: isDark ? 'rgba(214, 174, 107, 0.35)' : 'rgba(198, 151, 73, 0.3)',
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      statusFilter === 'ALL'
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[700]
                        : t.textMuted,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter('Pending')}
              style={[
                styles.filterPill,
                statusFilter === 'Pending' && [
                  styles.filterPillActive,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.3)',
                  },
                ],
              ]}
            >
              <View style={[styles.dotIndicator, { backgroundColor: '#EF4444', marginRight: 4 }]} />
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      statusFilter === 'Pending'
                        ? isDark
                          ? '#F87171'
                          : '#DC2626'
                        : t.textMuted,
                  },
                ]}
              >
                Unpaid Dues
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter('Event')}
              style={[
                styles.filterPill,
                statusFilter === 'Event' && [
                  styles.filterPillActive,
                  {
                    backgroundColor: isDark ? 'rgba(214, 174, 107, 0.18)' : 'rgba(198, 151, 73, 0.15)',
                    borderColor: isDark ? 'rgba(214, 174, 107, 0.35)' : 'rgba(198, 151, 73, 0.3)',
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      statusFilter === 'Event'
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[700]
                        : t.textMuted,
                  },
                ]}
              >
                Event Costs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusFilter('Upkeep')}
              style={[
                styles.filterPill,
                statusFilter === 'Upkeep' && [
                  styles.filterPillActive,
                  {
                    backgroundColor: isDark ? 'rgba(214, 174, 107, 0.18)' : 'rgba(198, 151, 73, 0.15)',
                    borderColor: isDark ? 'rgba(214, 174, 107, 0.35)' : 'rgba(198, 151, 73, 0.3)',
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      statusFilter === 'Upkeep'
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[700]
                        : t.textMuted,
                  },
                ]}
              >
                Hall Upkeep
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Search Toggle Button */}
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsSearchVisible(prev => !prev);
              if (isSearchVisible) setSearchQuery('');
            }}
            style={[
              styles.searchToggleBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.2)' : 'rgba(198, 151, 73, 0.2)',
              },
            ]}
          >
            <Search size={15} color={t.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SEARCH INPUT BAR */}
        {isSearchVisible && (
          <View
            style={[
              styles.searchBarWrap,
              {
                backgroundColor: isDark ? '#1E1C1A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.25)',
              },
            ]}
          >
            <Search size={16} color={t.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search reason, vendor, or event..."
              placeholderTextColor={t.textSubtle}
              style={[styles.searchInput, { color: t.text }]}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={15} color={t.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ACTIVE CATEGORY FILTER BANNER */}
        {categoryFilter !== 'ALL' && (
          <View
            style={[
              styles.activeFilterBanner,
              {
                backgroundColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.12)',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.3)' : 'rgba(198, 151, 73, 0.25)',
              },
            ]}
          >
            <Text style={[styles.activeFilterText, { color: t.text }]}>
              Filtered by:{' '}
              <Text style={{ fontWeight: '700', color: isDark ? colors.gold[400] : colors.gold[700] }}>
                {EXPENSE_CATEGORIES_META[categoryFilter]?.short || categoryFilter}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => setCategoryFilter('ALL')}
              style={styles.clearFilterBtn}
            >
              <Text style={[styles.clearFilterText, { color: isDark ? colors.gold[400] : colors.gold[700] }]}>
                Clear
              </Text>
              <X size={12} color={isDark ? colors.gold[400] : colors.gold[700]} />
            </TouchableOpacity>
          </View>
        )}

        {/* EXPENSES TIMELINE LIST */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.gold[500]} />
            <Text style={[styles.loadingText, { color: t.textMuted }]}>
              Loading expenses ledger...
            </Text>
          </View>
        ) : filteredExpenses.length === 0 ? (
          <View style={[styles.emptyCard, glassStyles.getCardStyle(isDark)]}>
            <View
              style={[
                styles.emptyEmblem,
                { backgroundColor: isDark ? 'rgba(214, 174, 107, 0.12)' : 'rgba(198, 151, 73, 0.12)' },
              ]}
            >
              <Receipt size={24} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No matching expenses</Text>
            <Text style={[styles.emptySub, { color: t.textMuted }]}>
              Tap "+ Record Hall Expense" below to log an operational bill.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {groupedExpenses.map(([dateKey, group]) => (
              <View key={dateKey} style={styles.dateGroupContainer}>
                {/* STICKY DATE HEADER */}
                <View style={styles.dateHeaderRow}>
                  <Text style={[styles.dateHeaderText, { color: t.textMuted }]}>
                    {formatDateHeader(dateKey)}
                  </Text>
                  <Text style={[styles.dateHeaderTotal, { color: t.textMuted }]}>
                    {currencySymbol}{group.total.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* INSET GROUPED CARD */}
                <View
                  style={[
                    styles.groupedCard,
                    {
                      backgroundColor: isDark ? 'rgba(30, 28, 26, 0.95)' : (Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF'),
                      borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.16)',
                    },
                  ]}
                >
                  {group.items.map((item, idx) => {
                    const meta = EXPENSE_CATEGORIES_META[item.category] || {
                      short: item.category,
                      icon: 'Receipt',
                    };
                    const isPending = item.payment_mode === 'credit';
                    const isLast = idx === group.items.length - 1;

                    let subtitle = 'General Hall Upkeep';
                    if (item.bookings) {
                      const cName = item.bookings.customers?.name;
                      subtitle = cName
                        ? `${item.bookings.event_type} • ${cName}`
                        : item.bookings.event_type;
                    }

                    return (
                      <React.Fragment key={item.id}>
                        <TouchableOpacity
                          onPress={() => openEditExpenseSheet(item)}
                          activeOpacity={0.7}
                          style={styles.expenseRow}
                        >
                          {/* Category Emblem */}
                          <View
                            style={[
                              styles.catEmblem,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(214, 174, 107, 0.12)'
                                  : 'rgba(198, 151, 73, 0.12)',
                              },
                            ]}
                          >
                            {getCategoryIcon(item.category, 16, isDark ? colors.gold[400] : colors.gold[600])}
                          </View>

                          {/* Reason & Subtitle */}
                          <View style={styles.expenseTextWrap}>
                            <Text numberOfLines={1} style={[styles.expenseTitle, { color: t.text }]}>
                              {item.title}
                            </Text>
                            <Text numberOfLines={1} style={[styles.expenseSubtitle, { color: t.textMuted }]}>
                              {subtitle}
                              {item.payee_name ? ` • ${item.payee_name}` : ''}
                            </Text>
                          </View>

                          {/* Amount & Status */}
                          <View style={styles.expenseAmountWrap}>
                            <Text style={[styles.expenseAmountText, { color: t.text }]}>
                              {currencySymbol}{item.amount.toLocaleString('en-IN')}
                            </Text>
                            {isPending && (
                              <TouchableOpacity
                                onPress={() => handleSettlePending(item)}
                                style={styles.pendingTagBtn}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Text style={styles.pendingTagText}>Unpaid (Tap to Pay)</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {isOwner && (
                            <ChevronRight size={14} color={t.textSubtle} style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>

                        {!isLast && (
                          <View
                            style={[
                              styles.rowDivider,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(214, 174, 107, 0.1)'
                                  : 'rgba(198, 151, 73, 0.1)',
                              },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <View style={styles.fabWrap}>
        <TouchableOpacity
          onPress={openNewExpenseSheet}
          activeOpacity={0.88}
          style={[styles.fabBtn, { backgroundColor: colors.gold[500] }]}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.8} />
          <Text style={styles.fabText}>Record Hall Expense</Text>
        </TouchableOpacity>
      </View>

      {/* EXPENSE SHEET MODAL */}
      <ExpenseSheetModal
        visible={isSheetOpen}
        isEditing={isEditing}
        expenseToEdit={expenseToEdit}
        isOwner={isOwner}
        allocationOptions={allocationOptions}
        allocatableBookings={allocatableBookings}
        isDark={isDark}
        onClose={() => setIsSheetOpen(false)}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
      />

      {/* INLINE TOAST */}
      {toastMessage && (
        <View
          style={[
            styles.toastBox,
            glassStyles.getCardStyle(isDark),
            {
              borderColor: isDark ? 'rgba(214, 174, 107, 0.3)' : 'rgba(198, 151, 73, 0.3)',
            },
          ]}
        >
          <Sparkles size={14} color={colors.gold[500]} style={{ marginRight: 6 }} />
          <Text style={[styles.toastText, { color: t.text }]}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerHallName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 110,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroAmountRow: {
    marginTop: 4,
  },
  heroAmountText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  segmentedHero: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
  },
  segmentedHeroBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentedHeroBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedHeroText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroBottomGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  heroStatCol: {
    flex: 1,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  pendingBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 6,
  },
  pendingBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  splitPanel: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  splitPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitPanelEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clearSplitText: {
    fontSize: 11,
    fontWeight: '700',
  },
  splitList: {
    gap: 8,
  },
  splitRow: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  splitRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  splitRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitCatName: {
    fontSize: 12,
    fontWeight: '700',
  },
  splitCatAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {},
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  activeFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  activeFilterText: {
    fontSize: 12,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  emptyEmblem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  timelineList: {
    gap: 16,
  },
  dateGroupContainer: {},
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dateHeaderTotal: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  catEmblem: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  expenseSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  expenseAmountWrap: {
    alignItems: 'flex-end',
  },
  expenseAmountText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pendingTagBtn: {
    marginTop: 2,
  },
  pendingTagText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
    marginRight: 16,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: colors.gold[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  toastBox: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
