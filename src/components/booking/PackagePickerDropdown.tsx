import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Package, ChevronDown, Check, Sparkles } from 'lucide-react-native';
import { PackageItem } from '../../types/booking';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';

interface PackagePickerDropdownProps {
  selectedPackageId: string | null;
  onSelectPackage: (pkg: PackageItem | null) => void;
  packages: PackageItem[];
  currencySymbol?: string;
  isDark?: boolean;
}

export const PackagePickerDropdown: React.FC<PackagePickerDropdownProps> = ({
  selectedPackageId,
  onSelectPackage,
  packages,
  currencySymbol = '₹',
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const [isOpen, setIsOpen] = useState(false);

  const selectedPkg = packages.find(p => p.id === selectedPackageId);

  const handleSelect = (pkg: PackageItem | null) => {
    onSelectPackage(pkg);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: t.text }]}>Hall Package</Text>

      {/* Main Trigger Button */}
      <TouchableOpacity
        onPress={() => setIsOpen(prev => !prev)}
        activeOpacity={0.8}
        style={[
          styles.triggerBtn,
          {
            backgroundColor: isDark
              ? 'rgba(35, 33, 30, 0.75)'
              : 'rgba(255, 255, 255, 0.85)',
            borderColor: isDark
              ? 'rgba(214, 174, 107, 0.35)'
              : 'rgba(198, 151, 73, 0.35)',
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <Package size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
          {selectedPkg ? (
            <View>
              <Text style={[styles.selectedTitle, { color: t.text }]}>
                {selectedPkg.name}
              </Text>
              <Text
                style={[
                  styles.selectedPrice,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                Default Price: {formatCurrency(selectedPkg.price, currencySymbol)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: t.textMuted }]}>
              Custom (No Package Selected)
            </Text>
          )}
        </View>

        <ChevronDown
          size={18}
          color={t.textMuted}
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {/* Dropdown Options List */}
      {isOpen && (
        <View
          style={[
            styles.optionsList,
            {
              backgroundColor: isDark
                ? 'rgba(35, 33, 30, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark
                ? 'rgba(214, 174, 107, 0.4)'
                : 'rgba(198, 151, 73, 0.4)',
            },
          ]}
        >
          {/* Custom option */}
          <TouchableOpacity
            onPress={() => handleSelect(null)}
            style={[
              styles.optionRow,
              {
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <View>
              <Text style={[styles.optionTitle, { color: t.text }]}>
                Custom (No Package)
              </Text>
              <Text style={[styles.optionSubtitle, { color: t.textMuted }]}>
                Set custom pricing directly without package template
              </Text>
            </View>
            {!selectedPackageId && <Check size={16} color={colors.gold[500]} />}
          </TouchableOpacity>

          {/* Package items */}
          {packages.map(pkg => {
            const isSelected = pkg.id === selectedPackageId;

            return (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => handleSelect(pkg)}
                style={[
                  styles.optionRow,
                  {
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.optionHeaderRow}>
                    <Text style={[styles.optionTitle, { color: t.text }]}>
                      {pkg.name}
                    </Text>
                    <Text
                      style={[
                        styles.optionPriceBadge,
                        { color: isDark ? colors.gold[400] : colors.gold[600] },
                      ]}
                    >
                      {formatCurrency(pkg.price, currencySymbol)}
                    </Text>
                  </View>

                  {pkg.amenities && pkg.amenities.length > 0 && (
                    <Text
                      style={[styles.optionSubtitle, { color: t.textMuted }]}
                      numberOfLines={1}
                    >
                      {pkg.amenities.join(' • ')}
                    </Text>
                  )}
                </View>

                {isSelected && <Check size={16} color={colors.gold[500]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    position: 'relative',
    zIndex: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 52,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedPrice: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 50,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionPriceBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});

