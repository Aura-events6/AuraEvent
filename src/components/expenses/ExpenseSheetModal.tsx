import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Trash2,
  Smartphone,
  Banknote,
  CreditCard,
  Clock,
  ChevronRight,
  Fuel,
  Zap,
  Wrench,
  Sparkles,
  Users,
  Package,
  Receipt,
  Building2,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import {
  ExpenseCategory,
  ExpenseFormPayload,
  ExpensePaymentMode,
  HallExpense,
  EXPENSE_CATEGORIES_META,
} from '../../types/expenses';
import {
  AllocatableBooking,
  BookingAllocationOption,
} from '../../services/expenseService';
import { CategoryPickerModal } from './CategoryPickerModal';
import { AllocatedToSheet, AllocationSelection } from './AllocatedToSheet';
import { formatLocalDate } from '../../utils/dateUtils';

interface ExpenseSheetModalProps {
  visible: boolean;
  isEditing?: boolean;
  expenseToEdit?: HallExpense | null;
  isOwner?: boolean;
  allocationOptions?: BookingAllocationOption[];
  allocatableBookings?: AllocatableBooking[];
  isDark?: boolean;
  onClose: () => void;
  onSave: (payload: ExpenseFormPayload) => Promise<void>;
  onDelete?: (expenseId: string) => Promise<void>;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]}`;
}

export const ExpenseSheetModal: React.FC<ExpenseSheetModalProps> = ({
  visible,
  isEditing = false,
  expenseToEdit,
  isOwner = true,
  allocationOptions = [],
  allocatableBookings = [],
  isDark = true,
  onClose,
  onSave,
  onDelete,
}) => {
  // Central Back Dispatcher LIFO registration (Rule 1)
  useBackOverlay(visible, onClose);

  const t = isDark ? colors.dark : colors.light;
  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // Form State
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<ExpensePaymentMode>('upi');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('diesel_fuel');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [allocatedLabel, setAllocatedLabel] = useState<string>('Today • General Hall Upkeep');
  const [vendor, setVendor] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => formatLocalDate(new Date()));
  const [notes, setNotes] = useState('');

  // Sub-modal pickers
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isBookingPickerOpen, setIsBookingPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Compute effective allocatable bookings
  const effectiveBookings: AllocatableBooking[] = useMemo(() => {
    if (allocatableBookings && allocatableBookings.length > 0) {
      return allocatableBookings;
    }
    return allocationOptions.map(b => ({
      id: b.id || 'none',
      eventType: 'Event',
      customerName: b.label,
      startDate: todayStr,
      endDate: todayStr,
      slot: 'full_day',
    }));
  }, [allocatableBookings, allocationOptions, todayStr]);

  useEffect(() => {
    if (visible) {
      if (isEditing && expenseToEdit) {
        setAmount(expenseToEdit.amount ? expenseToEdit.amount.toString() : '');
        setPaymentMode(expenseToEdit.payment_mode || 'upi');
        setReason(expenseToEdit.title || '');
        setCategory(expenseToEdit.category || 'other');
        setBookingId(expenseToEdit.booking_id || null);
        setVendor(expenseToEdit.payee_name || '');
        const expDate = expenseToEdit.expense_date || todayStr;
        setExpenseDate(expDate);
        setNotes(expenseToEdit.notes || '');

        // Resolve allocated label
        if (expenseToEdit.booking_id) {
          const match = effectiveBookings.find(b => b.id === expenseToEdit.booking_id);
          if (match) {
            setAllocatedLabel(`${formatDisplayDate(match.startDate)} • ${match.customerName}`);
          } else {
            const allocMatch = allocationOptions.find(b => b.id === expenseToEdit.booking_id);
            setAllocatedLabel(allocMatch ? allocMatch.label : 'Event Linked');
          }
        } else {
          setAllocatedLabel(
            expDate === todayStr
              ? 'Today • General Hall Upkeep'
              : `${formatDisplayDate(expDate)} • General Hall Upkeep`
          );
        }
      } else {
        // Reset to clean defaults
        setAmount('');
        setPaymentMode('upi');
        setReason('');
        setCategory('diesel_fuel');
        setBookingId(null);
        setAllocatedLabel('Today • General Hall Upkeep');
        setVendor('');
        setExpenseDate(todayStr);
        setNotes('');
      }

      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: motionTokens.springSheet.tension,
        friction: motionTokens.springSheet.friction,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isEditing, expenseToEdit, todayStr, effectiveBookings, allocationOptions]);

  const handleSelectAllocation = (selection: AllocationSelection) => {
    setBookingId(selection.bookingId);
    setExpenseDate(selection.date);
    setAllocatedLabel(selection.label);
    setIsBookingPickerOpen(false);
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required Field', 'Please enter a reason or description for this expense.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        title: reason.trim(),
        amount: parsedAmount,
        category,
        paymentMode,
        expenseDate: expenseDate.trim() || todayStr,
        bookingId: bookingId || null,
        payeeName: vendor.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error Saving', err.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!expenseToEdit?.id || !onDelete) return;

    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense of ₹${parseFloat(amount || '0').toLocaleString('en-IN')}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await onDelete(expenseToEdit.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Error Deleting', err.message || 'Failed to delete expense.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (catKey: ExpenseCategory, size = 18, color = colors.gold[500]) => {
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? colors.dark.backgroundSecondary : colors.light.backgroundSecondary,
              borderColor: isDark ? 'rgba(214, 174, 107, 0.2)' : 'rgba(198, 151, 73, 0.2)',
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Mobile Drag Handle */}
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)' },
            ]}
          />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: t.text }]}>
                {isEditing ? 'Edit Expense' : 'New Outflow'}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: t.textMuted }]}>
                {isEditing ? 'Update operational outlay details' : 'Log operational hall expense'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close sheet"
            >
              <X size={18} color={t.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* GIANT AMOUNT INPUT */}
            <View style={styles.amountContainer}>
              <Text style={[styles.amountLabel, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                DISBURSEMENT AMOUNT
              </Text>
              <View style={styles.amountRow}>
                <Text style={[styles.currencyPrefix, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                  ₹
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={val => setAmount(val.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  keyboardType="numeric"
                  autoFocus={!isEditing}
                  style={[styles.amountInput, { color: t.text }]}
                />
              </View>

              {/* Quick increment chips */}
              <View style={styles.quickAddRow}>
                {[500, 1000, 5000].map(val => (
                  <TouchableOpacity
                    key={val}
                    activeOpacity={0.7}
                    onPress={() => handleQuickAddAmount(val)}
                    style={[
                      styles.quickAddChip,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                        borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.25)',
                      },
                    ]}
                  >
                    <Text style={[styles.quickAddChipText, { color: isDark ? colors.gold[400] : colors.gold[600] }]}>
                      +₹{val >= 1000 ? `${val / 1000}k` : val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SEGMENTED PAYMENT MODE SELECTOR */}
            <View
              style={[
                styles.segmentedWrap,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(120, 113, 108, 0.12)',
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setPaymentMode('upi')}
                style={[
                  styles.segmentedBtn,
                  paymentMode === 'upi' && [
                    styles.segmentedBtnActive,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF' },
                  ],
                ]}
              >
                <Smartphone size={14} color={paymentMode === 'upi' ? t.text : t.textMuted} />
                <Text style={[styles.segmentedText, { color: paymentMode === 'upi' ? t.text : t.textMuted }]}>
                  UPI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMode('cash')}
                style={[
                  styles.segmentedBtn,
                  paymentMode === 'cash' && [
                    styles.segmentedBtnActive,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF' },
                  ],
                ]}
              >
                <Banknote size={14} color={paymentMode === 'cash' ? t.text : t.textMuted} />
                <Text style={[styles.segmentedText, { color: paymentMode === 'cash' ? t.text : t.textMuted }]}>
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMode('card')}
                style={[
                  styles.segmentedBtn,
                  paymentMode === 'card' && [
                    styles.segmentedBtnActive,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF' },
                  ],
                ]}
              >
                <Building2 size={14} color={paymentMode === 'card' ? t.text : t.textMuted} />
                <Text style={[styles.segmentedText, { color: paymentMode === 'card' ? t.text : t.textMuted }]}>
                  Bank
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMode('credit')}
                style={[
                  styles.segmentedBtn,
                  paymentMode === 'credit' && [
                    styles.segmentedBtnActive,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF' },
                  ],
                ]}
              >
                <Clock size={14} color={paymentMode === 'credit' ? colors.status.danger.light : t.textMuted} />
                <Text
                  style={[
                    styles.segmentedText,
                    {
                      color: paymentMode === 'credit' ? colors.status.danger.light : t.textMuted,
                      fontWeight: paymentMode === 'credit' ? '800' : '600',
                    },
                  ]}
                >
                  Unpaid
                </Text>
              </TouchableOpacity>
            </View>

            {/* INSET GROUPED FIELDS */}
            <View
              style={[
                styles.insetGroup,
                glassStyles.getCardStyle(isDark),
                {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
                },
              ]}
            >
              {/* Reason / Title */}
              <View style={[styles.formRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.rowLabel, { color: t.textMuted }]}>Reason</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. DG Set Diesel 100L"
                  placeholderTextColor={t.textSubtle}
                  style={[styles.rowInput, { color: t.text }]}
                />
              </View>

              {/* Category Dropdown Trigger */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsCategoryPickerOpen(true)}
                style={[styles.formRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={[styles.rowLabel, { color: t.textMuted }]}>Category</Text>
                <View style={styles.rowRightSelect}>
                  <View style={styles.catSelectedWrap}>
                    {getCategoryIcon(category, 15, isDark ? colors.gold[400] : colors.gold[600])}
                    <Text style={[styles.selectValueText, { color: t.text }]}>
                      {EXPENSE_CATEGORIES_META[category]?.short || category}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={t.textSubtle} />
                </View>
              </TouchableOpacity>

              {/* Allocated To Dropdown Trigger (Apple Today + Upcoming Strategy) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsBookingPickerOpen(true)}
                style={[styles.formRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={[styles.rowLabel, { color: t.textMuted }]}>Allocated To</Text>
                <View style={styles.rowRightSelect}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.selectValueText,
                      {
                        maxWidth: 200,
                        color: bookingId ? (isDark ? colors.gold[400] : colors.gold[600]) : t.text,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {allocatedLabel}
                  </Text>
                  <ChevronRight size={14} color={t.textSubtle} />
                </View>
              </TouchableOpacity>

              {/* Payee / Vendor Name */}
              <View style={[styles.formRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.rowLabel, { color: t.textMuted }]}>Vendor</Text>
                <TextInput
                  value={vendor}
                  onChangeText={setVendor}
                  placeholder="Optional (e.g. IndianOil)"
                  placeholderTextColor={t.textSubtle}
                  style={[styles.rowInput, { color: t.text }]}
                />
              </View>

              {/* Expense Date */}
              <View style={styles.formRow}>
                <Text style={[styles.rowLabel, { color: t.textMuted }]}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={t.textSubtle}
                  style={[styles.rowInput, { color: t.text }]}
                />
              </View>
            </View>

            {/* DELETE BUTTON (IF EDITING AND OWNER) */}
            {isEditing && isOwner && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={[
                  styles.deleteBtn,
                  { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2' },
                ]}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Trash2 size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteBtnText}>Delete Expense</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* BOTTOM ACTION BAR */}
          <View
            style={[
              styles.footerActions,
              {
                borderTopColor: isDark ? 'rgba(214, 174, 107, 0.2)' : 'rgba(198, 151, 73, 0.2)',
                backgroundColor: isDark ? colors.dark.backgroundSecondary : colors.light.backgroundSecondary,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={[
                styles.cancelBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: t.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.gold[500] }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>
                    {isEditing ? 'Save Changes' : 'Save Outflow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>

      {/* CATEGORY PICKER SUB-MODAL (Follows Aura App Theme) */}
      <CategoryPickerModal
        visible={isCategoryPickerOpen}
        selectedCategory={category}
        isDark={isDark}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelectCategory={setCategory}
      />

      {/* ALLOCATED TO BOTTOM SHEET (Apple-Style Today + Upcoming + Calendar) */}
      <AllocatedToSheet
        visible={isBookingPickerOpen}
        selectedBookingId={bookingId}
        selectedDate={expenseDate}
        allocatableBookings={effectiveBookings}
        isDark={isDark}
        onClose={() => setIsBookingPickerOpen(false)}
        onSelectAllocation={handleSelectAllocation}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 34,
    fontWeight: '600',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 140,
    padding: 0,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickAddChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  quickAddChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentedBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  insetGroup: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
  },
  rowInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  rowRightSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catSelectedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
