import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';
import { RollingNumberTicker } from '../dashboard/RollingNumberTicker';

interface TeamLimitCounterProps {
  activeCount: number;
  maxLimit?: number;
  isDark?: boolean;
}

export const TeamLimitCounter: React.FC<TeamLimitCounterProps> = ({
  activeCount,
  maxLimit = 5,
  isDark = true,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const isFull = activeCount >= maxLimit;
  const percentage = Math.min(100, Math.round((activeCount / maxLimit) * 100));

  // Animated progress bar fill width
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Looping warning pulse when quota is full
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width interpolation
    }).start();
  }, [percentage, progressAnim]);

  useEffect(() => {
    let loopAnimation: Animated.CompositeAnimation | null = null;
    if (isFull) {
      loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      loopAnimation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (loopAnimation) loopAnimation.stop();
    };
  }, [isFull, pulseAnim]);

  const statusColor = isFull
    ? isDark
      ? colors.status.warning.dark
      : colors.status.warning.light
    : isDark
    ? colors.gold[400]
    : colors.gold[600];

  const statusBg = isFull
    ? isDark
      ? colors.status.warning.bgDark
      : colors.status.warning.bgLight
    : isDark
    ? colors.dark.accentBg
    : colors.light.accentBg;

  const widthStyle = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.card, glassStyles.getCardStyle(isDark)]}>
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <Animated.View
            style={[
              styles.iconBox,
              { backgroundColor: statusBg },
              isFull && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Users size={16} color={statusColor} />
          </Animated.View>
          <View>
            <Text style={[styles.title, { color: t.text }]}>Active Team Seats</Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              Database enforced limit
            </Text>
          </View>
        </View>

        <View style={[styles.counterBadge, { backgroundColor: statusBg }]}>
          <View style={styles.counterRow}>
            <RollingNumberTicker
              targetValue={activeCount}
              duration={480}
              style={[styles.counterText, { color: statusColor }]}
            />
            <Text style={[styles.counterText, { color: statusColor }]}>
              {' '}/ {maxLimit}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(28, 25, 23, 0.08)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthStyle,
              backgroundColor: isFull
                ? isDark
                  ? colors.status.warning.dark
                  : colors.status.warning.light
                : isDark
                ? colors.gold[400]
                : colors.gold[500],
            },
          ]}
        />
      </View>

      {/* Status Notice */}
      <View style={styles.noticeRow}>
        {isFull ? (
          <>
            <AlertTriangle size={14} color={statusColor} style={styles.noticeIcon} />
            <Text style={[styles.noticeText, { color: statusColor }]}>
              Team limit reached. Deactivate an existing member to add new staff.
            </Text>
          </>
        ) : (
          <>
            <CheckCircle2
              size={14}
              color={isDark ? colors.status.success.dark : colors.status.success.light}
              style={styles.noticeIcon}
            />
            <Text
              style={[
                styles.noticeText,
                {
                  color: isDark
                    ? colors.status.success.dark
                    : colors.status.success.light,
                },
              ]}
            >
              {maxLimit - activeCount} seat{maxLimit - activeCount === 1 ? '' : 's'} available
              for new staff accounts.
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});

