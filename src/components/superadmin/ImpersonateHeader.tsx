import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Eye, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { motionTokens } from '../../theme/motion';

export interface ImpersonateHeaderProps {
  onExit?: () => void;
}

export const ImpersonateHeader: React.FC<ImpersonateHeaderProps> = ({ onExit }) => {
  const { supportHall, exitSupportMode } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!supportHall) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [supportHall, pulseAnim]);

  if (!supportHall) return null;

  const handleExit = () => {
    exitSupportMode();
    onExit?.();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftContent}>
          <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Eye size={14} color="#78350F" strokeWidth={2.5} />
          </Animated.View>
          <View style={styles.textColumn}>
            <Text style={styles.badgeText}>SUPPORT MODE • READ-ONLY</Text>
            <Text style={styles.hallNameText} numberOfLines={1}>
              {supportHall.name} ({supportHall.phone})
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleExit}
          onPressIn={() => Animated.timing(exitScale, { toValue: 0.92, duration: motionTokens.durPress, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(exitScale, { toValue: 1, tension: 120, friction: 7, useNativeDriver: true }).start()}
          accessibilityLabel="Exit Support Mode"
          accessibilityRole="button"
        >
          <Animated.View style={[styles.exitButton, { transform: [{ scale: exitScale }] }]}>
            <X size={13} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.exitText}>Exit</Text>
          </Animated.View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F59E0B',
    zIndex: 999,
  },
  container: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#78350F',
    textTransform: 'uppercase',
  },
  hallNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
    marginTop: 1,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    minHeight: 32,
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

