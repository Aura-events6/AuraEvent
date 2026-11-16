import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface SearchInputProps {
  value?: string;
  placeholder?: string;
  onSearch?: (debouncedQuery: string) => void;
  onSearchChange?: (debouncedQuery: string) => void;
  debounceMs?: number;
  isLoading?: boolean;
  isDark?: boolean;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: initialValue = '',
  placeholder = 'Search by customer name, mobile, or bill number...',
  onSearch,
  onSearchChange,
  debounceMs = 300,
  isLoading = false,
  isDark = true,
  autoFocus = false,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const [text, setText] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const notifyChange = (val: string) => {
    if (onSearch) onSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      notifyChange(text.trim());
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, debounceMs]);

  const handleClear = () => {
    setText('');
    notifyChange('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.dark.input : colors.light.input,
          borderColor: isFocused
            ? isDark
              ? colors.gold[400]
              : colors.gold[600]
            : isDark
              ? colors.dark.inputBorder
              : colors.light.inputBorder,
        },
      ]}
    >
      <Search
        size={18}
        color={
          isFocused
            ? isDark
              ? colors.gold[400]
              : colors.gold[600]
            : t.textSubtle
        }
        style={styles.searchIcon}
      />

      <TextInput
        style={[styles.input, { color: t.text }]}
        placeholder={placeholder}
        placeholderTextColor={t.textSubtle}
        value={text}
        onChangeText={setText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        accessibilityLabel="Search input"
      />

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isDark ? colors.gold[400] : colors.gold[600]}
          style={styles.rightAction}
        />
      ) : text.length > 0 ? (
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.rightAction,
            { transform: [{ scale: pressed ? 0.88 : 1 }] },
          ]}
          accessibilityLabel="Clear search"
        >
          <X size={16} color={t.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    width: '100%',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  rightAction: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
});
