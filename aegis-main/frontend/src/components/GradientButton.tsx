import React, { useRef } from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { gradients, radii } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  /** override gradient colors */
  colors?: readonly [string, string, ...string[]];
  height?: number;
}

export const GradientButton = ({
  label,
  onPress,
  style,
  testID,
  disabled,
  fullWidth = true,
  colors,
  height = 64,
}: Props) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }], width: fullWidth ? '100%' : undefined }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={styles.pressable}
      >
        <LinearGradient
          colors={colors ?? gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { height, borderRadius: height / 2 }]}
        >
          <View style={styles.glow} />
          <Text variant="bodyLg" weight="bold" style={styles.label}>
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7000FF',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    letterSpacing: 0.5,
    color: '#ffffff',
  },
});
