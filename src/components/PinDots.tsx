import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

interface PinDotsProps {
  pinLength: number;
  maxDigits?: number;
  hasError?: boolean;
}

export const PinDots: React.FC<PinDotsProps> = ({
  pinLength,
  maxDigits = 4,
  hasError = false,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [hasError, shakeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      {Array.from({ length: maxDigits }).map((_, index) => {
        const isFilled = index < pinLength;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(198, 151, 73, 0.45)',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(28, 25, 23, 0.06)',
              },
              isFilled && {
                backgroundColor: isDark ? colors.gold[500] : colors.gold[600],
                borderColor: isDark ? colors.gold[400] : colors.gold[700],
                shadowColor: isDark ? colors.gold[500] : '#B07E34',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.8 : 0.4,
                shadowRadius: 8,
                elevation: 4,
              },
              hasError && styles.dotError,
            ]}
          />
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  dotError: {
    backgroundColor: '#EF4444',
    borderColor: '#F87171',
    shadowColor: '#EF4444',
  },
});


