import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Check, IndianRupee, BookMarked } from 'lucide-react-native';
import { DashboardTimelineRowItem } from '../../types/dashboard';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';

interface SwipeableTimelineCardProps {
  item: DashboardTimelineRowItem;
  isLast: boolean;
  isDark: boolean;
  onAction: (item: DashboardTimelineRowItem) => void;
}

function parseTimelineStamp(item: DashboardTimelineRowItem): {
  primary: string;
  secondary: string;
} {
  if (item.primaryTime) {
    return {
      primary: item.primaryTime,
      secondary: item.secondaryTime || '',
    };
  }
  const raw = (item.timeLabel || '').trim();
  if (!raw) return { primary: 'Today', secondary: '' };
  const parts = raw.split(/\s+/);
  // e.g. "07 Nov Sat" or "17 Nov Concluded" -> primary "07 Nov", secondary "Sat"
  if (parts.length >= 3 && /^\d{1,2}$/.test(parts[0])) {
    return {
      primary: `${parts[0]} ${parts[1]}`,
      secondary: parts.slice(2).join(' '),
    };
  }
  // e.g. "Today 02:30 PM" -> primary "Today", secondary "02:30 PM"
  return {
    primary: parts[0],
    secondary: parts.slice(1).join(' '),
  };
}

export const SwipeableTimelineCard: React.FC<SwipeableTimelineCardProps> = ({
  item,
  isLast,
  isDark,
  onAction,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const isPayment = item.category === 'payments';
  const isDue = Boolean(item.dueAmountText);
  const { primary: primaryTime, secondary: secondaryTime } = parseTimelineStamp(item);

  const spineColor = isDark ? 'rgba(229, 198, 135, 0.32)' : 'rgba(198, 151, 73, 0.35)';
  const tickColor = isPayment
    ? isDark
      ? 'rgba(74, 222, 128, 0.40)'
      : 'rgba(16, 185, 129, 0.40)'
    : isDark
      ? 'rgba(229, 198, 135, 0.40)'
      : 'rgba(198, 151, 73, 0.40)';
  const haloColor = isPayment
    ? isDark
      ? 'rgba(74, 222, 128, 0.16)'
      : 'rgba(16, 185, 129, 0.14)'
    : isDark
      ? 'rgba(229, 198, 135, 0.16)'
      : 'rgba(198, 151, 73, 0.14)';

  const panX = useRef(new Animated.Value(0)).current;
  const [isThresholdReached, setIsThresholdReached] = useState<boolean>(false);
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          const clampedX = Math.max(gestureState.dx, -96);
          panX.setValue(clampedX);

          if (clampedX <= -64) {
            if (!isThresholdReached) {
              setIsThresholdReached(true);
              Animated.spring(iconScaleAnim, {
                toValue: 1.25,
                tension: 70,
                friction: 7,
                useNativeDriver: Platform.OS !== 'web',
              }).start();
            }
          } else {
            if (isThresholdReached) {
              setIsThresholdReached(false);
              Animated.spring(iconScaleAnim, {
                toValue: 1.0,
                tension: 70,
                friction: 7,
                useNativeDriver: Platform.OS !== 'web',
              }).start();
            }
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const triggered = gestureState.dx <= -64;
        Animated.spring(panX, {
          toValue: 0,
          tension: 65,
          friction: 7,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          setIsThresholdReached(false);
          iconScaleAnim.setValue(1);
          if (triggered) {
            onAction(item);
          }
        });
      },
    })
  ).current;

  return (
    <View style={styles.timelineRow}>
      {/* Col 1: Left Timestamp (64px right-aligned) */}
      <View style={styles.timelineLeftTime}>
        <Text
          numberOfLines={1}
          style={[styles.timelineTimePrimary, { color: t.text }]}
        >
          {primaryTime}
        </Text>
        {Boolean(secondaryTime) && (
          <Text
            numberOfLines={1}
            style={[styles.timelineTimeSecondary, { color: t.textMuted }]}
          >
            {secondaryTime}
          </Text>
        )}
      </View>

      {/* Col 2: Center Connected Spine (36px) with Halo Ring & Horizontal Tick */}
      <View style={styles.timelineRailContainer}>
        {/* Top vertical connector stem */}
        <View style={[styles.railTopStem, { backgroundColor: spineColor }]} />

        {/* Horizontal 16px connector tick to the right card */}
        <View
          pointerEvents="none"
          style={[styles.horizontalTick, { backgroundColor: tickColor }]}
        />

        {/* 4px outer halo ring (32x32) wrapping 24x24 gradient node */}
        <View style={[styles.railHaloRing, { backgroundColor: haloColor }]}>
          {isPayment ? (
            <View style={[styles.railNodeCircle, { backgroundColor: '#10B981' }]}>
              <IndianRupee size={11} color="#FFFFFF" strokeWidth={2.8} />
            </View>
          ) : (
            <LinearGradient
              colors={isDark ? colors.goldGradientDark : colors.goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.railNodeCircle}
            >
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </LinearGradient>
          )}
        </View>

        {/* Bottom continuous vertical spine */}
        {!isLast ? (
          <View style={[styles.railBottomSpine, { backgroundColor: spineColor }]} />
        ) : (
          <View style={styles.railEndCapWrap}>
            <View style={[styles.railEndStem, { backgroundColor: spineColor }]} />
            <View style={[styles.railEndDot, { backgroundColor: spineColor }]} />
          </View>
        )}
      </View>

      {/* Col 3: Swipeable Right Card */}
      <View style={[styles.swipeContainer, { paddingBottom: isLast ? 4 : 14 }]}>
        {/* Underlying Action Well */}
        <View style={[styles.underlyingActionWell, { bottom: isLast ? 4 : 14 }]}>
          <Animated.View
            style={[
              styles.actionWellIconCircle,
              {
                backgroundColor: isPayment
                  ? t.emeraldPillBg
                  : isDue
                  ? t.amberPillBg
                  : t.goldPillBg,
                borderColor: isThresholdReached
                  ? isPayment
                    ? t.emeraldText
                    : isDue
                    ? t.amberText
                    : t.goldText
                  : 'transparent',
                transform: [{ scale: iconScaleAnim }],
              },
            ]}
          >
            {isPayment ? (
              <IndianRupee size={18} color={t.emeraldText} />
            ) : isDue ? (
              <BookMarked size={18} color={t.amberText} />
            ) : (
              <FileText size={18} color={t.goldText} />
            )}
          </Animated.View>
        </View>

        {/* Foreground Glass Card */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.timelineCard,
            glassStyles.getCardStyle(isDark),
            { transform: [{ translateX: panX }] },
          ]}
        >
          <View style={styles.timelineCardContent}>
            <Text style={[styles.timelineCardTitle, { color: t.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.timelineCardSubtitle, { color: t.textSecondary }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>

          {item.billNumber ? (
            <Pressable
              onPress={() => onAction(item)}
              style={({ pressed }) => [
                styles.billButton,
                {
                  backgroundColor: t.goldPillBg,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open or share bill for ${item.title}`}
            >
              <FileText size={14} color={t.goldText} strokeWidth={2.2} />
              <Text style={[styles.billButtonText, { color: t.goldText }]}>Bill</Text>
            </Pressable>
          ) : item.dueAmountText ? (
            <Pressable
              onPress={() => onAction(item)}
              style={[styles.duePillBadge, { backgroundColor: t.amberPillBg }]}
            >
              <Text style={[styles.duePillText, { color: t.amberText }]}>
                {item.dueAmountText}
              </Text>
            </Pressable>
          ) : item.amount ? (
            <Text style={[styles.timelineAmountBadge, { color: t.emeraldText }]}>
              {item.amount}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 74,
  },
  timelineLeftTime: {
    width: 64,
    paddingTop: 15,
    paddingRight: 10,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  timelineTimePrimary: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  },
  timelineTimeSecondary: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  timelineRailContainer: {
    width: 36,
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  railTopStem: {
    width: 2,
    height: 16,
  },
  horizontalTick: {
    position: 'absolute',
    top: 27,
    left: 18,
    width: 18,
    height: 2,
    zIndex: 1,
  },
  railHaloRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  railNodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8863B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 3,
  },
  railBottomSpine: {
    width: 2,
    flex: 1,
  },
  railEndCapWrap: {
    flex: 1,
    alignItems: 'center',
  },
  railEndStem: {
    width: 2,
    flex: 1,
    minHeight: 10,
  },
  railEndDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  swipeContainer: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
    position: 'relative',
  },
  underlyingActionWell: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 84,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  actionWellIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  timelineCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timelineCardContent: {
    flex: 1,
    minWidth: 0,
  },
  timelineCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  timelineCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  billButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexShrink: 0,
  },
  billButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  duePillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  duePillText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timelineAmountBadge: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
});
