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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Safe fallback
      }
    }
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.touchable, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={['#F5D372', '#E5B842', '#C9971D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#1A1500" />
        ) : (
          <>
            {Boolean(icon) && icon}
            <Text style={[styles.text, textStyle, Boolean(icon) && styles.textWithIcon]}>
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#E5B842',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  gradient: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  text: {
    color: '#1A1500',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textWithIcon: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
});

