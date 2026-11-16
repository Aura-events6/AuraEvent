import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface PinKeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYPAD_ROWS = [
  [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
  ],
  [
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
  ],
  [
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
  ],
  [
    { digit: '', letters: '', isBlank: true },
    { digit: '0', letters: '+' },
    { digit: 'back', letters: '', isBack: true },
  ],
];

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onDigitPress,
  onBackspace,
  disabled = false,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const t = isDark ? colors.dark : colors.light;

  const handleDigit = (digit: string) => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Safe fallback
      }
    }
    onDigitPress(digit);
  };

  const handleBackspacePress = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {
        // Safe fallback
      }
    }
    onBackspace();
  };

  const keyBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.85)';
  const keyBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(198, 151, 73, 0.25)';
  const digitColor = t.text;
  const subtextColor = t.textSubtle;
  const iconColor = isDark ? '#D4D4D8' : '#44403C';

  return (
    <View style={styles.container}>
      {KEYPAD_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((btn, colIndex) => {
            if (btn.isBlank) {
              return <View key={colIndex} style={styles.keyPlaceholder} />;
            }

            if (btn.isBack) {
              return (
                <Pressable
                  key={colIndex}
                  onPress={handleBackspacePress}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.keyButton,
                    {
                      backgroundColor: pressed
                        ? (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.15)')
                        : keyBg,
                      borderColor: pressed
                        ? (isDark ? '#F87171' : '#DC2626')
                        : keyBorder,
                      transform: [{ scale: pressed ? 0.93 : 1 }],
                    },
                  ]}
                  accessibilityLabel="Backspace"
                >
                  <Delete size={22} color={iconColor} />
                </Pressable>
              );
            }

            return (
              <Pressable
                key={colIndex}
                onPress={() => handleDigit(btn.digit)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.keyButton,
                  {
                    backgroundColor: pressed
                      ? (isDark ? 'rgba(229, 184, 66, 0.22)' : 'rgba(198, 151, 73, 0.28)')
                      : keyBg,
                    borderColor: pressed
                      ? (isDark ? colors.gold[400] : colors.gold[600])
                      : keyBorder,
                    transform: [{ scale: pressed ? 0.93 : 1 }],
                  },
                ]}
                accessibilityLabel={`Digit ${btn.digit}`}
              >
                <Text style={[styles.digitText, { color: digitColor }]}>{btn.digit}</Text>
                {Boolean(btn.letters) && (
                  <Text style={[styles.lettersText, { color: subtextColor }]}>
                    {btn.letters}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 14,
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
        } as any)
      : {}),
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
  digitText: {
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 30,
  },
  lettersText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: -2,
  },
});


