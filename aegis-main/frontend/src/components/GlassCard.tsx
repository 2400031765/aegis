import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  variant?: 'card' | 'button';
  borderRadius?: number;
  borderColor?: string;
}

export const GlassCard = ({
  children,
  style,
  intensity = 30,
  variant = 'card',
  borderRadius,
  borderColor,
}: Props) => {
  const base = variant === 'card' ? glass.card : glass.button;
  const radius = borderRadius ?? base.borderRadius;
  return (
    <View
      style={[
        styles.outer,
        {
          borderRadius: radius,
          borderColor: borderColor ?? base.borderColor,
          borderWidth: base.borderWidth,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: base.backgroundColor, borderRadius: radius },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
