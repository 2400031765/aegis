import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';

interface Props {
  children: string;
  fontSize?: number;
  letterSpacing?: number;
  fontFamily?: string;
}

/**
 * Premium AEGIS wordmark — layered text with magenta glow + soft purple shadow
 * to evoke a gradient sheen without depending on MaskedView.
 */
export const GradientText = ({
  children,
  fontSize = 72,
  letterSpacing = -2,
  fontFamily = 'Outfit_800ExtraBold',
}: Props) => {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.shadow, { fontSize, letterSpacing, fontFamily }]}>{children}</Text>
      <Text style={[styles.fg, { fontSize, letterSpacing, fontFamily }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    color: '#FF2079',
    opacity: 0.45,
    textShadowColor: '#7000FF',
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
    transform: [{ translateX: 1 }, { translateY: 2 }],
  },
  fg: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(184,0,230,0.85)',
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
});
