import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen, RegisterHallScreen, PinSetupScreen } from '../screens/auth';
import { AuthStackParamList } from '../types';

interface AuthStackNavigatorProps {
  initialRouteName?: keyof AuthStackParamList;
}

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStackNavigator: React.FC<AuthStackNavigatorProps> = ({
  initialRouteName = 'Login',
}) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterHall" component={RegisterHallScreen} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} />
    </Stack.Navigator>
  );
};
