import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';

interface WeekSelectorProps {
  startDateStr: string;
  endDateStr: string;
  weekRangeLabel: string;
  monthYearLabel: string;
  weekNumber: number;
  totalWeeks?: number;
  isDark?: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectWeekNumber?: (weekNum: number) => void;
  onOpenMonthPicker: () => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  weekRangeLabel,
  monthYearLabel,
  weekNumber,
  totalWeeks = 5,
  isDark = false,
  onPrevWeek,
  onNextWeek,
  onSelectWeekNumber,
  onOpenMonthPicker,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const [rowWidth, setRowWidth] = useState<number>(0);
  const pillAnim = useRef(new Animated.Value(Math.max(0, weekNumber - 1))).current;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: Math.max(0, Math.min(weekNumber - 1, 4)),
      ...motionTokens.springOvershoot,
      useNativeDriver: true,
    }).start();
  }, [weekNumber, pillAnim]);

  const onLayoutPills = (e: LayoutChangeEvent) => {
    setRowWidth(e.nativeEvent.layout.width);
  };

  const pillWidth = rowWidth > 0 ? (rowWidth - 4 * 6) / 5 : 0;
  const translateX = pillAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [
      0,
      pillWidth + 6,
      (pillWidth + 6) * 2,
      (pillWidth + 6) * 3,
      (pillWidth + 6) * 4,
    ],
  });

  return (
    <View style={[styles.container, glassStyles.getCardStyle(isDark)]}>
      {/* Top Navigator Row */}
      <View style={styles.topRow}>
        <Pressable
          onPress={onPrevWeek}
          style={({ pressed }) => [
            styles.navArrowBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Previous week"
        >
          <ChevronLeft size={18} color={t.text} />
        </Pressable>

        {/* Center: Tap to open Month Picker */}
        <Pressable
          onPress={onOpenMonthPicker}
          style={({ pressed }) => [
            styles.centerCol,
            {
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          accessibilityLabel={`Currently viewing ${monthYearLabel}, ${weekRangeLabel}. Tap to pick month.`}
        >
          <View style={styles.monthHeaderRow}>
            <Text style={[styles.monthLabel, { color: t.text }]}>
              {monthYearLabel}
            </Text>
            <CalendarIcon
              size={14}
              color={isDark ? colors.gold[400] : colors.gold[600]}
            />
          </View>
          <Text style={[styles.weekSubtitle, { color: t.textMuted }]}>
            Week {weekNumber} of {totalWeeks} • {weekRangeLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onNextWeek}
          style={({ pressed }) => [
            styles.navArrowBtn,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Next week"
        >
          <ChevronRight size={18} color={t.text} />
        </Pressable>
      </View>

      {/* Week Pills with Sliding Spring Active Pill */}
      {onSelectWeekNumber && (
        <View style={styles.weekPillsRow} onLayout={onLayoutPills}>
          {rowWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  width: pillWidth,
                  transform: [{ translateX }],
                  backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                  borderColor: isDark ? colors.gold[400] : colors.gold[700],
                },
              ]}
            />
          )}

          {[1, 2, 3, 4, 5].map(w => {
            const isActive = weekNumber === w;
            return (
              <Pressable
                key={w}
                onPress={() => onSelectWeekNumber(w)}
                style={({ pressed }) => [
                  styles.weekPill,
                  {
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Week ${w}`}
              >
                <Text
                  style={[
                    styles.weekPillText,
                    {
                      color: isActive ? '#FFFFFF' : t.textMuted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {isActive ? `Week ${w}` : `W${w}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCol: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  weekSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekPillsRow: {
    flexDirection: 'row',
    position: 'relative',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.12)',
  },
  slidingPill: {
    position: 'absolute',
    top: 10,
    left: 0,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 0,
  },
  weekPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    zIndex: 1,
  },
  weekPillText: {
    fontSize: 12,
  },
});

