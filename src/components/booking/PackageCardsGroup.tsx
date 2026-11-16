import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Package, Check, Sparkles } from 'lucide-react-native';
import { PackageItem } from '../../types/booking';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';
import { SkeletonShimmer } from '../dashboard';

interface PackageCardsGroupProps {
  packages: PackageItem[];
  selectedPackageId: string | null;
  onSelectPackage: (pkg: PackageItem | null) => void;
  currencySymbol?: string;
  isDark?: boolean;
  loading?: boolean;
}

export const PackageCardsGroup: React.FC<PackageCardsGroupProps> = ({
  packages,
  selectedPackageId,
  onSelectPackage,
  currencySymbol = '₹',
  isDark = false,
  loading = false,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // If no packages are loaded from DB, provide standard defaults
  const displayPackages: PackageItem[] =
    packages && packages.length > 0
      ? packages
      : [
          {
            id: 'pkg-silver',
            name: 'Silver Package',
            price: 50000,
            amenities: ['Main Hall', 'Standard AC', 'Basic Lighting'],
            is_active: true,
          },
          {
            id: 'pkg-gold',
            name: 'Gold Package',
            price: 100000,
            amenities: ['Main Hall + Lawn', 'Central AC', 'Stage Decor', 'Generator Backup'],
            is_active: true,
          },
          {
            id: 'pkg-diamond',
            name: 'Diamond Package',
            price: 200000,
            amenities: ['Full Venue Access', 'Premium Decor', 'Bridal Suite', 'Full Power Backup'],
            is_active: true,
          },
        ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: t.text }]}>
          Which package has the customer selected?
        </Text>
        <Text style={[styles.subLabel, { color: t.textMuted }]}>
          Select a package to auto-fill pricing or choose Custom
        </Text>
      </View>

      <View style={[styles.cardsStack, { position: 'relative' }]}>
        <SkeletonShimmer active={loading} borderRadius={18} />

        {displayPackages.map(pkg => {
          const isSelected = selectedPackageId === pkg.id;

          return (
            <Pressable
              key={pkg.id}
              onPress={() => onSelectPackage(pkg)}
              accessibilityRole="radio"
              accessibilityLabel={`${pkg.name}, priced at ${formatCurrency(pkg.price, currencySymbol)}`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.packageCard,
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
                  transform: [
                    { scale: pressed ? 0.965 : isSelected ? 1.015 : 1 },
                  ],
                  shadowColor: isSelected ? colors.gold[500] : 'transparent',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isSelected ? 0.25 : 0,
                  shadowRadius: 6,
                  elevation: isSelected ? 3 : 0,
                },
              ]}
            >
              <View style={styles.cardLeft}>
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
                  <Package
                    size={18}
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                    }
                  />
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.packageName,
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
                      {pkg.name}
                    </Text>
                  </View>

                  {pkg.amenities && pkg.amenities.length > 0 && (
                    <Text
                      style={[
                        styles.amenitiesText,
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
                      {pkg.amenities.join(' • ')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.cardRight}>
                <Text
                  style={[
                    styles.priceText,
                    {
                      color: isDark ? colors.gold[400] : colors.gold[600],
                    },
                  ]}
                >
                  {formatCurrency(pkg.price, currencySymbol)}
                </Text>

                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected
                        ? isDark
                          ? colors.gold[400]
                          : colors.gold[600]
                        : t.textMuted,
                      backgroundColor: isSelected
                        ? isDark
                          ? colors.gold[500]
                          : colors.gold[600]
                        : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </View>
            </Pressable>
          );
        })}

        {/* Custom / No Package Option */}
        {(() => {
          const isSelected = selectedPackageId === null;
          return (
            <Pressable
              onPress={() => onSelectPackage(null)}
              accessibilityRole="radio"
              accessibilityLabel="Custom pricing without predefined package"
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.packageCard,
                styles.customCard,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(214, 174, 107, 0.20)'
                      : 'rgba(198, 151, 73, 0.16)'
                    : isDark
                    ? 'rgba(35, 33, 30, 0.45)'
                    : 'rgba(255, 255, 255, 0.65)',
                  borderColor: isSelected
                    ? isDark
                      ? colors.gold[400]
                      : colors.gold[600]
                    : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.08)',
                  transform: [
                    { scale: pressed ? 0.965 : isSelected ? 1.015 : 1 },
                  ],
                },
              ]}
            >
              <View style={styles.cardLeft}>
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
                  <Sparkles
                    size={18}
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                    }
                  />
                </View>

                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.packageName,
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
                    Custom (Manual Pricing)
                  </Text>
                  <Text
                    style={[
                      styles.amenitiesText,
                      {
                        color: isSelected
                          ? isDark
                            ? colors.gold[200]
                            : colors.gold[900]
                          : t.textMuted,
                      },
                    ]}
                  >
                    Enter bespoke contract amount directly
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isSelected
                      ? isDark
                        ? colors.gold[400]
                        : colors.gold[600]
                      : t.textMuted,
                    backgroundColor: isSelected
                      ? isDark
                        ? colors.gold[500]
                        : colors.gold[600]
                      : 'transparent',
                  },
                ]}
              >
                {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 8,
  },
  headerRow: {
    gap: 2,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subLabel: {
    fontSize: 12,
  },
  cardsStack: {
    gap: 10,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 64,
  },
  customCard: {
    borderStyle: 'dashed',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageName: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  amenitiesText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

