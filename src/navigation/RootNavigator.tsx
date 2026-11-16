import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthStackNavigator } from './AuthStackNavigator';
import { PinSetupScreen, PinUnlockScreen } from '../screens/auth';
import { AppStackNavigator } from './AppStackNavigator';
import { colors } from '../theme/colors';
import { backDispatcher } from './backDispatcher';
import { ExitAppModal } from '../components/modals';

export const navigationRef = createNavigationContainerRef<any>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isRegistered, isPinSet, isPinUnlocked, isLoading, theme } = useAuth();
  const isDark = theme === 'dark';

  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    backDispatcher.init(navigationRef, () => {
      setShowExitModal(true);
    });
  }, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: isDark ? colors.dark.background : colors.light.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.gold[500]} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        {!isAuthenticated ? (
          <AuthStackNavigator initialRouteName="Login" />
        ) : !isRegistered ? (
          <AuthStackNavigator initialRouteName="RegisterHall" />
        ) : !isPinSet ? (
          <PinSetupScreen />
        ) : !isPinUnlocked ? (
          <PinUnlockScreen />
        ) : (
          <AppStackNavigator />
        )}
      </NavigationContainer>

      {/* Root-Level Home Exit Confirmation Dialog (Rule 5) */}
      <ExitAppModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        isDark={isDark}
      />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
