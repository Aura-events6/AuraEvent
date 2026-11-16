import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabNavigator } from './MainTabNavigator';
import { SuperAdminTabNavigator } from './SuperAdminTabNavigator';
import { BookingFormScreen, BookingDetailsScreen } from '../screens/booking';
import { KhatabookScreen } from '../screens/khatabook';
import { UsersScreen } from '../screens/staff';
import { SearchScreen, CustomerProfileScreen } from '../screens/search';
import { AnalyticsScreen } from '../screens/analytics';
import { ExpenseTrackerScreen } from '../screens/expenses';
import {
  SuperAdminHallDetailScreen,
  SuperAdminSupportCalendarScreen,
} from '../screens/superadmin';
import { BookingSlot } from '../types/calendar';
import { KhatabookFilter } from '../types/khatabook';
import { SuperAdminHallItem, SuperAdminHallFilter } from '../types/superadmin';
import { useAuth } from '../context/AuthContext';

export type AppStackParamList = {
  // Tenant Mode Routes
  MainTabs: undefined;
  BookingForm: {
    mode: 'create' | 'edit';
    initialDate?: string;
    initialSlot?: BookingSlot;
    bookingId?: string;
    wasElapsedNotice?: boolean;
    initialCustomerName?: string;
    initialCustomerMobile?: string;
  };
  BookingDetails: {
    bookingId: string;
    isElapsed?: boolean;
  };
  Khatabook:
    | {
        initialFilter?: KhatabookFilter;
      }
    | undefined;
  Users: undefined;
  Search: undefined;
  CustomerProfile: {
    customerId: string;
  };
  Analytics: undefined;
  ExpenseTracker: undefined;

  // SuperAdmin Mode Routes (Strictly Isolated)
  SuperAdminTabs: undefined;
  SuperAdminHallDetail: { hall: SuperAdminHallItem };
  SuperAdminSupportCalendar: { hall: SuperAdminHallItem };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStackNavigator: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  // 1. ISOLATED SUPERADMIN OPERATOR STACK
  if (isSuperAdmin) {
    return (
      <Stack.Navigator
        initialRouteName="SuperAdminTabs"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="SuperAdminTabs" component={SuperAdminTabNavigator} />
        <Stack.Screen
          name="SuperAdminHallDetail"
          component={SuperAdminHallDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="SuperAdminSupportCalendar"
          component={SuperAdminSupportCalendarScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    );
  }

  // 2. TENANT APPLICATION STACK (OWNER & STAFF ONLY)
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="BookingForm"
        component={BookingFormScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Khatabook"
        component={KhatabookScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Users"
        component={UsersScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ExpenseTracker"
        component={ExpenseTrackerScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};
