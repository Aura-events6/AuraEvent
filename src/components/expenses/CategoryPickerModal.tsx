import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Fuel,
  Zap,
  Wrench,
  Sparkles,
  Users,
  Package,
  Receipt,
  LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';
import {
  ExpenseCategory,
  EXPENSE_CATEGORIES_META,
} from '../../types/expenses';

interface CategoryPickerModalProps {
  visible: boolean;
  selectedCategory: ExpenseCategory;
  isDark?: boolean;
  onClose: () => void;
  onSelectCategory: (category: ExpenseCategory) => void;
}

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  diesel_fuel: Fuel,
  utilities: Zap,
  maintenance: Wrench,
  vendor_payout: Sparkles,
  staff_salary: Users,
  supplies: Package,
  other: Receipt,
};

const CATEGORY_SUBTITLES: Record<ExpenseCategory, string> = {
  diesel_fuel: 'DG set backup fuel, machinery & transport',
  utilities: 'EB power electricity bills, water tankers & gas',
  maintenance: 'AC servicing, plumbing, paint & civil repairs',
  vendor_payout: 'Decorators, floral arrangements, sound & DJs',
  staff_salary: 'Security guards, cleaning crew & daily wages',
  supplies: 'Cleaning chemicals, toiletries & disposables',
  other: 'Administrative, legal & miscellaneous outlays',
};

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  selectedCategory,
  isDark = true,
  onClose,
  onSelectCategory,
}) => {
  // LIFO Central Back Dispatcher
  useBackOverlay(visible, onClose);

  const t = isDark ? colors.dark : colors.light;

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      backdropAnim.setValue(0);
      slideAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          ...motionTokens.springSheet,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleSelect = (category: ExpenseCategory) => {
    onSelectCategory(category);
    handleDismiss();
  };

  if (!visible) return null;

  const categoryKeys = Object.keys(EXPENSE_CATEGORIES_META) as ExpenseCategory[];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.backdropPressable,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? colors.dark.backgroundSecondary : colors.light.backgroundSecondary,
              borderColor: isDark ? 'rgba(214, 174, 107, 0.2)' : 'rgba(198, 151, 73, 0.2)',
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* iOS-style Drag Handle */}
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)' },
            ]}
          />

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: t.text }]}>Select Category</Text>
              <Text style={[styles.sheetSubtitle, { color: t.textMuted }]}>
                Choose operational expense classification
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={t.text} />
            </TouchableOpacity>
          </View>

          {/* Inset Grouped Categories List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            <View
              style={[
                styles.insetGroup,
                glassStyles.getCardStyle(isDark),
                {
                  backgroundColor: isDark ? colors.dark.card : colors.light.card,
                  borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
                },
              ]}
            >
              {categoryKeys.map((catKey, index) => {
                const meta = EXPENSE_CATEGORIES_META[catKey];
                const IconComponent = CATEGORY_ICONS[catKey] || Receipt;
                const isSelected = selectedCategory === catKey;
                const isLast = index === categoryKeys.length - 1;

                return (
                  <TouchableOpacity
                    key={catKey}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(catKey)}
                    style={[
                      styles.categoryRow,
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: isDark
                          ? 'rgba(255, 255, 255, 0.07)'
                          : 'rgba(0, 0, 0, 0.07)',
                      },
                      isSelected && {
                        backgroundColor: isDark
                          ? 'rgba(214, 174, 107, 0.12)'
                          : 'rgba(198, 151, 73, 0.10)',
                      },
                    ]}
                  >
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          {
                            backgroundColor: isDark
                              ? colors.dark.accentBg
                              : colors.light.accentBg,
                            borderColor: isSelected
                              ? (isDark ? colors.gold[400] : colors.gold[500])
                              : 'transparent',
                          },
                        ]}
                      >
                        <IconComponent
                          size={18}
                          color={isDark ? colors.gold[400] : colors.gold[600]}
                        />
                      </View>

                      <View style={styles.textWrap}>
                        <Text
                          style={[
                            styles.categoryLabel,
                            {
                              color: isSelected
                                ? (isDark ? colors.gold[400] : colors.gold[600])
                                : t.text,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {meta.label}
                        </Text>
                        <Text
                          style={[styles.categorySub, { color: t.textMuted }]}
                          numberOfLines={1}
                        >
                          {CATEGORY_SUBTITLES[catKey] || meta.short}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={styles.checkWrap}>
                        <CheckCircle2
                          size={20}
                          color={isDark ? colors.gold[400] : colors.gold[500]}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    maxHeight: '82%',
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 30,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  insetGroup: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    letterSpacing: -0.1,
  },
  categorySub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  checkWrap: {
    marginLeft: 6,
  },
});

