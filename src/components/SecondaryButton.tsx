import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {
        // Safe fallback
      }
    }
    onPress();
  };

  const dynamicButtonStyles: ViewStyle = isDark
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.16)',
      }
    : {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(198, 151, 73, 0.45)',
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
      };

  const dynamicTextColor = isDark ? '#F4F4F5' : '#1C1917';
  const spinnerColor = isDark ? '#D4D4D8' : '#44403C';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.button, dynamicButtonStyles, disabled && styles.disabled, style]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {Boolean(icon) && icon}
          <Text
            style={[
              styles.text,
              { color: dynamicTextColor },
              textStyle,
              Boolean(icon) && styles.textWithIcon,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    width: '100%',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textWithIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.45,
  },
});
