import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, Building2, PlusCircle, Settings } from 'lucide-react-native';
import {
  SuperAdminDashboardScreen,
  SuperAdminHallsListScreen,
  SuperAdminCreateHallScreen,
  SuperAdminSettingsScreen,
} from '../screens/superadmin';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export const SuperAdminTabNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      initialRouteName="SuperAdminOverview"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 14,
          left: 20,
          right: 20,
          height: 64,
          borderRadius: 32,
          backgroundColor: isDark ? 'rgba(35, 33, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(198, 151, 73, 0.25)',
          borderWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: isDark ? '#000000' : '#1C1917',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.6 : 0.08,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: isDark ? colors.gold[400] : colors.gold[600],
        tabBarInactiveTintColor: isDark ? 'rgba(250, 250, 250, 0.45)' : 'rgba(28, 25, 23, 0.45)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarIcon: ({ color, focused }) => {
          const iconSize = 20;
          const strokeWidth = focused ? 2.5 : 1.8;
          if (route.name === 'SuperAdminOverview') {
            return <BarChart3 size={iconSize} color={color} strokeWidth={strokeWidth} />;
          }
          if (route.name === 'SuperAdminDirectory') {
            return <Building2 size={iconSize} color={color} strokeWidth={strokeWidth} />;
          }
          if (route.name === 'SuperAdminProvision') {
            return <PlusCircle size={iconSize} color={color} strokeWidth={strokeWidth} />;
          }
          if (route.name === 'SuperAdminSettings') {
            return <Settings size={iconSize} color={color} strokeWidth={strokeWidth} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen
        name="SuperAdminOverview"
        component={SuperAdminDashboardScreen}
        options={{
          tabBarLabel: 'Overview',
        }}
      />
      <Tab.Screen
        name="SuperAdminDirectory"
        component={SuperAdminHallsListScreen}
        options={{
          tabBarLabel: 'Halls',
        }}
      />
      <Tab.Screen
        name="SuperAdminProvision"
        component={SuperAdminCreateHallScreen}
        options={{
          tabBarLabel: 'New Hall',
        }}
      />
      <Tab.Screen
        name="SuperAdminSettings"
        component={SuperAdminSettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

