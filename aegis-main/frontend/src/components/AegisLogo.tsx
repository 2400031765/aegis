import React from 'react';
import { Image, StyleSheet, ViewStyle, StyleProp, View } from 'react-native';

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Show the small AEGIS wordmark logo instead of just the icon */
  variant?: 'icon' | 'wordmark';
}

/**
 * AEGIS branded logo. Uses the transparent icon (shield + woman silhouette with
 * neural nodes) so it sits naturally on the dark theme without a white coin.
 */
export const AegisLogo = ({ size = 140, style, variant = 'icon' }: Props) => {
  const source =
    variant === 'wordmark'
      ? require('../../assets/images/aegis-logo-transparent.png')
      : require('../../assets/images/aegis-icon.png');

  // Icon has aspect ratio ~1.36:1 (753x551). Wordmark is square-ish.
  const aspect = variant === 'icon' ? 753 / 551 : 1;
  const width = variant === 'icon' ? size * aspect : size;
  const height = size;

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      <Image source={source} style={{ width, height }} resizeMode="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
