import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export interface DynamicExpenseItem {
  id: string;
  reason: string;
  amount: string;
}

interface DynamicExpensesListProps {
  expenses: DynamicExpenseItem[];
  onChangeExpenses: (expenses: DynamicExpenseItem[]) => void;
  currencySymbol?: string;
  isDark?: boolean;
}

const MAX_EXPENSES = 5;

export const DynamicExpensesList: React.FC<DynamicExpensesListProps> = ({
  expenses,
  onChangeExpenses,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const handleAddRow = () => {
    if (expenses.length >= MAX_EXPENSES) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChangeExpenses([
      ...expenses,
      { id: Date.now().toString(), reason: '', amount: '' },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChangeExpenses(expenses.filter(item => item.id !== id));
  };

  const handleUpdateRow = (id: string, field: 'reason' | 'amount', value: string) => {
    const updated = expenses.map(item => {
      if (item.id === id) {
        if (field === 'amount') {
          return { ...item, amount: value.replace(/[^0-9]/g, '') };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    onChangeExpenses(updated);
  };

  return (
    <View style={styles.container}>
      {/* Label Row with Add button matching lines 371-375 */}
      <View style={styles.labelRow}>
        <Text style={[styles.sectionLabel, { color: isDark ? '#A8A29E' : '#78716C' }]}>
          ADDITIONAL EXPENSES
        </Text>
        {expenses.length < MAX_EXPENSES && (
          <Pressable
            onPress={handleAddRow}
            hitSlop={8}
            style={({ pressed }) => [
              styles.addHeaderBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add additional expense"
          >
            <Plus size={13} color={isDark ? colors.gold[400] : '#8E6227'} strokeWidth={3} />
            <Text style={[styles.addHeaderText, { color: isDark ? colors.gold[400] : '#8E6227' }]}>
              Add
            </Text>
          </Pressable>
        )}
      </View>

      {/* Inset Group Container matching lines 378-384 */}
      <View
        style={[
          styles.insetGroup,
          {
            backgroundColor: isDark ? 'rgba(22, 20, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: isDark ? 'rgba(214, 174, 107, 0.15)' : 'rgba(198, 151, 73, 0.15)',
          },
        ]}
      >
        {expenses.length === 0 ? (
          <View style={styles.noExpenseRow}>
            <Text style={[styles.noExpenseText, { color: isDark ? '#78716C' : '#A8A29E' }]}>
              No extra expenses added
            </Text>
          </View>
        ) : (
          expenses.map((item, index) => {
            const isLast = index === expenses.length - 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.expenseRowWrapper,
                  !isLast && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark
                      ? 'rgba(214, 174, 107, 0.12)'
                      : 'rgba(198, 151, 73, 0.12)',
                  },
                ]}
              >
                {/* Reason input */}
                <TextInput
                  value={item.reason}
                  onChangeText={val => handleUpdateRow(item.id, 'reason', val)}
                  placeholder="Reason (e.g. Decor)"
                  placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                  style={[styles.reasonInput, { color: t.text }]}
                  accessibilityLabel={`Expense item ${index + 1} reason`}
                />

                {/* Vertical Divider */}
                <View
                  style={[
                    styles.divider,
                    {
                      backgroundColor: isDark
                        ? 'rgba(214, 174, 107, 0.20)'
                        : 'rgba(198, 151, 73, 0.20)',
                    },
                  ]}
                />

                {/* Amount input */}
                <View style={styles.amountField}>
                  <Text style={[styles.currencyPrefix, { color: isDark ? '#A8A29E' : '#78716C' }]}>
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={item.amount}
                    onChangeText={val => handleUpdateRow(item.id, 'amount', val)}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#78716C' : '#A8A29E'}
                    keyboardType="numeric"
                    style={[styles.amountInput, { color: t.text }]}
                    accessibilityLabel={`Expense item ${index + 1} amount`}
                  />
                </View>

                {/* Delete button */}
                <Pressable
                  onPress={() => handleRemoveRow(item.id)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove expense item ${index + 1}`}
                >
                  <X size={14} color="#EF4444" strokeWidth={2.4} />
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  insetGroup: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  noExpenseRow: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noExpenseText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expenseRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  reasonInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  divider: {
    width: 1,
    height: 18,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 85,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
  amountInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
