import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Phone, User, CheckCircle2, Sparkles, Check, ArrowRight } from 'lucide-react-native';
import { searchCustomers } from '../../services/bookingService';
import { CustomerSuggestion } from '../../types/booking';
import { colors } from '../../theme/colors';
import { AuthInput } from '../AuthInput';
import { motionTokens } from '../../theme/motion';

interface CustomerAutoSuggestInputProps {
  mobile: string;
  onChangeMobile: (val: string) => void;
  name: string;
  onChangeName: (val: string) => void;
  onSelectSuggestion?: (customer: CustomerSuggestion) => void;
  isDark?: boolean;
}

export const CustomerAutoSuggestInput: React.FC<CustomerAutoSuggestInputProps> = ({
  mobile,
  onChangeMobile,
  name,
  onChangeName,
  onSelectSuggestion,
  isDark = false,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Card slide-down animation
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');

    if (cleanMobile.length < 3) {
      setSuggestions([]);
      cardAnim.setValue(0);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const matches = await searchCustomers(cleanMobile);
      setSuggestions(matches);
      setSearching(false);
      if (matches.length > 0) {
        Animated.spring(cardAnim, {
          toValue: 1,
          ...motionTokens.springOvershoot,
          useNativeDriver: true,
        }).start();
      } else {
        cardAnim.setValue(0);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [mobile, cardAnim]);

  const handleSelectCustomer = (customer: CustomerSuggestion) => {
    onChangeMobile(customer.mobile);
    onChangeName(customer.name);
    setSelectedCustomerId(customer.id);
    setSuggestions([]);
    onSelectSuggestion?.(customer);
  };

  const primarySuggestion = suggestions.length > 0 ? suggestions[0] : null;

  return (
    <View style={styles.container}>
      {/* Mobile Input */}
      <View style={styles.fieldWrapper}>
        <AuthInput
          label="Mobile Number *"
          placeholder="e.g. 9845012345"
          value={mobile}
          onChangeText={text => {
            setSelectedCustomerId(null);
            onChangeMobile(text);
          }}
          keyboardType="phone-pad"
          maxLength={10}
          leftIcon={<Phone size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />}
          rightIcon={
            searching ? (
              <ActivityIndicator size="small" color={colors.gold[500]} />
            ) : undefined
          }
        />

        {/* Smart Card: Existing Customer Found (UX Principle 3.1) */}
        {primarySuggestion && selectedCustomerId !== primarySuggestion.id && (
          <Animated.View
            style={[
              styles.foundCustomerCard,
              {
                backgroundColor: isDark
                  ? 'rgba(214, 174, 107, 0.14)'
                  : 'rgba(198, 151, 73, 0.12)',
                borderColor: isDark
                  ? 'rgba(214, 174, 107, 0.45)'
                  : 'rgba(198, 151, 73, 0.40)',
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                  {
                    scale: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.foundHeaderRow}>
              <View style={styles.foundHeaderLeft}>
                <Sparkles size={14} color={isDark ? colors.gold[400] : colors.gold[600]} />
                <Text
                  style={[
                    styles.foundHeaderTitle,
                    { color: isDark ? colors.gold[400] : colors.gold[700] },
                  ]}
                >
                  Existing customer found
                </Text>
              </View>

              <View
                style={[
                  styles.foundBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(214, 174, 107, 0.25)'
                      : 'rgba(198, 151, 73, 0.20)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.foundBadgeText,
                    { color: isDark ? colors.gold[300] : colors.gold[800] },
                  ]}
                >
                  Found in CRM
                </Text>
              </View>
            </View>

            <View style={styles.foundBodyRow}>
              <View style={styles.foundTextCol}>
                <Text style={[styles.foundName, { color: t.text }]}>
                  {primarySuggestion.name}
                </Text>
                <Text style={[styles.foundMobile, { color: t.textMuted }]}>
                  +91 {primarySuggestion.mobile}
                </Text>
              </View>

              <Pressable
                onPress={() => handleSelectCustomer(primarySuggestion)}
                style={({ pressed }) => [
                  styles.useCustomerBtn,
                  {
                    backgroundColor: isDark
                      ? colors.gold[500]
                      : colors.gold[600],
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Use existing customer: ${primarySuggestion.name}`}
              >
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.useCustomerBtnText}>Use this customer</Text>
              </Pressable>
            </View>

            {/* Additional matches link if multiple exist */}
            {suggestions.length > 1 && (
              <View style={styles.multipleMatchesRow}>
                <Text style={[styles.multipleMatchesText, { color: t.textMuted }]}>
                  +{suggestions.length - 1} more matching customer(s)
                </Text>
                <Pressable
                  onPress={() => handleSelectCustomer(suggestions[1])}
                  style={({ pressed }) => [
                    { transform: [{ scale: pressed ? 0.96 : 1 }] },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.switchMatchText,
                      { color: isDark ? colors.gold[400] : colors.gold[600] },
                    ]}
                  >
                    Select {suggestions[1].name}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        )}

        {/* Linked Customer Confirmation Pill */}
        {selectedCustomerId && (
          <View
            style={[
              styles.linkedCustomerBanner,
              {
                backgroundColor: isDark
                  ? 'rgba(52, 211, 153, 0.12)'
                  : 'rgba(16, 185, 129, 0.10)',
                borderColor: isDark
                  ? 'rgba(52, 211, 153, 0.35)'
                  : 'rgba(16, 185, 129, 0.30)',
              },
            ]}
          >
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={styles.linkedCustomerText}>
              Existing customer profile linked to booking
            </Text>
          </View>
        )}
      </View>

      {/* Customer Full Name Input */}
      <AuthInput
        label="Customer Name *"
        placeholder="Enter full name"
        value={name}
        onChangeText={text => {
          setSelectedCustomerId(null);
          onChangeName(text);
        }}
        leftIcon={<User size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  fieldWrapper: {
    gap: 6,
  },
  foundCustomerCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 4,
    gap: 8,
  },
  foundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foundHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foundHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  foundBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  foundBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  foundBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foundTextCol: {
    gap: 2,
    flex: 1,
    marginRight: 8,
  },
  foundName: {
    fontSize: 14,
    fontWeight: '800',
  },
  foundMobile: {
    fontSize: 11,
    fontWeight: '600',
  },
  useCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 40,
  },
  useCustomerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  multipleMatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  multipleMatchesText: {
    fontSize: 11,
  },
  switchMatchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linkedCustomerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  linkedCustomerText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
});
