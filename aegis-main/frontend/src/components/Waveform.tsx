import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface Props {
  active?: boolean;
  bars?: number;
  color?: string;
  height?: number;
}

/**
 * Animated audio waveform bars — simulates an active recording indicator.
 */
export const Waveform = ({
  active = true,
  bars = 28,
  color = '#FF2079',
  height = 56,
}: Props) => {
  const anims = useRef(Array.from({ length: bars }, () => new Animated.Value(0.2))).current;

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => a.stopAnimation());
      return;
    }
    const animations = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 350 + (i % 5) * 80,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(a, {
            toValue: 0.2 + Math.random() * 0.4,
            duration: 350 + (i % 5) * 80,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [active, anims]);

  return (
    <View style={[styles.row, { height }]}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: a.interpolate({ inputRange: [0, 1], outputRange: [4, height] }),
              opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    width: '100%',
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});
