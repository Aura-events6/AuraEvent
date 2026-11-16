import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

interface AuthInputProps extends TextInputProps {
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  isPassword?: boolean;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  leftIcon,
  rightIcon,
  error,
  isPassword = false,
  value,
  onClear,
  showClearButton = false,
  style,
  placeholderTextColor,
  ...rest
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const inputTextColor = t.text;
  const computedPlaceholderColor = placeholderTextColor ?? t.textSubtle;
  const iconColor = isDark ? '#A1A1AA' : '#78716C';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#D4D4D8' : '#44403C' }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.28)',
          },
          isFocused && {
            borderColor: colors.gold[500],
            backgroundColor: isDark ? 'rgba(229, 184, 66, 0.08)' : 'rgba(198, 151, 73, 0.10)',
          },
          Boolean(error) && styles.inputWrapperError,
        ]}
      >
        {Boolean(leftIcon) && <View style={styles.leftIconSlot}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, { color: inputTextColor }, style]}
          value={value}
          placeholderTextColor={computedPlaceholderColor}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={colors.gold[500]}
          {...rest}
        />

        {rightIcon && <View style={styles.rightIconButton}>{rightIcon}</View>}

        {showClearButton && Boolean(value) && Boolean(onClear) && (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear input"
          >
            <X size={16} color={iconColor} />
          </TouchableOpacity>
        )}

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={() => setShowPassword(prev => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff size={18} color={iconColor} />
            ) : (
              <Eye size={18} color={iconColor} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  leftIconSlot: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  rightIconButton: {
    padding: 6,
    marginLeft: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});


