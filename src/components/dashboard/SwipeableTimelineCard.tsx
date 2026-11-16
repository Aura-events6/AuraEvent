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
import { FileText, Check } from 'lucide-react-native';
import { DashboardTimelineRowItem } from '../../types/dashboard';
import { colors } from '../../theme/colors';
import { glassStyles } from '../../theme/glass';

interface SwipeableTimelineCardProps {
  item: DashboardTimelineRowItem;
  isLast: boolean;
  isDark: boolean;
  onAction: (item: DashboardTimelineRowItem) => void;
}

export const SwipeableTimelineCard: React.FC<SwipeableTimelineCardProps> = ({
  item,
  isLast,
  isDark,
  onAction,
}) => {
  const t = isDark ? colors.dark : colors.light;
  const isPayment = item.category === 'payments';

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
                toValue: 1.3,
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
      {/* Left Time Stamp */}
      <View style={styles.timelineLeftTime}>
        <Text style={[styles.timelineTimePrimary, { color: t.text }]}>
          {item.timeLabel.split(' ')[0]}
        </Text>
        <Text style={[styles.timelineTimeSecondary, { color: t.textMuted }]}>
          {item.timeLabel.split(' ').slice(1).join(' ')}
        </Text>
      </View>

      {/* Center Connected Railway Line */}
      <View style={styles.timelineRailContainer}>
        <View
          style={[
            styles.railSpine,
            {
              backgroundColor: isDark ? 'rgba(214,174,107,0.3)' : 'rgba(198,151,73,0.35)',
            },
          ]}
        />
        <View
          style={[
            styles.railNode,
            {
              backgroundColor: isPayment
                ? isDark
                  ? colors.status.success.dark
                  : colors.status.success.light
                : isDark
                ? colors.gold[400]
                : colors.gold[600],
            },
          ]}
        >
          <Check size={10} color="#FFFFFF" strokeWidth={3} />
        </View>
        {!isLast ? (
          <View
            style={[
              styles.railSpine,
              {
                backgroundColor: isDark ? 'rgba(214,174,107,0.3)' : 'rgba(198,151,73,0.35)',
              },
            ]}
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </View>

      {/* Swipeable Container */}
      <View style={styles.swipeContainer}>
        {/* Underlying Action Well */}
        <View style={styles.underlyingActionWell}>
          <Animated.View
            style={[
              styles.actionWellIconCircle,
              {
                backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg,
                borderColor: isThresholdReached
                  ? (isDark ? colors.gold[400] : colors.gold[600])
                  : 'transparent',
                transform: [{ scale: iconScaleAnim }],
              },
            ]}
          >
            <FileText size={18} color={isDark ? colors.gold[400] : colors.gold[600]} />
          </Animated.View>
        </View>

        {/* Foreground Card with gesture responder */}
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
            <Text style={[styles.timelineCardSubtitle, { color: t.textMuted }]}>
              {item.subtitle}
            </Text>
          </View>

          {item.billNumber ? (
            <Pressable
              onPress={() => onAction(item)}
              style={({ pressed }) => [
                styles.billButton,
                {
                  backgroundColor: isDark ? colors.dark.accentBg : colors.light.accentBg,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              <FileText size={12} color={isDark ? colors.gold[400] : colors.gold[600]} />
              <Text
                style={[
                  styles.billButtonText,
                  { color: isDark ? colors.gold[400] : colors.gold[600] },
                ]}
              >
                Bill
              </Text>
            </Pressable>
          ) : item.amount ? (
            <Text
              style={[
                styles.timelineAmountBadge,
                {
                  color: isDark ? colors.status.success.dark : colors.status.success.light,
                },
              ]}
            >
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
    marginBottom: 10,
    minHeight: 58,
  },
  timelineLeftTime: {
    width: 65,
    paddingTop: 8,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  timelineTimePrimary: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineTimeSecondary: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  timelineRailContainer: {
    width: 24,
    alignItems: 'center',
  },
  railSpine: {
    width: 2,
    flex: 1,
  },
  railNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  swipeContainer: {
    flex: 1,
    position: 'relative',
    marginLeft: 6,
  },
  underlyingActionWell: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 16,
  },
  actionWellIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  timelineCardContent: {
    flex: 1,
    marginRight: 8,
  },
  timelineCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineCardSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  billButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  billButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineAmountBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
});

