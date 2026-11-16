import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, LayoutChangeEvent, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonShimmerProps {
  active: boolean;
  borderRadius?: number;
}

export const SkeletonShimmer: React.FC<SkeletonShimmerProps> = ({
  active,
  borderRadius = 16,
}) => {
  const [width, setWidth] = useState(300);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (active) {
      shimmerAnim.setValue(0);
      anim = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: Platform.OS !== 'web',
        })
      );
      anim.start();
    } else {
      shimmerAnim.setValue(0);
    }

    return () => {
      if (anim) anim.stop();
    };
  }, [active, shimmerAnim]);

  if (!active) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width || 300);
  };

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[styles.container, { borderRadius }]}
      onLayout={onLayout}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.shimmerWave,
          {
            width: width * 0.75,
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(229, 184, 66, 0.18)',
            'rgba(255, 215, 0, 0.28)',
            'rgba(229, 184, 66, 0.18)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 10,
  },
  shimmerWave: {
    height: '100%',
  },
});

