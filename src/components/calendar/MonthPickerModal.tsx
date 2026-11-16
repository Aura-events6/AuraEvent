import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface MonthPickerModalProps {
  visible: boolean;
  selectedDate: Date;
  isDark?: boolean;
  onClose: () => void;
  onSelectMonthYear: (year: number, monthIndex: number) => void;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  visible,
  selectedDate,
  isDark = false,
  onClose,
  onSelectMonthYear,
}) => {
  const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
  const currentMonthIndex = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const t = isDark ? colors.dark : colors.light;

  const handlePrevYear = () => setViewYear(prev => prev - 1);
  const handleNextYear = () => setViewYear(prev => prev + 1);

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  // Spring entrance animations
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const translateYAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      scaleAnim.setValue(0.94);
      translateYAnim.setValue(24);
    }
  }, [visible, selectedDate, backdropAnim, scaleAnim, translateYAnim]);

  const handleAnimatedClose = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleAnimatedClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleAnimatedClose} />
        <Animated.View
          style={[
            styles.modalCard,
            glassStyles.getCardStyle(isDark),
            {
              transform: [
                { scale: scaleAnim },
                { translateY: translateYAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <CalendarIcon size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text style={[styles.title, { color: t.text }]}>Jump to Month</Text>
            </View>
            <Pressable
              onPress={handleAnimatedClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  transform: [{ scale: pressed ? 0.90 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close month picker"
            >
              <X size={18} color={t.text} />
            </Pressable>
          </View>

          {/* Year Navigator */}
          <View style={styles.yearRow}>
            <Pressable
              onPress={handlePrevYear}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Previous year"
            >
              <ChevronLeft size={18} color={t.text} />
            </Pressable>

            <Text style={[styles.yearText, { color: t.text }]}>{viewYear}</Text>

            <Pressable
              onPress={handleNextYear}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Next year"
            >
              <ChevronRight size={18} color={t.text} />
            </Pressable>
          </View>

          {/* 12 Months Grid */}
          <View style={styles.monthsGrid}>
            {MONTH_NAMES.map((mName, idx) => {
              const isSelected = viewYear === currentYear && idx === currentMonthIndex;
              return (
                <Pressable
                  key={mName}
                  onPress={() => {
                    onSelectMonthYear(viewYear, idx);
                    handleAnimatedClose();
                  }}
                  style={({ pressed }) => [
                    styles.monthCell,
                    isSelected
                      ? {
                          backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                          borderColor: isDark ? colors.gold[400] : colors.gold[700],
                        }
                      : {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        },
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${mName} ${viewYear}`}
                >
                  <Text
                    style={[
                      styles.monthText,
                      {
                        color: isSelected ? '#FFFFFF' : t.text,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {mName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '800',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '30%',
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 14,
  },
});

