import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface CustomSelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  isDark?: boolean;
}

export const CustomSelectModal: React.FC<CustomSelectModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
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
      scaleAnim.setValue(0.92);
      translateYAnim.setValue(20);
    }
  }, [visible, backdropAnim, scaleAnim, translateYAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
              backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.50)',
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                  backgroundColor: isDark ? '#1C1A17' : '#FFFFFF',
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.35)'
                    : 'rgba(214, 174, 107, 0.40)',
                },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.header,
                  {
                    borderBottomColor: isDark
                      ? 'rgba(214, 174, 107, 0.15)'
                      : 'rgba(214, 174, 107, 0.18)',
                    backgroundColor: isDark ? '#23201C' : '#FBF9F5',
                  },
                ]}
              >
                <Text style={[styles.headerTitle, { color: t.text }]}>{title}</Text>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.10)'
                        : 'rgba(0, 0, 0, 0.06)',
                      transform: [{ scale: pressed ? 0.90 : 1 }],
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close select modal"
                >
                  <X size={16} color={t.textMuted} />
                </Pressable>
              </View>

              {/* Options List */}
              <ScrollView
                style={styles.optionsList}
                contentContainerStyle={styles.optionsContent}
                showsVerticalScrollIndicator={false}
              >
                {options.map(option => {
                  const isSelected = option.value === selectedValue;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        onSelect(option.value);
                        onClose();
                      }}
                      style={({ pressed }) => [
                        styles.optionItem,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(214, 174, 107, 0.18)'
                              : 'rgba(214, 174, 107, 0.14)'
                            : pressed
                            ? isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.04)'
                            : 'transparent',
                          borderColor: isSelected
                            ? isDark
                              ? colors.gold[400]
                              : colors.gold[600]
                            : 'transparent',
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected
                                ? isDark
                                  ? colors.gold[400]
                                  : colors.gold[700]
                                : t.text,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.subtitle && (
                          <Text
                            style={[
                              styles.optionSubtitle,
                              {
                                color: isSelected
                                  ? isDark
                                    ? colors.gold[300]
                                    : colors.gold[600]
                                  : t.textMuted,
                              },
                            ]}
                          >
                            {option.subtitle}
                          </Text>
                        )}
                      </View>

                      {isSelected && (
                        <View style={styles.checkIconWrapper}>
                          <Check
                            size={18}
                            color={isDark ? colors.gold[400] : colors.gold[600]}
                            strokeWidth={2.6}
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
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
    maxWidth: 380,
    maxHeight: '75%',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionsContent: {
    padding: 10,
    gap: 6,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  checkIconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

