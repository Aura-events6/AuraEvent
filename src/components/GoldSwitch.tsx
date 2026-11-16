import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  Animated,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { motionTokens } from '../theme/motion';

interface GoldSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const GoldSwitch: React.FC<GoldSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
}) => {
  // 0 = false (left), 1 = true (right)
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      ...motionTokens.springOvershoot,
      useNativeDriver: false, // needed for backgroundColor interpolation
    }).start();
  }, [value, animValue]);

  const handleToggle = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {
        // Safe fallback
      }
    }
    onValueChange(!value);
  };

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 20],
  });

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(120, 113, 108, 0.35)', '#C69749'],
  });

  return (
    <Pressable
      onPress={handleToggle}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        {
          transform: [{ scale: pressed && !disabled ? 0.95 : 1 }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    position: 'relative',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});

