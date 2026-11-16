import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import { Plus, Trash2, IndianRupee, CreditCard, Banknote, Smartphone, Clock } from 'lucide-react-native';
import { SplitPaymentItem } from '../../types/booking';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';
import { RollingNumberTicker } from '../dashboard';

interface SplitPaymentInputProps {
  payments: SplitPaymentItem[];
  onChangePayments: (payments: SplitPaymentItem[]) => void;
  currencySymbol?: string;
  isDark?: boolean;
}

export const SplitPaymentInput: React.FC<SplitPaymentInputProps> = ({
  payments,
  onChangePayments,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const handleAddPayment = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onChangePayments([
      ...payments,
      {
        amount: 0,
        mode: 'cash',
        notes: '',
      },
    ]);
  };

  const handleRemovePayment = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = payments.filter((_, idx) => idx !== index);
    onChangePayments(updated);
  };

  const handleUpdateAmount = (index: number, rawAmountStr: string) => {
    const cleanNum = Number(rawAmountStr.replace(/[^0-9]/g, '')) || 0;
    const updated = [...payments];
    updated[index] = { ...updated[index], amount: cleanNum };
    onChangePayments(updated);
  };

  const handleUpdateMode = (
    index: number,
    mode: 'cash' | 'card' | 'upi' | 'credit'
  ) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], mode };
    onChangePayments(updated);
  };

  const totalAdvance = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const modeOptions: {
    key: 'cash' | 'upi' | 'card' | 'credit';
    label: string;
    icon: typeof Banknote;
  }[] = [
    { key: 'cash', label: 'Cash', icon: Banknote },
    { key: 'upi', label: 'UPI', icon: Smartphone },
    { key: 'card', label: 'Card', icon: CreditCard },
    { key: 'credit', label: 'Credit', icon: Clock },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: t.text }]}>
          Advance Payment Ledger
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={[
              styles.totalBadge,
              { color: isDark ? colors.gold[400] : colors.gold[600] },
            ]}
          >
            Total Advance: {currencySymbol}
          </Text>
          <RollingNumberTicker
            targetValue={totalAdvance}
            style={[
              styles.totalBadge,
              { color: isDark ? colors.gold[400] : colors.gold[600] },
            ]}
          />
        </View>
      </View>

      {/* Payment Rows */}
      {payments.map((payment, index) => (
        <View
          key={index}
          style={[
            styles.paymentCard,
            {
              backgroundColor: isDark
                ? 'rgba(35, 33, 30, 0.70)'
                : 'rgba(255, 255, 255, 0.75)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.10)'
                : 'rgba(198, 151, 73, 0.25)',
            },
          ]}
        >
          {/* Top row: Amount Input + Trash */}
          <View style={styles.amountRow}>
            <View
              style={[
                styles.amountInputWrapper,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(198, 151, 73, 0.35)',
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyPrefix,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                {currencySymbol}
              </Text>
              <TextInput
                value={payment.amount > 0 ? payment.amount.toString() : ''}
                onChangeText={val => handleUpdateAmount(index, val)}
                placeholder="0"
                placeholderTextColor={t.textMuted}
                keyboardType="numeric"
                style={[styles.amountInput, { color: t.text }]}
              />
            </View>

            <Pressable
              onPress={() => handleRemovePayment(index)}
              style={({ pressed }) => [
                styles.deleteBtn,
                { transform: [{ scale: pressed ? 0.90 : 1 }] },
              ]}
              accessibilityLabel={`Delete payment row ${index + 1}`}
            >
              <Trash2 size={16} color={colors.status.danger.light} />
            </Pressable>
          </View>

          {/* Bottom row: Mode Chips */}
          <View style={styles.modesRow}>
            {modeOptions.map(m => {
              const isSelected = payment.mode === m.key;
              const Icon = m.icon;

              return (
                <Pressable
                  key={m.key}
                  onPress={() => handleUpdateMode(index, m.key)}
                  style={({ pressed }) => [
                    styles.modeChip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(214, 174, 107, 0.25)'
                          : 'rgba(198, 151, 73, 0.18)'
                        : 'transparent',
                      borderColor: isSelected
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[600]
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.08)',
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                >
                  <Icon
                    size={12}
                    color={
                      isSelected
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[600]
                        : t.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      {
                        color: isSelected
                          ? isDark
                            ? colors.gold[400]
                            : colors.gold[600]
                          : t.textMuted,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {/* Add Split Payment Row Button */}
      <Pressable
        onPress={handleAddPayment}
        style={({ pressed }) => [
          styles.addPaymentBtn,
          {
            borderColor: isDark
              ? 'rgba(214, 174, 107, 0.4)'
              : 'rgba(198, 151, 73, 0.45)',
            transform: [{ scale: pressed ? 0.965 : 1 }],
          },
        ]}
      >
        <Plus size={15} color={isDark ? colors.gold[400] : colors.gold[600]} />
        <Text
          style={[
            styles.addPaymentText,
            { color: isDark ? colors.gold[400] : colors.gold[600] },
          ]}
        >
          {payments.length === 0 ? '+ Add Advance Payment' : '+ Add Split Mode'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  paymentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
  },
  modesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeLabel: {
    fontSize: 11,
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 2,
  },
  addPaymentText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

