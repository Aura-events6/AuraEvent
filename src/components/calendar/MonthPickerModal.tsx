import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { colors } from '../../theme/colors';
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
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(28, 25, 23, 0.65)',
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleAnimatedClose} />
        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? '#1C1917' : '#FFFFFF',
              borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : '#ECE8E1',
              transform: [
                { scale: scaleAnim },
                { translateY: translateYAnim },
              ],
            },
          ]}
        >
          {/* Header with Royal Gold Emblem */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <LinearGradient colors={colors.goldGradient} style={styles.headerEmblem}>
                <CalendarIcon size={18} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
              <View>
                <Text style={[styles.title, { color: t.text }]}>Jump to Month</Text>
                <Text style={[styles.subtitle, { color: t.textMuted }]}>
                  Select month to view schedule
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleAnimatedClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6',
                  transform: [{ scale: pressed ? 0.90 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close month picker"
            >
              <X size={16} color={t.textMuted} />
            </Pressable>
          </View>

          {/* Year Navigator Capsule */}
          <View
            style={[
              styles.yearRow,
              {
                backgroundColor: isDark ? 'rgba(214, 174, 107, 0.08)' : '#FBF9F5',
                borderColor: isDark ? 'rgba(214, 174, 107, 0.22)' : 'rgba(198, 151, 73, 0.22)',
              },
            ]}
          >
            <Pressable
              onPress={handlePrevYear}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.22)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Previous year"
            >
              <ChevronLeft size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
            </Pressable>

            <View style={styles.yearCenter}>
              <Text style={[styles.yearText, { color: t.text }]}>{viewYear}</Text>
            </View>

            <Pressable
              onPress={handleNextYear}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(214, 174, 107, 0.25)' : 'rgba(198, 151, 73, 0.22)',
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Next year"
            >
              <ChevronRight size={16} color={isDark ? colors.gold[400] : colors.gold[600]} />
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
                    styles.monthCellWrap,
                    { transform: [{ scale: pressed ? 0.94 : 1 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${mName} ${viewYear}`}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={colors.goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.monthCellSelected}
                    >
                      <Text style={styles.monthTextSelected}>{mName}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.monthCellDefault,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FBF9F5',
                          borderColor: isDark ? 'rgba(214, 174, 107, 0.16)' : 'rgba(198, 151, 73, 0.18)',
                        },
                      ]}
                    >
                      <Text style={[styles.monthText, { color: t.text }]}>{mName}</Text>
                    </View>
                  )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmblem: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
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
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  yearCenter: {
    alignItems: 'center',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  monthCellWrap: {
    width: '30%',
    minHeight: 46,
  },
  monthCellSelected: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 46,
  },
  monthTextSelected: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  monthCellDefault: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 46,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
