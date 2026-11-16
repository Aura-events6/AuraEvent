import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';
import { DynamicExpenseItem } from './DynamicExpensesList';
import { RollingNumberTicker } from '../dashboard';

interface FinancialLedgerCardProps {
  baseCost: number;
  expenses: DynamicExpenseItem[];
  totalCost: number;
  advanceAmount: number;
  advanceMode: string;
  balanceDue: number;
  currencySymbol?: string;
  isDark?: boolean;
}

export const FinancialLedgerCard: React.FC<FinancialLedgerCardProps> = ({
  baseCost,
  expenses,
  totalCost,
  advanceAmount,
  balanceDue,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const isFullyPaid = balanceDue === 0 && totalCost > 0;

  return (
    <View
      style={[
        styles.ledgerCard,
        {
          backgroundColor: isDark
            ? 'rgba(198, 151, 73, 0.08)'
            : 'rgba(198, 151, 73, 0.05)',
          borderColor: isDark
            ? 'rgba(214, 174, 107, 0.20)'
            : 'rgba(198, 151, 73, 0.20)',
        },
      ]}
    >
      {/* Package Base Cost */}
      <View style={styles.lineItem}>
        <Text style={[styles.itemLabelMuted, { color: t.text }]}>
          Package Base Cost
        </Text>
        <Text style={[styles.itemValBold, { color: t.text }]}>
          {formatCurrency(baseCost, currencySymbol)}
        </Text>
      </View>

      {/* Dynamic Expenses items */}
      {expenses.map(exp => {
        const amt = parseFloat(exp.amount) || 0;
        if (amt <= 0 && !exp.reason.trim()) return null;

        return (
          <View key={exp.id} style={styles.lineItem}>
            <Text style={[styles.itemLabelMuted, { color: t.text }]} numberOfLines={1}>
              {exp.reason.trim() || 'Extra Expense'}
            </Text>
            <Text style={[styles.itemValBold, { color: t.text }]}>
              +{formatCurrency(amt, currencySymbol)}
            </Text>
          </View>
        );
      })}

      {/* Horizontal divider */}
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

      {/* Total Amount */}
      <View style={styles.lineItem}>
        <Text style={[styles.totalLabel, { color: t.text }]}>
          Total Amount
        </Text>
        <Text style={[styles.totalVal, { color: isDark ? colors.gold[400] : '#6F4D22' }]}>
          {formatCurrency(totalCost, currencySymbol)}
        </Text>
      </View>

      {/* Advance Paid Now */}
      <View style={[styles.lineItem, { marginTop: 4 }]}>
        <Text style={styles.advanceLabel}>
          Advance Paid Now
        </Text>
        <Text style={styles.advanceVal}>
          -{formatCurrency(advanceAmount, currencySymbol)}
        </Text>
      </View>

      {/* Dashed divider & Remaining Balance Hero */}
      <View
        style={[
          styles.dashedHeroDivider,
          {
            borderTopColor: isDark
              ? 'rgba(214, 174, 107, 0.35)'
              : 'rgba(198, 151, 73, 0.35)',
          },
        ]}
      >
        <View style={styles.heroRow}>
          <View>
            <Text
              style={[
                styles.heroLabel,
                {
                  color: isFullyPaid
                    ? '#059669'
                    : isDark
                    ? colors.gold[400]
                    : '#6F4D22',
                },
              ]}
            >
              {isFullyPaid ? 'FULLY PAID' : 'REMAINING BALANCE'}
            </Text>
            <Text
              style={[
                styles.heroHint,
                { color: isFullyPaid ? '#059669' : t.textMuted },
              ]}
            >
              {isFullyPaid ? 'No balance due' : 'Added to Khatabook'}
            </Text>
          </View>

          <RollingNumberTicker
            targetValue={balanceDue}
            isCurrency
            prefix={currencySymbol}
            style={[
              styles.heroAmount,
              {
                color: isFullyPaid
                  ? '#059669'
                  : isDark
                  ? colors.gold[400]
                  : '#8E6227',
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ledgerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    marginTop: 8,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  itemLabelMuted: {
    fontSize: 12,
    opacity: 0.65,
    fontWeight: '500',
    flex: 1,
    paddingRight: 8,
  },
  itemValBold: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  advanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  advanceVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  dashedHeroDivider: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    paddingTop: 12,
    marginTop: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroHint: {
    fontSize: 10,
    opacity: 0.55,
    marginTop: 2,
  },
  heroAmount: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
