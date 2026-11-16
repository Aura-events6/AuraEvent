import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RankingItem } from '../../types/analytics';
import { motionTokens } from '../../theme/motion';

interface HorizontalBarChartProps {
  title: string;
  subtitle?: string;
  data: RankingItem[];
  isDark?: boolean;
  valueFormatter?: (count: number, value?: number) => string;
}

interface BarChartRowProps {
  item: RankingItem;
  index: number;
  maxCount: number;
  isDark: boolean;
  valueFormatter?: (count: number, value?: number) => string;
}

const BarChartRow: React.FC<BarChartRowProps> = ({
  item,
  index,
  maxCount,
  isDark,
  valueFormatter,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const barWidthPercent = Math.min(
    Math.max(Math.round((item.count / maxCount) * 100), 6),
    100
  );

  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fillAnim.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: 450,
        delay: index * 40,
        ...motionTokens.cubicEaseOut,
        useNativeDriver: false,
      }).start();
    }, 50);

    return () => clearTimeout(timer);
  }, [barWidthPercent, index, fillAnim]);

  const animatedWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${barWidthPercent}%`],
  });

  const displayValue = valueFormatter
    ? valueFormatter(item.count, item.value)
    : `${item.count} ${item.count === 1 ? 'booking' : 'bookings'}`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemRow,
        { transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <View style={styles.itemMeta}>
        <View style={styles.itemLabelContainer}>
          <View
            style={[
              styles.rankBadge,
              {
                backgroundColor:
                  index === 0
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.25)'
                      : 'rgba(198, 151, 73, 0.2)'
                    : t.backgroundSecondary,
                borderColor:
                  index === 0
                    ? isDark
                      ? colors.gold[500]
                      : colors.gold[600]
                    : t.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.rankText,
                {
                  color:
                    index === 0
                      ? isDark
                        ? colors.gold[400]
                        : colors.gold[700]
                      : t.textMuted,
                  fontWeight: index === 0 ? '700' : '500',
                },
              ]}
            >
              {index + 1}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.itemName, { color: t.text }]}
          >
            {item.name}
          </Text>
        </View>

        <View style={styles.itemValues}>
          <Text style={[styles.itemCount, { color: t.text }]}>
            {displayValue}
          </Text>
          <Text
            style={[styles.itemPercent, { color: t.textSubtle }]}
          >
            {Math.round(item.percentage)}%
          </Text>
        </View>
      </View>

      {/* Progress Bar Track & Fill */}
      <View
        style={[
          styles.barTrack,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.04)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedWidth,
              backgroundColor:
                index === 0
                  ? isDark
                    ? colors.gold[400]
                    : colors.gold[600]
                  : isDark
                  ? 'rgba(214, 174, 107, 0.65)'
                  : 'rgba(198, 151, 73, 0.7)',
            },
          ]}
        />
      </View>
    </Pressable>
  );
};

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  title,
  subtitle,
  data,
  isDark = true,
  valueFormatter,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // Find max count to scale bar widths if percentage is not strictly 100-normalized
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <View
      style={[
        styles.container,
        glassStyles.getCardStyle(isDark),
        {
          backgroundColor: t.card,
          borderColor: t.cardBorder,
        },
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: t.textSubtle }]}>
            No bookings recorded for this period
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {data.map((item, index) => (
            <BarChartRow
              key={`${item.name}-${index}`}
              item={item}
              index={index}
              maxCount={maxCount}
              isDark={isDark}
              valueFormatter={valueFormatter}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  list: {
    gap: 14,
  },
  itemRow: {
    gap: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 8,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rankText: {
    fontSize: 11,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  itemValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemPercent: {
    fontSize: 12,
    minWidth: 32,
    textAlign: 'right',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
