import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation } from 'react-native';
import { Gem, Moon, Sparkles, Plus, Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { AuthInput } from '../AuthInput';

export interface OccasionOption {
  key: string;
  label: string;
  icon: typeof Gem;
  description: string;
}

const PRESET_OCCASIONS: OccasionOption[] = [
  {
    key: 'Shaadi',
    label: 'Shaadi',
    icon: Gem,
    description: 'Wedding / Muhurtham',
  },
  {
    key: 'Valima',
    label: 'Valima',
    icon: Moon,
    description: 'Reception / Banquet',
  },
  {
    key: 'Rasam',
    label: 'Rasam',
    icon: Sparkles,
    description: 'Pre-wedding & Sangeet',
  },
  {
    key: 'Other',
    label: 'Other',
    icon: Plus,
    description: 'Custom occasion',
  },
];

interface OccasionSelectorProps {
  value: string; // The active event type string, e.g. "Shaadi", "Valima", "Birthday Party"
  onChange: (val: string) => void;
  isDark?: boolean;
}

export const OccasionSelector: React.FC<OccasionSelectorProps> = ({
  value,
  onChange,
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // Determine which preset is matched
  const isPreset = PRESET_OCCASIONS.some(
    p => p.key !== 'Other' && (p.key.toLowerCase() === value.toLowerCase() || p.description.toLowerCase().includes(value.toLowerCase()))
  );

  const [selectedKey, setSelectedKey] = useState<string>(() => {
    if (!value) return 'Shaadi';
    const match = PRESET_OCCASIONS.find(
      p => p.key !== 'Other' && (p.key.toLowerCase() === value.toLowerCase() || p.description.toLowerCase().includes(value.toLowerCase()))
    );
    return match ? match.key : 'Other';
  });

  const [customOccasion, setCustomOccasion] = useState<string>(() => {
    return isPreset ? '' : value;
  });

  // Sync internal state if value changes from outside (e.g., in edit mode)
  useEffect(() => {
    if (!value) return;
    const match = PRESET_OCCASIONS.find(
      p => p.key !== 'Other' && (p.key.toLowerCase() === value.toLowerCase() || p.description.toLowerCase().includes(value.toLowerCase()))
    );
    if (match) {
      setSelectedKey(match.key);
    } else {
      setSelectedKey('Other');
      setCustomOccasion(value);
    }
  }, [value]);

  const handleSelectKey = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedKey(key);
    if (key === 'Other') {
      onChange(customOccasion.trim() ? customOccasion.trim() : 'Other');
    } else {
      onChange(key);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomOccasion(text);
    onChange(text.trim() || 'Other');
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: t.text }]}>
        What's the occasion? *
      </Text>
      <Text style={[styles.subLabel, { color: t.textMuted }]}>
        Select an occasion or tap Other to specify
      </Text>

      {/* 2x2 Grid of Occasion Selection Cards */}
      <View style={styles.grid}>
        {PRESET_OCCASIONS.map(option => {
          const isSelected = selectedKey === option.key;
          const Icon = option.icon;

          return (
            <Pressable
              key={option.key}
              onPress={() => handleSelectKey(option.key)}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} occasion: ${option.description}`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.20)'
                      : 'rgba(198, 151, 73, 0.16)'
                    : isDark
                    ? 'rgba(35, 33, 30, 0.65)'
                    : 'rgba(255, 255, 255, 0.85)',
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
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? colors.gold[500]
                          : colors.gold[600]
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <Icon
                    size={18}
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                    }
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                </View>

                {isSelected && (
                  <View
                    style={[
                      styles.checkBadge,
                      {
                        backgroundColor: isDark
                          ? colors.gold[500]
                          : colors.gold[600],
                      },
                    ]}
                  >
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: isSelected
                      ? isDark
                        ? colors.gold[400]
                        : colors.gold[700]
                      : t.text,
                    fontWeight: isSelected ? '800' : '700',
                  },
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  {
                    color: isSelected
                      ? isDark
                        ? colors.gold[200]
                        : colors.gold[900]
                      : t.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Conditional Input Revealed when "Other" is chosen */}
      {selectedKey === 'Other' && (
        <View style={styles.conditionalContainer}>
          <AuthInput
            label="What is the occasion? *"
            placeholder="e.g. Birthday Party, Corporate Summit, Engagement"
            value={customOccasion}
            onChangeText={handleCustomChange}
            autoFocus
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subLabel: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  conditionalContainer: {
    marginTop: 8,
  },
});

