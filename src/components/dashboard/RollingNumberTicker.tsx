import React, { useState, useEffect, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { formatIndianNumber, motionTokens } from '../../theme/motion';

interface RollingNumberTickerProps {
  targetValue: number;
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  fallbackText?: string;
}

export const RollingNumberTicker: React.FC<RollingNumberTickerProps> = ({
  targetValue,
  isCurrency = false,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 520,
  style,
  fallbackText,
}) => {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const prevValueRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNaN(targetValue) || targetValue === null || targetValue === undefined) {
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = targetValue;
    const diff = endValue - startValue;

    if (diff === 0) {
      setCurrentValue(endValue);
      return;
    }

    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = motionTokens.cubicEaseOut(progress);

      const nextValue = startValue + diff * easedProgress;
      setCurrentValue(nextValue);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration]);

  if (targetValue === undefined || targetValue === null) {
    return <Text style={style}>{fallbackText || '...'}</Text>;
  }

  let formatted = '';
  if (isCurrency) {
    formatted = formatIndianNumber(Math.round(currentValue));
  } else {
    formatted = `${prefix}${currentValue.toFixed(decimals)}${suffix}`;
  }

  return <Text style={style}>{formatted}</Text>;
};

