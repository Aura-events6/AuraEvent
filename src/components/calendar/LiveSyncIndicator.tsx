import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import { SyncStatus } from '../../hooks/useRealtimeCalendar';
import { colors } from '../../theme/colors';

interface LiveSyncIndicatorProps {
  status: SyncStatus;
  isDark?: boolean;
}

export const LiveSyncIndicator: React.FC<LiveSyncIndicatorProps> = ({
  status,
  isDark = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'connected') {
      const animation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 0.35,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(rippleAnim, {
              toValue: 1,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(rippleAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
      rippleAnim.setValue(0);
    }
  }, [status, pulseAnim, rippleAnim]);

  const config = {
    connected: {
      label: 'Live Sync',
      dotColor: isDark ? colors.status.success.dark : colors.status.success.light,
      bgColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.10)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.35)',
      textColor: isDark ? colors.status.success.dark : colors.status.success.light,
      Icon: Wifi,
    },
    connecting: {
      label: 'Connecting...',
      dotColor: isDark ? colors.status.warning.dark : colors.status.warning.light,
      bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.10)',
      borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.35)',
      textColor: isDark ? colors.status.warning.dark : colors.status.warning.light,
      Icon: Wifi,
    },
    disconnected: {
      label: 'Offline',
      dotColor: isDark ? '#A1A1AA' : '#78716C',
      bgColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
      textColor: isDark ? '#A1A1AA' : '#78716C',
      Icon: WifiOff,
    },
  }[status];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
      accessible
      accessibilityLabel={`Realtime sync status: ${config.label}`}
    >
      <View style={styles.dotContainer}>
        {status === 'connected' && (
          <Animated.View
            style={[
              styles.rippleRing,
              {
                borderColor: config.dotColor,
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.8, 0.2, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: config.dotColor,
              opacity: status === 'connected' ? pulseAnim : 1,
            },
          ]}
        />
      </View>
      <Text style={[styles.text, { color: config.textColor }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 28,
  },
  dotContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

