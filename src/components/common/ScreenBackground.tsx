import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

interface ScreenBackgroundProps {
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * ScreenBackground provides the 1:1 Apple luxury ambient gradient in light mode
 * (#FCFBF9 -> #F5F1EA -> #EFECE6 with champagne radial warmth) while strictly
 * preserving the obsidian charcoal dark mode.
 */
export const ScreenBackground: React.FC<ScreenBackgroundProps> = ({
  isDark = false,
  style,
  children,
}) => {
  if (isDark) {
    return (
      <View style={[styles.container, { backgroundColor: colors.dark.background }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Base 160-degree Luxury Cream Gradient */}
      <LinearGradient
        colors={colors.lightGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top-Right Champagne Radial Warmth (HTML line 65) */}
      <View pointerEvents="none" style={styles.topRightGlow} />

      {/* Bottom-Left Gold Radial Warmth (HTML line 66) */}
      <View pointerEvents="none" style={styles.bottomLeftGlow} />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  topRightGlow: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(214, 174, 107, 0.10)',
  },
  bottomLeftGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(198, 151, 73, 0.07)',
  },
});

