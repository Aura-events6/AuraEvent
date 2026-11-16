import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Check, Calendar } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { formatCurrency } from '../../utils/dateUtils';
import { motionTokens } from '../../theme/motion';
import { useBackOverlay } from '../../hooks/useBackOverlay';

interface BookingSuccessModalProps {
  visible: boolean;
  customerName: string;
  eventType: string;
  eventDate: string;
  advanceAmount: number;
  advanceMode: string;
  balanceDue: number;
  billNumber?: string | null;
  currencySymbol?: string;
  isDark?: boolean;
  onCreateAnother: () => void;
  onClose: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  visible,
  customerName,
  eventType,
  eventDate,
  advanceAmount,
  advanceMode,
  balanceDue,
  billNumber,
  currencySymbol = '₹',
  isDark = false,
  onCreateAnother,
  onClose,
}) => {
  const t = isDark ? colors.dark : colors.light;

  // LIFO overlay stack registration (Rule 1)
  useBackOverlay(visible, onClose);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.90)).current;
  const translateYAnim = useRef(new Animated.Value(24)).current;

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
      scaleAnim.setValue(0.90);
      translateYAnim.setValue(24);
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
              backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)',
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
                    ? 'rgba(214, 174, 107, 0.40)'
                    : 'rgba(214, 174, 107, 0.45)',
                },
              ]}
            >
              {/* Crown / Check Gold Badge */}
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                  },
                ]}
              >
                <Check size={28} color="#000" strokeWidth={3} />
              </View>

              {/* Title & Subtitle */}
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: t.text }]}>
                  Booking Confirmed!
                </Text>
                <Text style={[styles.subtitle, { color: t.textMuted }]}>
                  Hall slot locked with zero conflicts. Added to live calendar.
                </Text>
              </View>

              {/* Summary Details Card */}
              <View
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(214, 174, 107, 0.10)'
                      : 'rgba(214, 174, 107, 0.12)',
                    borderColor: isDark
                      ? 'rgba(214, 174, 107, 0.25)'
                      : 'rgba(214, 174, 107, 0.30)',
                  },
                ]}
              >
                {billNumber ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: t.textMuted }]}>
                      Bill Number:
                    </Text>
                    <Text style={[styles.detailVal, { color: t.text }]}>
                      {billNumber}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={[styles.detailKey, { color: t.textMuted }]}>
                    Customer:
                  </Text>
                  <Text style={[styles.detailVal, { color: t.text }]}>
                    {customerName || '—'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailKey, { color: t.textMuted }]}>
                    Event:
                  </Text>
                  <Text style={[styles.detailVal, { color: t.text }]}>
                    {eventType} ({eventDate})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailKey, { color: t.textMuted }]}>
                    Advance Received:
                  </Text>
                  <Text style={[styles.detailVal, { color: '#059669' }]}>
                    {formatCurrency(advanceAmount, currencySymbol)} ({advanceMode.toUpperCase()})
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailKey, { color: t.textMuted }]}>
                    Remaining Due:
                  </Text>
                  <Text
                    style={[
                      styles.detailVal,
                      { color: isDark ? colors.gold[400] : colors.gold[700] },
                    ]}
                  >
                    {formatCurrency(balanceDue, currencySymbol)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <Pressable
                  onPress={onCreateAnother}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Create another booking"
                >
                  <Text style={styles.primaryBtnText}>
                    Create Another Booking
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close and return to calendar"
                >
                  <Text style={[styles.secondaryBtnText, { color: t.text }]}>
                    View Calendar / Close
                  </Text>
                </Pressable>
              </View>
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
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 24,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  detailKey: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
    paddingTop: 4,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

