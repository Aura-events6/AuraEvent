import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { KhatabookFilter, KhatabookSummaryMetrics } from '../../types/khatabook';
import { colors } from '../../theme/colors';

interface KhatabookFilterChipsProps {
  selectedFilter: KhatabookFilter;
  onSelectFilter: (filter: KhatabookFilter) => void;
  metrics: KhatabookSummaryMetrics;
  isDark?: boolean;
}

export const KhatabookFilterChips: React.FC<KhatabookFilterChipsProps> = ({
  selectedFilter,
  onSelectFilter,
  metrics,
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const tabs: { key: KhatabookFilter; label: string; count: number; alertColor?: string }[] = [
    { key: 'all', label: 'All Dues', count: metrics.counts.all },
    { key: 'overdue', label: 'Overdue', count: metrics.counts.overdue, alertColor: '#EF4444' },
    { key: 'upcoming', label: 'Upcoming', count: metrics.counts.upcoming, alertColor: '#D97706' },
    { key: 'credit', label: 'Credit Promised', count: metrics.counts.credit, alertColor: '#3B82F6' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map(tab => {
        const isSelected = selectedFilter === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectFilter(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label}, ${tab.count} items`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.chip,
              {
                transform: [{ scale: pressed ? 0.94 : 1 }],
                backgroundColor: isSelected
                  ? isDark
                    ? 'rgba(214, 174, 107, 0.25)'
                    : 'rgba(198, 151, 73, 0.20)'
                  : isDark
                  ? 'rgba(35, 33, 30, 0.65)'
                  : 'rgba(255, 255, 255, 0.85)',
                borderColor: isSelected
                  ? isDark
                    ? colors.gold[400]
                    : colors.gold[600]
                  : isDark
                  ? 'rgba(255, 255, 255, 0.10)'
                  : 'rgba(198, 151, 73, 0.20)',
              },
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                {
                  color: isSelected
                    ? isDark
                      ? colors.gold[400]
                      : colors.gold[700]
                    : t.text,
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
            >
              {tab.label}
            </Text>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: tab.alertColor
                    ? tab.alertColor
                    : isSelected
                    ? isDark
                      ? colors.gold[500]
                      : colors.gold[600]
                    : isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: tab.alertColor || isSelected ? '#FFFFFF' : t.textMuted,
                  },
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 44,
  },
  chipLabel: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

