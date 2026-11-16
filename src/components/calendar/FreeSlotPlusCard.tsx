import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Clock, ArrowRight } from 'lucide-react-native';
import { BookingSlot } from '../../types/calendar';

interface FreeSlotPlusCardProps {
  slot: BookingSlot;
  dateStr: string;
  isDark?: boolean;
  timeRange?: string;
  isElapsed?: boolean;
  onPress: (dateStr: string, slot: BookingSlot) => void;
}

export const FreeSlotPlusCard: React.FC<FreeSlotPlusCardProps> = ({
  slot,
  dateStr,
  isDark = false,
  isElapsed = false,
  onPress,
}) => {
  const slotLabels = {
    full_day: 'Full Day',
    morning: 'Morning Slot',
    evening: 'Evening Slot',
  }[slot];

  const goldPrimary = isDark ? '#D6AE6B' : '#B07E34';
  const subtitleColor = isDark ? 'rgba(245, 245, 244, 0.55)' : 'rgba(28, 25, 23, 0.55)';

  const elapsedTitleColor = isDark ? 'rgba(245, 245, 244, 0.52)' : 'rgba(28, 25, 23, 0.52)';
  const elapsedSubColor = isDark ? 'rgba(245, 245, 244, 0.35)' : 'rgba(28, 25, 23, 0.38)';

  return (
    <Pressable
      onPress={() => onPress(dateStr, slot)}
      style={({ pressed }) => [
        styles.container,
        isElapsed
          ? {
              backgroundColor: isDark
                ? 'rgba(35, 33, 30, 0.30)'
                : Platform.OS === 'web'
                  ? 'rgba(245, 245, 244, 0.38)'
                  : '#F5F5F4',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.10)',
            }
          : {
              backgroundColor: isDark
                ? 'rgba(35, 33, 30, 0.45)'
                : Platform.OS === 'web'
                  ? 'rgba(255, 255, 255, 0.42)'
                  : '#FFFFFF',
              borderColor: isDark
                ? 'rgba(214, 174, 107, 0.35)'
                : 'rgba(198, 151, 73, 0.40)',
            },
        { transform: [{ scale: pressed ? (isElapsed ? 0.985 : 0.965) : 1 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        isElapsed
          ? `${slotLabels} on ${dateStr} has elapsed. Tap to place booking for tomorrow.`
          : `Available ${slotLabels} on ${dateStr}. Tap to place a booking.`
      }
    >
      {/* Left: Squircle + Text Block */}
      <View style={styles.leftRow}>
        <View
          style={[
            styles.goldSquircle,
            isElapsed
              ? {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.05)',
                }
              : {
                  backgroundColor: isDark
                    ? 'rgba(214, 174, 107, 0.15)'
                    : 'rgba(198, 151, 73, 0.15)',
                },
          ]}
        >
          {isElapsed ? (
            <Clock
              size={18}
              color={isDark ? 'rgba(245, 245, 244, 0.45)' : 'rgba(28, 25, 23, 0.45)'}
              strokeWidth={2}
            />
          ) : (
            <Plus size={18} color={goldPrimary} strokeWidth={2.5} />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.slotTitle,
              { color: isElapsed ? elapsedTitleColor : goldPrimary },
            ]}
            numberOfLines={1}
          >
            {isElapsed ? `Elapsed • ${slotLabels}` : `Available • ${slotLabels}`}
          </Text>
          <Text
            style={[
              styles.slotSubtitle,
              { color: isElapsed ? elapsedSubColor : subtitleColor },
            ]}
          >
            {isElapsed ? 'Slot has passed • Tap to book upcoming' : 'Tap + to place a booking'}
          </Text>
        </View>
      </View>

      {/* Right: Circular Action Button */}
      {isElapsed ? (
        <View
          style={[
            styles.elapsedButtonCircle,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <ArrowRight
            size={14}
            color={isDark ? 'rgba(245, 245, 244, 0.50)' : 'rgba(28, 25, 23, 0.50)'}
            strokeWidth={2.2}
          />
        </View>
      ) : (
        <LinearGradient
          colors={['#D6AE6B', '#B8863B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.plusButtonCircle}
        >
          <Plus size={15} color="#FFFFFF" strokeWidth={2.8} />
        </LinearGradient>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 104,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  goldSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    backgroundColor: 'transparent',
  },
  slotSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
    backgroundColor: 'transparent',
  },
  plusButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  elapsedButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
