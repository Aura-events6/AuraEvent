import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, ThemeMode } from './colors';

export const glassStyles = {
  // Border Radii adhering to Apple Human Interface Guidelines
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 26,
    full: 9999,
  },

  // Generates glassmorphic card style for given mode
  getCardStyle: (isDark: boolean): ViewStyle => ({
    backgroundColor: isDark ? colors.dark.card : colors.light.card,
    borderColor: isDark ? colors.dark.cardBorder : colors.light.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: isDark ? '#000000' : '#1C1917',
    shadowOffset: { width: 0, height: isDark ? 16 : 8 },
    shadowOpacity: isDark ? 0.45 : 0.05,
    shadowRadius: isDark ? 24 : 16,
    elevation: isDark ? 6 : 2,
  }),

  // Generates input style for given mode
  getInputStyle: (isDark: boolean): TextStyle => ({
    backgroundColor: isDark ? colors.dark.input : colors.light.input,
    borderColor: isDark ? colors.dark.inputBorder : colors.light.inputBorder,
    borderWidth: 1,
    borderRadius: 16,
    color: isDark ? colors.dark.text : colors.light.text,
  }),

  // Generates pill / badge background
  getPillStyle: (isDark: boolean, colorType: 'gold' | 'success' | 'danger' | 'warning' = 'gold'): ViewStyle => {
    let bg = isDark ? colors.dark.accentBg : colors.light.accentBg;
    if (colorType === 'success') bg = isDark ? colors.status.success.bgDark : colors.status.success.bgLight;
    if (colorType === 'danger') bg = isDark ? colors.status.danger.bgDark : colors.status.danger.bgLight;
    if (colorType === 'warning') bg = isDark ? colors.status.warning.bgDark : colors.status.warning.bgLight;
    return {
      backgroundColor: bg,
      borderRadius: 9999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    };
  },
};

