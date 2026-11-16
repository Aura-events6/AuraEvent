import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

function AppContent() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const bgColor = isDark ? colors.dark.background : colors.light.background;

  return (
    <View style={[styles.outerContainer, { backgroundColor: bgColor }]}>
      <View style={[styles.appShell, { backgroundColor: bgColor }]}>
        <RootNavigator />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  appShell: {
    flex: 1,
    width: '100%',
  },
});

