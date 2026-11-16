import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Crown, ArrowLeft } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export interface BookingStepIndicatorProps {
  currentStep: number; // 1, 2, 3
  onSelectStep: (step: number) => void;
  maxStepReached: number;
  hallName?: string;
  isDark?: boolean;
  onBack?: () => void;
  isEdit?: boolean;
  billNumber?: string | null;
}

const STEPS = [
  { step: 1, label: '1. Details' },
  { step: 2, label: '2. Pricing' },
  { step: 3, label: '3. Review' },
];

export const BookingStepIndicator: React.FC<BookingStepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  maxStepReached,
  hallName = 'Royal Palace',
  isDark = false,
  onBack,
  isEdit = false,
  billNumber,
}) => {
  const t = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.headerContainer}>
      {/* Top Glass Card matching lines 175-193 */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: isDark ? 'rgba(30, 28, 26, 0.78)' : 'rgba(255, 255, 255, 0.78)',
            borderColor: isDark ? 'rgba(214, 174, 107, 0.20)' : 'rgba(255, 255, 255, 0.95)',
          },
        ]}
      >
        <View style={styles.brandRow}>
          {onBack && (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(214, 174, 107, 0.20)' : 'rgba(198, 151, 73, 0.25)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={16} color={t.text} />
            </Pressable>
          )}

          {/* Crown Emblem Box */}
          <View style={styles.crownBox}>
            <Crown size={17} color="#FFFFFF" strokeWidth={2.4} />
          </View>

          <View style={styles.titleCol}>
            <Text style={[styles.hallTitle, { color: t.text }]} numberOfLines={1}>
              {isEdit ? `Edit Booking ${billNumber || ''}` : hallName}
            </Text>
            <Text style={[styles.wizardSubtitle, { color: t.textMuted }]}>
              {isEdit ? 'Update Contract Details' : 'New Booking Wizard'}
            </Text>
          </View>
        </View>

        {/* Step Badge Pill (No dark mode toggle button) */}
        {!isEdit && (
          <View style={styles.stepBadgePill}>
            <Text style={styles.stepBadgeText}>
              Step <Text style={styles.stepNumBold}>{currentStep}</Text> of 3
            </Text>
          </View>
        )}
      </View>

      {/* 3-Bar Segmented Progress Indicator matching lines 195-206 */}
      {!isEdit && (
        <View style={styles.progressSection}>
          <View style={styles.progressBarsGrid}>
            {STEPS.map(item => {
              const isActive = item.step <= currentStep;
              const isClickable = item.step <= maxStepReached;

              return (
                <Pressable
                  key={item.step}
                  onPress={() => isClickable && onSelectStep(item.step)}
                  disabled={!isClickable}
                  style={styles.progressBarWrapper}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to Step ${item.step}: ${item.label}`}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: isActive
                          ? '#C69749'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.14)'
                          : 'rgba(214, 211, 209, 0.65)',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.progressLabelsRow}>
            {STEPS.map(item => {
              const isActive = item.step === currentStep;
              const isCompleted = item.step < currentStep;

              return (
                <Text
                  key={item.step}
                  style={[
                    styles.progressLabelText,
                    {
                      color: isActive || isCompleted
                        ? isDark
                          ? colors.gold[400]
                          : '#8E6227'
                        : t.textMuted,
                      fontWeight: isActive || isCompleted ? '700' : '600',
                      opacity: isActive || isCompleted ? 1 : 0.65,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    maxWidth: 672,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#C69749',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  titleCol: {
    flex: 1,
  },
  hallTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  wizardSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.65,
  },
  stepBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(198, 151, 73, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(214, 174, 107, 0.35)',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E6227',
  },
  stepNumBold: {
    fontWeight: '800',
  },
  progressSection: {
    marginTop: 12,
    paddingHorizontal: 4,
    gap: 6,
  },
  progressBarsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarWrapper: {
    flex: 1,
  },
  barFill: {
    height: 6,
    borderRadius: 9999,
    width: '100%',
  },
  progressLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  progressLabelText: {
    fontSize: 11,
  },
});
