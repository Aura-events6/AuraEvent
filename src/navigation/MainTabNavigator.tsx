import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Calendar, Package, Settings, Receipt } from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { PackagesScreen } from '../screens/PackagesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ExpenseTrackerScreen } from '../screens/expenses';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

const GlidingTabBar: React.FC<BottomTabBarProps & { isDark: boolean }> = ({
  state,
  navigation,
  isDark,
}) => {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const pillTranslateX = useRef(new Animated.Value(0)).current;

  const numTabs = state.routes.length;
  const padding = 6;
  const tabWidth = barWidth > 0 ? (barWidth - padding * 2) / numTabs : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.spring(pillTranslateX, {
        toValue: state.index * tabWidth,
        tension: 140,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, tabWidth]);

  // Dynamic bottom calculation: respects Android 3-Button (~48dp), gesture bar (~16dp), and iOS Home Bar (~34dp)
  const dynamicBottom = insets.bottom > 0
    ? insets.bottom + (Platform.OS === 'android' ? 8 : 8)
    : 16;

  const inactiveColor = isDark
    ? 'rgba(255, 255, 255, 0.55)'
    : 'rgba(40, 36, 32, 0.55)';

  return (
    <View
      style={[
        styles.floatingNavWrapper,
        {
          bottom: dynamicBottom,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        style={[
          styles.floatingNavContainer,
          {
            backgroundColor: isDark
              ? 'rgba(20, 20, 23, 0.90)'
              : 'rgba(255, 255, 255, 0.88)',
            borderColor: isDark
              ? 'rgba(214, 174, 107, 0.22)'
              : 'rgba(255, 255, 255, 0.95)',
          },
        ]}
      >
        {/* Animated Gliding Gold Pill Capsule */}
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glidingPill,
              {
                width: tabWidth,
                transform: [{ translateX: pillTranslateX }],
              },
            ]}
          >
            <LinearGradient
              colors={colors.goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillGradient}
            />
          </Animated.View>
        )}

        {/* Tab Buttons */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconSize = 18;
          let icon = null;
          let label = 'Home';

          switch (route.name) {
            case 'Dashboard':
              label = 'Home';
              icon = (
                <Home
                  size={iconSize}
                  color={isFocused ? '#FFFFFF' : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 1.8}
                />
              );
              break;
            case 'Calendar':
              label = 'Calendar';
              icon = (
                <Calendar
                  size={iconSize}
                  color={isFocused ? '#FFFFFF' : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 1.8}
                />
              );
              break;
            case 'Expenses':
              label = 'Expenses';
              icon = (
                <Receipt
                  size={iconSize}
                  color={isFocused ? '#FFFFFF' : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 1.8}
                />
              );
              break;
            case 'Packages':
              label = 'Packages';
              icon = (
                <Package
                  size={iconSize}
                  color={isFocused ? '#FFFFFF' : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 1.8}
                />
              );
              break;
            case 'Settings':
              label = 'Settings';
              icon = (
                <Settings
                  size={iconSize}
                  color={isFocused ? '#FFFFFF' : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 1.8}
                />
              );
              break;
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              testID={`tab-${route.name.toLowerCase()}`}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={styles.tabButton}
            >
              <View style={styles.tabContent}>
                {icon}
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? '#FFFFFF' : inactiveColor,
                      fontWeight: isFocused ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const MainTabNavigator: React.FC = () => {
  const { theme, user } = useAuth();
  const isDark = theme === 'dark';

  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const canAccessCalendar = isOwner || Boolean(user?.screenAccess?.calendar);
  const canAccessPackages = isOwner || Boolean(user?.screenAccess?.search);
  const canAccessExpenses = isOwner || Boolean((user as any)?.screenAccess?.expenses);

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      tabBar={(props) => <GlidingTabBar {...props} isDark={isDark} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />

      {canAccessCalendar && (
        <Tab.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{
            tabBarLabel: 'Calendar',
          }}
        />
      )}

      {canAccessExpenses && (
        <Tab.Screen
          name="Expenses"
          component={ExpenseTrackerScreen}
          options={{
            tabBarLabel: 'Expenses',
          }}
        />
      )}

      {canAccessPackages && (
        <Tab.Screen
          name="Packages"
          component={PackagesScreen}
          options={{
            tabBarLabel: 'Packages',
          }}
        />
      )}

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  floatingNavWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  floatingNavContainer: {
    width: '100%',
    maxWidth: 440,
    height: 60,
    borderRadius: 9999,
    borderWidth: 1,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  glidingPill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 6,
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  pillGradient: {
    flex: 1,
    borderRadius: 9999,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: -0.2,
  },
});
