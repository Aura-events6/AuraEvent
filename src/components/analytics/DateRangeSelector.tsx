import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Animated,
} from 'react-native';
import { Calendar, X, Check } from 'lucide-react-native';
import { AnalyticsDateRange, AnalyticsDateRangePreset } from '../../types/analytics';
import { colors } from '../../theme/colors';
import { getDateRangeForPreset } from '../../services/analyticsService';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

export interface DateRangeSelectorProps {
  selectedRange: AnalyticsDateRange;
  onSelectRange: (range: AnalyticsDateRange) => void;
  isDark?: boolean;
}

const PRESET_OPTIONS: { key: AnalyticsDateRangePreset; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  selectedRange,
  onSelectRange,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const [isModalOpen, setIsModalOpen] = useState(false);

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(isModalOpen, () => setIsModalOpen(false));

  const [customStart, setCustomStart] = useState(selectedRange.startDate);
  const [customEnd, setCustomEnd] = useState(selectedRange.endDate);
  const [applyState, setApplyState] = useState<'idle' | 'applied'>('idle');

  // Entrance & feedback physics
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isModalOpen) {
      setApplyState('idle');
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: motionTokens.durHover,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      sheetAnim.setValue(0);
      shakeAnim.setValue(0);
    }
  }, [isModalOpen, backdropAnim, sheetAnim, shakeAnim]);

  const triggerErrorShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleCloseModal = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsModalOpen(false);
      setApplyState('idle');
    });
  };

  const handlePresetPress = (preset: AnalyticsDateRangePreset) => {
    if (preset === 'custom') {
      setCustomStart(selectedRange.startDate);
      setCustomEnd(selectedRange.endDate);
      setIsModalOpen(true);
    } else {
      onSelectRange(getDateRangeForPreset(preset));
    }
  };

  const handleApplyCustom = () => {
    const s = customStart.trim();
    const e = customEnd.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(s) || !dateRegex.test(e)) {
      triggerErrorShake();
      return;
    }

    setApplyState('applied');
    setTimeout(() => {
      onSelectRange({
        preset: 'custom',
        startDate: s,
        endDate: e,
        label: `${s} - ${e}`,
      });
      handleCloseModal();
    }, 450);
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const sheetScale = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.presetsRow}>
        {PRESET_OPTIONS.map((item) => {
          const isSelected = selectedRange.preset === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handlePresetPress(item.key)}
              style={({ pressed }) => [
                styles.presetPill,
                isSelected
                  ? {
                      backgroundColor: isDark
                        ? colors.dark.accentBg
                        : colors.light.accentBg,
                      borderColor: isDark
                        ? colors.gold[400]
                        : colors.gold[600],
                    }
                  : {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(28, 25, 23, 0.05)',
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(198, 151, 73, 0.15)',
                    },
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <Text
                style={[
                  styles.presetText,
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
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Range Date Label Indicator */}
      <View style={styles.rangeIndicator}>
        <Calendar size={12} color={t.textSubtle} />
        <Text style={[styles.rangeLabel, { color: t.textSubtle }]}>
          Showing window: {selectedRange.startDate} to {selectedRange.endDate}
        </Text>
      </View>

      {/* CUSTOM DATE PICKER MODAL */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0,0,0,0.7)', opacity: backdropAnim },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#18171B' : '#FFFFFF',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(198, 151, 73, 0.25)',
                transform: [
                  { translateY: sheetTranslateY },
                  { scale: sheetScale },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.text }]}>
                Select Custom Date Range
              </Text>
              <Pressable
                onPress={handleCloseModal}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <X size={20} color={t.textMuted} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: t.text }]}>
                  Start Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark
                        ? colors.dark.input
                        : colors.light.input,
                      borderColor: isDark
                        ? colors.dark.inputBorder
                        : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="2026-01-01"
                  placeholderTextColor={t.textSubtle}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: t.text }]}>
                  End Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark
                        ? colors.dark.input
                        : colors.light.input,
                      borderColor: isDark
                        ? colors.dark.inputBorder
                        : colors.light.inputBorder,
                      color: t.text,
                    },
                  ]}
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="2026-12-31"
                  placeholderTextColor={t.textSubtle}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleApplyCustom}
                  style={({ pressed }) => [
                    styles.applyBtn,
                    applyState === 'applied'
                      ? { backgroundColor: '#059669', borderColor: '#10B981' }
                      : {
                          backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                          borderColor: isDark ? colors.gold[400] : colors.gold[700],
                        },
                    { transform: [{ scale: pressed ? 0.965 : 1 }] },
                  ]}
                >
                  {applyState === 'applied' ? (
                    <View style={styles.btnRow}>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.applyBtnText}>Range Applied ✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.applyBtnText}>Apply Custom Range</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  presetText: {
    fontSize: 12,
  },
  rangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 4,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    marginTop: 8,
  },
  applyBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

