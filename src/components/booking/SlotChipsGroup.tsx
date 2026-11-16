import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sun, Moon, Clock } from 'lucide-react-native';
import { BookingSlot } from '../../types/calendar';
import { colors } from '../../theme/colors';

interface SlotChipsGroupProps {
  selectedSlot: BookingSlot;
  onSelectSlot: (slot: BookingSlot) => void;
  allowedSlots?: BookingSlot[];
  isDark?: boolean;
}

export const SlotChipsGroup: React.FC<SlotChipsGroupProps> = ({
  selectedSlot,
  onSelectSlot,
  allowedSlots = ['full_day', 'morning', 'evening'],
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const slotOptions: {
    key: BookingSlot;
    title: string;
    time: string;
    icon: typeof Sun;
  }[] = [
    {
      key: 'full_day',
      title: 'Full Day',
      time: '24 Hours',
      icon: Clock,
    },
    {
      key: 'morning',
      title: 'Morning Slot',
      time: '6 AM – 3 PM',
      icon: Sun,
    },
    {
      key: 'evening',
      title: 'Evening Slot',
      time: '4 PM – 12 AM',
      icon: Moon,
    },
  ];

  const visibleOptions = slotOptions.filter(opt => allowedSlots.includes(opt.key));

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: t.text }]}>Event Slot *</Text>
      <View style={styles.chipsRow}>
        {visibleOptions.map(opt => {
          const isSelected = selectedSlot === opt.key;
          const Icon = opt.icon;

          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelectSlot(opt.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.22)'
                      : 'rgba(198, 151, 73, 0.18)'
                    : isDark
                    ? 'rgba(35, 33, 30, 0.65)'
                    : 'rgba(255, 255, 255, 0.75)',
                  borderColor: isSelected
                    ? isDark
                      ? colors.gold[400]
                      : colors.gold[600]
                    : isDark
                    ? 'rgba(255, 255, 255, 0.10)'
                    : 'rgba(198, 151, 73, 0.25)',
                  transform: [{ scale: pressed ? 0.965 : 1 }],
                },
              ]}
            >
              <Icon
                size={16}
                color={
                  isSelected
                    ? isDark
                      ? colors.gold[400]
                      : colors.gold[600]
                    : t.textMuted
                }
                strokeWidth={isSelected ? 2.5 : 2}
              />
              <View style={styles.chipTextContainer}>
                <Text
                  style={[
                    styles.chipTitle,
                    {
                      color: isSelected
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[600]
                        : t.text,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {opt.title}
                </Text>
                <Text
                  style={[
                    styles.chipTime,
                    {
                      color: isSelected
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[600]
                        : t.textMuted,
                    },
                  ]}
                >
                  {opt.time}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 48,
  },
  chipTextContainer: {
    flex: 1,
  },
  chipTitle: {
    fontSize: 12,
    letterSpacing: -0.2,
  },
  chipTime: {
    fontSize: 10,
    marginTop: 1,
  },
});

