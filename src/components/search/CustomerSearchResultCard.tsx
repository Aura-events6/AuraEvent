import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Phone } from 'lucide-react-native';
import { CustomerSearchResult } from '../../types/search';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';

interface CustomerSearchResultCardProps {
  customer: CustomerSearchResult;
  onPress: (customer: CustomerSearchResult) => void;
  isDark?: boolean;
}

export const CustomerSearchResultCard: React.FC<CustomerSearchResultCardProps> = ({
  customer,
  onPress,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;

  const initials = (customer.name || 'Customer')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        glassStyles.getCardStyle(isDark),
        {
          transform: [{ scale: pressed ? 0.965 : 1 }],
        },
      ]}
      onPress={() => onPress(customer)}
      accessibilityRole="button"
      accessibilityLabel={`View CRM profile for ${customer.name}`}
    >
      {({ pressed }) => (
        <>
          <View style={styles.leftRow}>
            <LinearGradient colors={colors.goldGradient} style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </LinearGradient>

            <View style={styles.infoCol}>
              <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                {customer.name}
              </Text>

              <View style={styles.phoneRow}>
                <Phone size={12} color={t.textSubtle} />
                <Text style={[styles.phoneText, { color: t.textMuted }]}>
                  {customer.mobile}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rightRow}>
            <View
              style={[
                styles.bookingsBadge,
                {
                  backgroundColor: isDark
                    ? colors.dark.accentBg
                    : colors.light.accentBg,
                  borderColor: isDark
                    ? 'rgba(214, 174, 107, 0.25)'
                    : 'rgba(198, 151, 73, 0.3)',
                },
              ]}
            >
              <Text
                style={[
                  styles.bookingsBadgeText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                {customer.lifetimeBookingsCount}{' '}
                {customer.lifetimeBookingsCount === 1 ? 'Booking' : 'Bookings'}
              </Text>
            </View>

            <View style={{ transform: [{ translateX: pressed ? 3 : 0 }] }}>
              <ChevronRight size={18} color={t.textSubtle} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 10,
    minHeight: 64,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  bookingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

